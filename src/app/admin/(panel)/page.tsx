import { Suspense } from "react";
import Link from "next/link";
import { PropertyList, type PropertyListItem } from "@/components/admin/PropertyList";
import { IconPlus } from "@/components/admin/icons";
import { requireAdmin } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PropertyImage } from "@/lib/types";
import styles from "../admin.module.css";

export default function PropertiesPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Propiedades</h1>
          <p className={styles.pageSub}>Aquí publicas y editas lo que se muestra en tu sitio.</p>
        </div>
        <Link href="/admin/propiedades/nueva" className="btn btn--forest">
          <IconPlus width={18} height={18} /> Nueva propiedad
        </Link>
      </div>
      <Suspense
        fallback={
          <div className={styles.skeleton} aria-busy="true">
            <div className={styles.skeletonBar} style={{ height: 88 }} />
            <div className={styles.skeletonBar} style={{ height: 88 }} />
            <div className={styles.skeletonBar} style={{ height: 88 }} />
          </div>
        }
      >
        <PropertiesData />
      </Suspense>
    </>
  );
}

async function PropertiesData() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, slug, title, status, operation, property_type, price, currency, commune, featured, created_at, updated_at, images:property_images(id, property_id, storage_prefix, ext, width, height, placeholder, alt, position, bytes_total, created_at)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] lista de propiedades", error);
    return <p role="alert">No pudimos cargar las propiedades. Recarga la página para intentarlo de nuevo.</p>;
  }

  const items: PropertyListItem[] = (data ?? []).map((p) => {
    const images = ((p.images ?? []) as PropertyImage[]).slice().sort((a, b) => a.position - b.position);
    const { images: _images, ...rest } = p as typeof p & { images: unknown };
    void _images;
    return { ...(rest as Omit<PropertyListItem, "cover" | "photoCount">), cover: images[0] ?? null, photoCount: images.length };
  });

  return <PropertyList items={items} />;
}
