import Link from "next/link";
import type { CSSProperties } from "react";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { formatArea, formatPrice, STATUS_LABELS, TYPE_LABELS } from "@/lib/format";
import type { PropertyWithImages } from "@/lib/types";
import { BathIcon, BedIcon, HomeAreaIcon, LandIcon } from "./icons";
import styles from "./PropertyCard.module.css";

interface Props {
  property: PropertyWithImages;
  /** Posición en la lista: define el retraso de la entrada escalonada */
  index?: number;
  priority?: boolean;
}

export function PropertyCard({ property: p, index = 0, priority = false }: Props) {
  const cover = p.images[0];
  const closed = p.status === "reservada" || p.status === "vendida";
  const price = formatPrice(p.price, p.currency);
  const showMonthly = p.operation === "arriendo" && p.price != null;

  const facts: { key: string; label: string; value: string; icon: React.ReactNode }[] = [];
  if (p.bedrooms != null)
    facts.push({ key: "bed", label: "Dormitorios", value: String(p.bedrooms), icon: <BedIcon width={18} height={18} /> });
  if (p.bathrooms != null)
    facts.push({ key: "bath", label: "Baños", value: String(p.bathrooms), icon: <BathIcon width={18} height={18} /> });
  if (p.built_m2 != null)
    facts.push({
      key: "built",
      label: "Superficie construida",
      value: formatArea(p.built_m2) ?? "",
      icon: <HomeAreaIcon width={18} height={18} />,
    });
  if (p.land_m2 != null)
    facts.push({
      key: "land",
      label: "Terreno",
      value: formatArea(p.land_m2) ?? "",
      icon: <LandIcon width={18} height={18} />,
    });

  return (
    <article className={styles.card} style={{ "--i": Math.min(index, 8) } as CSSProperties} data-closed={closed}>
      <div className={styles.media}>
        <PropertyPhoto
          image={cover}
          sizes="card"
          priority={priority}
          aspectRatio="4 / 3"
          alt={cover?.alt ?? (cover ? p.title : `${p.title} (sin fotografía)`)}
          className={styles.photo}
        />
        {closed && <span className={styles.badge}>{STATUS_LABELS[p.status]}</span>}
      </div>
      <div className={styles.body}>
        <p className={styles.kicker}>
          {TYPE_LABELS[p.property_type]} · {p.commune}
        </p>
        <h3 className={styles.title}>
          <Link href={`/propiedades/${p.slug}`} className={styles.link}>
            {p.title}
          </Link>
        </h3>
        <p className={`${styles.price} tabular`}>
          {price}
          {showMonthly && <span className={styles.per}> / mes</span>}
        </p>
        {facts.length > 0 && (
          <ul className={styles.facts}>
            {facts.map((f) => (
              <li key={f.key}>
                {f.icon}
                <span className="visually-hidden">{f.label}: </span>
                <span className="tabular">{f.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
