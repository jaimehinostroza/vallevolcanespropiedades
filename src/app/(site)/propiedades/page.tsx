import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCommunes, getProperties, getSettings } from "@/lib/data";
import { OPERATION_LABELS, TYPE_LABELS, whatsappLink } from "@/lib/format";
import type { PropertyFilters, PropertyOperation, PropertyType } from "@/lib/types";
import { PropertyCard } from "@/components/site/PropertyCard";
import { WhatsAppIcon } from "@/components/site/icons";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Propiedades en venta y arriendo en Puerto Varas y alrededores",
  description:
    "Casas, parcelas, terrenos y departamentos en Puerto Varas, Llanquihue, Frutillar y alrededores. Filtra por operación, tipo, comuna y dormitorios.",
  alternates: { canonical: "/propiedades" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

function parseFilters(raw: Record<string, string | string[] | undefined>) {
  const operation = first(raw.operacion);
  const type = first(raw.tipo);
  const commune = first(raw.comuna);
  const beds = Number.parseInt(first(raw.dormitorios) ?? "", 10);
  const filters: PropertyFilters = {};
  if (operation && operation in OPERATION_LABELS) filters.operation = operation as PropertyOperation;
  if (type && type in TYPE_LABELS) filters.type = type as PropertyType;
  if (commune && commune.length <= 80) filters.commune = commune;
  if (Number.isFinite(beds) && beds >= 1 && beds <= 6) filters.minBedrooms = beds;
  return filters;
}

export default function CatalogPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <header className={styles.intro}>
        <div className="container">
          <p className="eyebrow">Catálogo</p>
          <h1 className={styles.h1}>Propiedades</h1>
          <p className={styles.lead}>
            Una selección de casas, parcelas y terrenos entre lagos y volcanes. Filtra según lo que buscas.
          </p>
        </div>
      </header>

      <section aria-label="Resultados" className={`container ${styles.results}`}>
        <Suspense fallback={<Skeleton />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function Catalog({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters(await searchParams);
  const [items, communes, settings] = await Promise.all([getProperties(filters), getCommunes(), getSettings()]);
  const active = Object.keys(filters).length > 0;
  const wa = whatsappLink(settings.whatsapp, "Hola, estoy buscando una propiedad y quisiera conversar.");

  const select = (name: string, label: string, value: string | undefined, options: [string, string][]) => (
    <div className={styles.field}>
      <label htmlFor={`f-${name}`}>{label}</label>
      <div className={styles.selectWrap}>
        <select id={`f-${name}`} name={name} defaultValue={value ?? ""}>
          <option value="">Todas</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <>
      <form method="get" action="/propiedades" className={styles.filters} aria-label="Filtros">
        {select("operacion", "Operación", filters.operation, Object.entries(OPERATION_LABELS))}
        {select("tipo", "Tipo", filters.type, Object.entries(TYPE_LABELS))}
        {select(
          "comuna",
          "Comuna",
          filters.commune,
          communes.map((c) => [c, c]),
        )}
        {select(
          "dormitorios",
          "Dormitorios",
          filters.minBedrooms ? String(filters.minBedrooms) : undefined,
          [1, 2, 3, 4, 5].map((n) => [String(n), `${n} o más`]),
        )}
        <div className={styles.actions}>
          <button type="submit" className="btn btn--forest">
            Filtrar
          </button>
          {active && (
            <Link href="/propiedades" className={styles.clear}>
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <p className={styles.count} role="status">
        {items.length === 0
          ? "Sin resultados"
          : items.length === 1
            ? "1 propiedad"
            : `${items.length} propiedades`}
        {active && items.length > 0 ? " con estos filtros" : ""}
      </p>

      {items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} priority={i < 2} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <svg viewBox="0 0 160 80" width="160" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 66h152" />
            <path d="M18 66 52 28l18 20 14-14 34 32" />
            <path d="M104 66 124 42l22 24" />
            <circle cx="122" cy="16" r="6" />
          </svg>
          <h2 className={styles.emptyTitle}>
            {active ? "No encontramos propiedades con esos filtros" : "Estamos preparando nuestra selección"}
          </h2>
          <p>
            {active
              ? "Prueba quitando alguno de los filtros. También puedes contarnos qué buscas y te avisamos cuando tengamos algo así."
              : "Aún no hay propiedades publicadas. Escríbenos y te contamos qué tenemos disponible."}
          </p>
          <div className={styles.emptyActions}>
            {active && (
              <Link href="/propiedades" className="btn btn--ghost">
                Ver todas las propiedades
              </Link>
            )}
            {wa && (
              <a href={wa} className="btn btn--forest" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon width={18} height={18} /> Escribirnos por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando propiedades">
      <div className={styles.skelFilters} />
      <div className={styles.grid}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skelCard} />
        ))}
      </div>
    </div>
  );
}
