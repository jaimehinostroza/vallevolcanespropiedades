import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { IconChevronLeft, IconExternal } from "@/components/admin/icons";
import { publicPropertyPath } from "@/lib/admin/property-form";
import { requireAdmin } from "@/lib/admin/session";
import { STATUS_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Property, PropertyImage } from "@/lib/types";
import styles from "../../../admin.module.css";

export const metadata: Metadata = { title: "Editar propiedad" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className={styles.skeleton} aria-busy="true">
          <div className={styles.skeletonBar} style={{ width: "40%", height: 36 }} />
          <div className={styles.skeletonBar} style={{ height: 220 }} />
          <div className={styles.skeletonBar} style={{ height: 320 }} />
        </div>
      }
    >
      <EditContent params={params} />
    </Suspense>
  );
}

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: property }, { data: images }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("property_images").select("*").eq("property_id", id).order("position", { ascending: true }),
  ]);
  if (!property) notFound();
  const p = property as Property;

  return (
    <>
      <Link href="/admin" className={styles.back}>
        <IconChevronLeft width={18} height={18} /> Propiedades
      </Link>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{p.title}</h1>
          <p className={styles.pageSub}>
            {STATUS_LABELS[p.status]}
            {p.status === "borrador" ? " · todavía no se ve en el sitio" : " · visible en el sitio"}
          </p>
        </div>
        {p.status !== "borrador" && (
          <a href={publicPropertyPath(p.slug)} target="_blank" rel="noopener" className="btn btn--ghost">
            Ver en el sitio <IconExternal width={16} height={16} />
          </a>
        )}
      </div>
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <PhotoManager propertyId={p.id} slug={p.slug} initialImages={(images ?? []) as PropertyImage[]} />
        <PropertyForm property={p} />
      </div>
    </>
  );
}
