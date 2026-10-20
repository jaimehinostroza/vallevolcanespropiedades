"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePropertyAction, duplicatePropertyAction } from "@/app/admin/actions";
import { publicPropertyPath } from "@/lib/admin/property-form";
import { OPERATION_LABELS, STATUS_LABELS, TYPE_LABELS, formatPrice } from "@/lib/format";
import type { PriceCurrency, PropertyImage, PropertyOperation, PropertyStatus, PropertyType } from "@/lib/types";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconCopy, IconEdit, IconExternal, IconPlus, IconTrash } from "./icons";
import { useToast } from "./Toast";
import styles from "./PropertyList.module.css";

export interface PropertyListItem {
  id: string;
  slug: string;
  title: string;
  status: PropertyStatus;
  operation: PropertyOperation;
  property_type: PropertyType;
  price: number | null;
  currency: PriceCurrency;
  commune: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  cover: PropertyImage | null;
  photoCount: number;
}

type Filter = "todas" | PropertyStatus;

const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" });

export function PropertyList({ items }: { items: PropertyListItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("todas");
  const [toDelete, setToDelete] = useState<PropertyListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts: Record<Filter, number> = {
    todas: items.length,
    borrador: 0,
    publicada: 0,
    reservada: 0,
    vendida: 0,
  };
  for (const p of items) counts[p.status]++;
  const visible = filter === "todas" ? items : items.filter((p) => p.status === filter);

  const duplicate = (p: PropertyListItem) => {
    setBusyId(p.id);
    startTransition(async () => {
      const res = await duplicatePropertyAction(p.id);
      setBusyId(null);
      if (res.ok) {
        toast.ok("Copia creada como borrador, sin fotos");
        router.push(`/admin/propiedades/${res.id}`);
      } else toast.error(res.error);
    });
  };

  const confirmDelete = () => {
    const p = toDelete;
    if (!p) return;
    startTransition(async () => {
      const res = await deletePropertyAction(p.id);
      setToDelete(null);
      if (res.ok) toast.ok("Propiedad eliminada");
      else toast.error(res.error);
    });
  };

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>Aún no hay propiedades</h2>
        <p>Crea la primera: escribes los datos, subes las fotos y la publicas cuando quieras.</p>
        <Link href="/admin/propiedades/nueva" className="btn btn--forest">
          <IconPlus width={18} height={18} /> Crear mi primera propiedad
        </Link>
      </div>
    );
  }

  const filters: Filter[] = ["todas", "publicada", "borrador", "reservada", "vendida"];

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filtrar por estado">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={styles.filter}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            disabled={f !== "todas" && counts[f] === 0 && filter !== f}
          >
            {f === "todas" ? "Todas" : STATUS_LABELS[f]}
            <span className={styles.count}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.none}>No hay propiedades con ese estado.</p>
      ) : (
        <ul className={styles.list}>
          <li className={styles.headRow} aria-hidden="true">
            <span />
            <span>Propiedad</span>
            <span>Estado</span>
            <span>Precio</span>
            <span>Creada</span>
            <span />
          </li>
          {visible.map((p, i) => (
            <li
              key={p.id}
              className={styles.row}
              data-busy={busyId === p.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <Link href={`/admin/propiedades/${p.id}`} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                <PropertyPhoto image={p.cover} sizes="thumb" aspectRatio="4 / 3" alt="" />
              </Link>
              <div className={styles.main}>
                <Link href={`/admin/propiedades/${p.id}`} className={styles.title}>
                  {p.title}
                </Link>
                <p className={styles.meta}>
                  {TYPE_LABELS[p.property_type]} · {OPERATION_LABELS[p.operation]} · {p.commune}
                  {" · "}
                  {p.photoCount === 0 ? "sin fotos" : p.photoCount === 1 ? "1 foto" : `${p.photoCount} fotos`}
                </p>
              </div>
              <div className={styles.status}>
                <span className={styles.badge} data-status={p.status}>
                  {STATUS_LABELS[p.status]}
                </span>
                {p.featured && <span className={styles.star}>Destacada</span>}
              </div>
              <p className={styles.price}>{formatPrice(p.price, p.currency)}</p>
              <p className={styles.date}>
                <span className={styles.dateLabel}>Creada </span>
                {dateFmt.format(new Date(p.created_at))}
              </p>
              <div className={styles.actions}>
                <Link href={`/admin/propiedades/${p.id}`} className={styles.act} title="Editar">
                  <IconEdit width={18} height={18} />
                  <span>Editar</span>
                </Link>
                {p.status !== "borrador" ? (
                  <a href={publicPropertyPath(p.slug)} target="_blank" rel="noopener" className={styles.act} title="Ver en el sitio">
                    <IconExternal width={18} height={18} />
                    <span>Ver</span>
                  </a>
                ) : (
                  <span className={styles.actSpacer} aria-hidden="true" />
                )}
                <button type="button" className={styles.act} title="Duplicar" onClick={() => duplicate(p)} disabled={pending}>
                  <IconCopy width={18} height={18} />
                  <span>Duplicar</span>
                </button>
                <button
                  type="button"
                  className={`${styles.act} ${styles.actDanger}`}
                  title="Eliminar"
                  onClick={() => setToDelete(p)}
                  disabled={pending}
                >
                  <IconTrash width={18} height={18} />
                  <span>Eliminar</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar esta propiedad?"
        confirmLabel="Sí, eliminar"
        danger
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          <strong>{toDelete?.title}</strong> y todas sus fotos se borrarán para siempre. Si solo quieres que deje de
          verse en el sitio, mejor déjala como borrador.
        </p>
      </ConfirmDialog>
    </>
  );
}
