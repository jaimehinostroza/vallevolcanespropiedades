import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente con la sesión de la usuaria (cookies). Para Server Components y Server Actions del panel.
 * Lee cookies(): úsalo detrás de <Suspense> o en rutas dinámicas.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el proxy se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}

/** Devuelve el usuario si es administrador; null en otro caso. */
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  // La tabla admins solo es legible por administradores (RLS), así que una fila = es admin.
  const { data } = await supabase.from("admins").select("email").eq("email", user.email.toLowerCase()).maybeSingle();
  return data ? user : null;
}
