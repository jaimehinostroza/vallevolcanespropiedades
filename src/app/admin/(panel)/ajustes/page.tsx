import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Ajustes del sitio" };

export default function SettingsPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Ajustes del sitio</h1>
          <p className={styles.pageSub}>Estos datos aparecen en el sitio: portada, contacto y pie de página.</p>
        </div>
      </div>
      <Suspense fallback={<div className={styles.skeletonBar} style={{ height: 320 }} aria-busy="true" />}>
        <SettingsData />
      </Suspense>
    </>
  );
}

async function SettingsData() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  if (error || !data) {
    console.error("[admin] ajustes", error);
    return <p role="alert">No pudimos cargar los ajustes. Recarga la página para intentarlo de nuevo.</p>;
  }
  return <SettingsForm settings={data as SiteSettings} />;
}
