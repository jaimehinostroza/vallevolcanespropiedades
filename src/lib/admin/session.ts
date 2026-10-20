import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, getAdminUser } from "@/lib/supabase/server";

export type AdminStatus =
  | { state: "anon" }
  | { state: "denied"; email: string }
  | { state: "admin"; email: string };

/** Estado de la sesión, calculado una sola vez por render. Lee cookies: úsalo detrás de <Suspense>. */
export const getAdminStatus = cache(async (): Promise<AdminStatus> => {
  const admin = await getAdminUser();
  if (admin) return { state: "admin", email: admin.email ?? "" };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "anon" };
  return { state: "denied", email: user.email ?? "" };
});

/** Defensa en profundidad dentro de cada página del panel (el layout no basta en navegaciones parciales). */
export async function requireAdmin() {
  const status = await getAdminStatus();
  if (status.state === "anon") redirect("/admin/login");
  if (status.state === "denied") notFound();
  return status;
}
