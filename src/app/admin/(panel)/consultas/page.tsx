import type { Metadata } from "next";
import { Suspense } from "react";
import { InquiryList, type InquiryItem } from "@/components/admin/InquiryList";
import { requireAdmin } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Consultas" };

export default function InquiriesPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Consultas</h1>
          <p className={styles.pageSub}>Mensajes que dejan las personas desde tu sitio.</p>
        </div>
      </div>
      <Suspense fallback={<div className={styles.skeletonBar} style={{ height: 160 }} aria-busy="true" />}>
        <InquiriesData />
      </Suspense>
    </>
  );
}

async function InquiriesData() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, name, email, phone, message, read, created_at, property:properties(id, title, slug)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("[admin] consultas", error);
    return <p role="alert">No pudimos cargar las consultas. Recarga la página para intentarlo de nuevo.</p>;
  }
  const items = (data ?? []).map((r) => {
    const prop = Array.isArray(r.property) ? r.property[0] : r.property;
    return { ...r, property: prop ?? null } as InquiryItem;
  });
  return <InquiryList items={items} />;
}
