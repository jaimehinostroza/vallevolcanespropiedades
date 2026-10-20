import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { IconChevronLeft } from "@/components/admin/icons";
import { requireAdmin } from "@/lib/admin/session";
import styles from "../../../admin.module.css";

export const metadata: Metadata = { title: "Nueva propiedad" };

export default function NewPropertyPage() {
  return (
    <>
      <Link href="/admin" className={styles.back}>
        <IconChevronLeft width={18} height={18} /> Propiedades
      </Link>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Nueva propiedad</h1>
          <p className={styles.pageSub}>Primero los datos. Las fotos las subes en el paso siguiente.</p>
        </div>
      </div>
      <Suspense fallback={<div className={styles.skeletonBar} style={{ height: 240 }} aria-busy="true" />}>
        <NewForm />
      </Suspense>
    </>
  );
}

async function NewForm() {
  await requireAdmin();
  return <PropertyForm property={null} />;
}
