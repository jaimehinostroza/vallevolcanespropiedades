import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProperties, getPropertyBySlug, getPublishedSlugs, getSettings } from "@/lib/data";
import {
  OPERATION_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  formatArea,
  formatPrice,
  whatsappLink,
} from "@/lib/format";
import { imageUrl, variantWidth } from "@/lib/images";
import type { PropertyWithImages } from "@/lib/types";
import { ContactCard } from "@/components/site/ContactCard";
import { Gallery } from "@/components/site/Gallery";
import { InquiryForm } from "@/components/site/InquiryForm";
import { JsonLd } from "@/components/site/JsonLd";
import { PropertyCard } from "@/components/site/PropertyCard";
import { SITE_URL, telHref, toParagraphs } from "@/components/site/config";
import {
  BathIcon,
  BedIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  HomeAreaIcon,
  LandIcon,
  PinIcon,
} from "@/components/site/icons";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  // Con Cache Components, generateStaticParams no puede devolver una lista vacía.
  // El marcador no existe en la base: la página responde 404 (notFound) si alguien lo visita.
  return (slugs.length ? slugs : ["__sin-propiedades__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPropertyBySlug(slug);
  if (!p) return { title: "Propiedad no encontrada", robots: { index: false } };

  const description =
    p.summary ?? `${TYPE_LABELS[p.property_type]} en ${OPERATION_LABELS[p.operation].toLowerCase()} en ${p.commune}.`;
  const cover = p.images[0];
  // Variante "md" (1280 px, ≤ 260 KB): WhatsApp descarta las vistas previas con imágenes muy pesadas.
  const og = cover
    ? [
        {
          url: imageUrl(cover, "md"),
          width: variantWidth(cover, "md"),
          height: Math.round((variantWidth(cover, "md") * cover.height) / cover.width),
          alt: cover.alt ?? p.title,
        },
      ]
    : undefined;

  return {
    title: p.title,
    description,
    alternates: { canonical: `/propiedades/${p.slug}` },
    openGraph: { type: "website", title: p.title, description, url: `/propiedades/${p.slug}`, images: og },
    twitter: { card: "summary_large_image", title: p.title, description, images: og?.map((i) => i.url) },
  };
}

function similarTo(p: PropertyWithImages, all: PropertyWithImages[]) {
  return all
    .filter((o) => o.id !== p.id)
    .map((o) => ({
      o,
      score: (o.commune === p.commune ? 2 : 0) + (o.property_type === p.property_type ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.o);
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const p = await getPropertyBySlug(slug);
  if (!p) notFound();

  const [settings, all] = await Promise.all([getSettings(), getProperties({ includeClosed: false })]);
  const similar = similarTo(p, all);

  const url = `${SITE_URL}/propiedades/${p.slug}`;
  const wa = whatsappLink(settings.whatsapp, `Hola, me interesa la propiedad «${p.title}» (${url})`);
  const tel = telHref(settings.phone);
  const price = formatPrice(p.price, p.currency);
  const priceText = p.operation === "arriendo" && p.price != null ? `${price} / mes` : price;
  const closed = p.status === "reservada" || p.status === "vendida";

  const specs = [
    { key: "bed", label: "Dormitorios", value: p.bedrooms, icon: <BedIcon /> },
    { key: "bath", label: "Baños", value: p.bathrooms, icon: <BathIcon /> },
    { key: "park", label: "Estacionamientos", value: p.parking, icon: <CarIcon /> },
    { key: "built", label: "Superficie construida", value: formatArea(p.built_m2), icon: <HomeAreaIcon /> },
    { key: "land", label: "Terreno", value: formatArea(p.land_m2), icon: <LandIcon /> },
    { key: "year", label: "Año de construcción", value: p.year_built, icon: <CalendarIcon /> },
  ].filter((s) => s.value != null && s.value !== "");

  const description = toParagraphs(p.description);
  const place = [p.sector, p.commune].filter(Boolean).join(", ");
  const mapsHref =
    p.latitude != null && p.longitude != null ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : null;

  // Datos estructurados. El precio solo se declara en CLP/USD; en UF no se inventa una conversión.
  const listing: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    url,
    description: p.summary ?? p.description?.slice(0, 300) ?? undefined,
    image: p.images.slice(0, 6).map((i) => imageUrl(i, "lg")),
    datePosted: p.published_at ?? undefined,
    about: {
      "@type": "Place",
      name: p.title,
      address: { "@type": "PostalAddress", addressLocality: p.commune, addressCountry: "CL" },
      ...(p.latitude != null && p.longitude != null
        ? { geo: { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude } }
        : {}),
      ...(p.built_m2 != null
        ? { floorSize: { "@type": "QuantitativeValue", value: p.built_m2, unitCode: "MTK" } }
        : {}),
    },
  };
  if (p.price != null && (p.currency === "CLP" || p.currency === "USD")) {
    listing.offers = {
      "@type": "Offer",
      price: p.price,
      priceCurrency: p.currency,
      availability: p.status === "vendida" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url,
    };
  }

  return (
    <article className={styles.page}>
      <JsonLd data={listing} />

      <nav aria-label="Ruta de navegación" className={`container ${styles.crumbs}`}>
        <Link href="/propiedades">← Todas las propiedades</Link>
      </nav>

      <div className="container">
        <Gallery images={p.images} title={p.title} />
      </div>

      <div className={`container ${styles.layout}`}>
        <div className={styles.main}>
          <header className={styles.head}>
            <p className="eyebrow">
              {TYPE_LABELS[p.property_type]} · {OPERATION_LABELS[p.operation]} · {place}
            </p>
            <h1 className={styles.title}>{p.title}</h1>
            <div className={styles.priceRow}>
              <p className={`${styles.price} tabular`}>{priceText}</p>
              {closed && <span className={styles.badge}>{STATUS_LABELS[p.status]}</span>}
            </div>
          </header>

          {specs.length > 0 && (
            <section aria-labelledby="ficha-tecnica" className={styles.block}>
              <h2 id="ficha-tecnica" className="visually-hidden">
                Ficha técnica
              </h2>
              <dl className={styles.specs}>
                {specs.map((s) => (
                  <div key={s.key} className={styles.spec}>
                    <span className={styles.specIcon}>{s.icon}</span>
                    <dt>{s.label}</dt>
                    <dd className="tabular">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {p.summary && <p className={styles.lead}>{p.summary}</p>}

          {description.length > 0 && (
            <section aria-labelledby="descripcion" className={styles.block}>
              <h2 id="descripcion" className={styles.h2}>
                Descripción
              </h2>
              <div className={styles.prose}>
                {description.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {p.features.length > 0 && (
            <section aria-labelledby="caracteristicas" className={styles.block}>
              <h2 id="caracteristicas" className={styles.h2}>
                Características
              </h2>
              <ul className={styles.features}>
                {p.features.map((f) => (
                  <li key={f}>
                    <CheckIcon width={18} height={18} />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="ubicacion" className={styles.block}>
            <h2 id="ubicacion" className={styles.h2}>
              Ubicación
            </h2>
            <p className={styles.place}>
              <PinIcon width={20} height={20} /> {place}
            </p>
            {mapsHref && (
              <a className="btn btn--ghost" href={mapsHref} target="_blank" rel="noopener noreferrer">
                Ver en Google Maps
              </a>
            )}
          </section>

          <section id="consulta" aria-labelledby="consulta-titulo" className={`${styles.block} ${styles.formBlock}`}>
            <h2 id="consulta-titulo" className={styles.h2}>
              Consulta por esta propiedad
            </h2>
            <p className={styles.formIntro}>Déjanos tus datos y te escribimos con más información o para coordinar una visita.</p>
            <InquiryForm propertyId={p.id} propertyTitle={p.title} />
          </section>
        </div>

        <div className={styles.side}>
          <ContactCard
            priceText={priceText}
            statusNote={
              p.status === "vendida"
                ? "Esta propiedad ya fue vendida. Escríbenos y te mostramos alternativas similares."
                : p.status === "reservada"
                  ? "Esta propiedad está reservada. Consulta por su disponibilidad."
                  : null
            }
            whatsappHref={wa}
            telHref={tel}
            phone={settings.phone}
          />
        </div>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similares" className={styles.similar}>
          <div className="container">
            <h2 id="similares" className={styles.similarTitle}>
              Otras propiedades que pueden interesarte
            </h2>
            <div className={styles.grid}>
              {similar.map((s, i) => (
                <PropertyCard key={s.id} property={s} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
