"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/data";
import { IMAGE_BUCKET, IMAGE_VARIANTS } from "@/lib/images";
import { createSupabaseServerClient, getAdminUser } from "@/lib/supabase/server";
import { parseProperty, parseSettings, pickFreeSlug, type FormState } from "@/lib/admin/property-form";

const NO_SESSION = "Tu sesión expiró. Vuelve a entrar para continuar.";
const GENERIC = "No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.";

type Result = { ok: true } | { ok: false; error: string };

async function slugsStartingWith(base: string, excludeId?: string) {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("properties").select("slug").like("slug", `${base}%`);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return new Set((data ?? []).map((r) => r.slug as string));
}

function invalidate(...slugs: (string | null | undefined)[]) {
  updateTag(TAGS.properties);
  for (const s of new Set(slugs)) if (s) updateTag(TAGS.property(s));
  revalidatePath("/admin", "layout");
}

// ───────────────────────── Propiedades ─────────────────────────

/** Crea (propertyId = null) o actualiza una propiedad. Al crear, redirige a la edición. */
export async function savePropertyAction(
  propertyId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getAdminUser();
  if (!user) return { ok: false, errors: { form: NO_SESSION } };

  const { row, slugBase, errors, values } = parseProperty(formData);
  if (Object.keys(errors).length) {
    return { ok: false, errors, values, message: "Revisa los campos marcados en rojo." };
  }

  const supabase = await createSupabaseServerClient();
  const taken = await slugsStartingWith(slugBase, propertyId ?? undefined);
  const slug = pickFreeSlug(slugBase, taken);
  const slugChanged = slug !== slugBase;

  if (!propertyId) {
    const { data, error } = await supabase.from("properties").insert({ ...row, slug }).select("id, slug").single();
    if (error || !data) {
      console.error("[admin] crear propiedad", error);
      const dup = error?.code === "23505";
      return {
        ok: false,
        values,
        errors: dup ? { slug: "Esa dirección web ya está en uso. Prueba con otra." } : { form: GENERIC },
      };
    }
    invalidate(data.slug);
    redirect(`/admin/propiedades/${data.id}?nueva=1`);
  }

  const { data: before } = await supabase.from("properties").select("slug").eq("id", propertyId).maybeSingle();
  const { error } = await supabase.from("properties").update({ ...row, slug }).eq("id", propertyId);
  if (error) {
    console.error("[admin] actualizar propiedad", error);
    const dup = error.code === "23505";
    return {
      ok: false,
      values,
      errors: dup ? { slug: "Esa dirección web ya está en uso. Prueba con otra." } : { form: GENERIC },
    };
  }
  invalidate(before?.slug, slug);

  const published = row.status !== "borrador";
  return {
    ok: true,
    values: { ...values, slug, status: row.status },
    errors: {},
    savedAt: Date.now(),
    message: slugChanged
      ? `Guardado. La dirección web ya existía, quedó como "${slug}".`
      : published
        ? "Guardado. Los cambios ya están en el sitio."
        : "Guardado como borrador. Aún no se ve en el sitio.",
  };
}

export async function duplicatePropertyAction(id: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  const supabase = await createSupabaseServerClient();
  const { data: p } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!p) return { ok: false, error: "No encontramos esa propiedad." };

  const title = `${p.title} (copia)`.slice(0, 140);
  const base = p.slug.replace(/-\d+$/, "") + "-copia";
  const slug = pickFreeSlug(base, await slugsStartingWith(base));
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    published_at: _p,
    ...rest
  } = p as Record<string, unknown>;
  void _id; void _c; void _u; void _p;
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...rest, title, slug, status: "borrador", featured: false })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[admin] duplicar propiedad", error);
    return { ok: false, error: "No pudimos duplicar la propiedad." };
  }
  invalidate(slug);
  return { ok: true, id: data.id };
}

export async function deletePropertyAction(id: string): Promise<Result> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  const supabase = await createSupabaseServerClient();

  const { data: p } = await supabase.from("properties").select("slug").eq("id", id).maybeSingle();
  const { data: imgs } = await supabase.from("property_images").select("storage_prefix, ext").eq("property_id", id);
  if (imgs?.length) {
    const paths = imgs.flatMap((i) => IMAGE_VARIANTS.map((v) => `${i.storage_prefix}/${v.name}.${i.ext}`));
    const { error: rmError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
    if (rmError) console.error("[admin] borrar archivos de fotos", rmError);
  }
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) {
    console.error("[admin] eliminar propiedad", error);
    return { ok: false, error: "No pudimos eliminar la propiedad." };
  }
  invalidate(p?.slug);
  return { ok: true };
}

// ───────────────────────── Fotos ─────────────────────────

/** Se llama al terminar cada lote de cambios de fotos para que el sitio público se actualice. */
export async function revalidatePropertyAction(slug: string): Promise<Result> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  updateTag(TAGS.properties);
  updateTag(TAGS.property(slug));
  return { ok: true };
}

export async function reorderImagesAction(propertyId: string, slug: string, orderedIds: string[]): Promise<Result> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("property_images").update({ position }).eq("id", id).eq("property_id", propertyId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[admin] ordenar fotos", failed.error);
    return { ok: false, error: "No pudimos guardar el orden de las fotos." };
  }
  updateTag(TAGS.properties);
  updateTag(TAGS.property(slug));
  return { ok: true };
}

export async function updateImageAltAction(imageId: string, slug: string, alt: string): Promise<Result> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("property_images")
    .update({ alt: alt.trim().slice(0, 200) || null })
    .eq("id", imageId);
  if (error) {
    console.error("[admin] texto de foto", error);
    return { ok: false, error: "No pudimos guardar la descripción de la foto." };
  }
  updateTag(TAGS.properties);
  updateTag(TAGS.property(slug));
  return { ok: true };
}

// ───────────────────────── Consultas ─────────────────────────

export async function setInquiryReadAction(id: string, read: boolean): Promise<Result> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("inquiries").update({ read }).eq("id", id);
  if (error) {
    console.error("[admin] marcar consulta", error);
    return { ok: false, error: "No pudimos actualizar la consulta." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteInquiryAction(id: string): Promise<Result> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: NO_SESSION };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) {
    console.error("[admin] eliminar consulta", error);
    return { ok: false, error: "No pudimos eliminar la consulta." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ───────────────────────── Ajustes ─────────────────────────

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getAdminUser();
  if (!user) return { ok: false, errors: { form: NO_SESSION } };

  const { row, errors, values } = parseSettings(formData);
  if (Object.keys(errors).length) return { ok: false, errors, values, message: "Revisa los campos marcados en rojo." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_settings").update(row).eq("id", 1);
  if (error) {
    console.error("[admin] ajustes", error);
    return { ok: false, errors: { form: GENERIC }, values };
  }
  updateTag(TAGS.settings);
  revalidatePath("/admin", "layout");
  return { ok: true, errors: {}, values, savedAt: Date.now(), message: "Guardado. El sitio ya muestra estos datos." };
}

// ───────────────────────── Sesión ─────────────────────────

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
