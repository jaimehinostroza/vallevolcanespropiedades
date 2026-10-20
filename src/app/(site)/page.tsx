import type { Metadata } from "next";
import Link from "next/link";
import { getFeaturedProperties, getSettings } from "@/lib/data";
import { formatPrice, TYPE_LABELS, whatsappLink } from "@/lib/format";
import { imageUrl, variantWidth } from "@/lib/images";
import { InquiryForm } from "@/components/site/InquiryForm";
import { JsonLd } from "@/components/site/JsonLd";
import { PropertyCard } from "@/components/site/PropertyCard";
import { SITE_URL, telHref, toParagraphs } from "@/components/site/config";
import { ArrowRightIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/site/icons";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, featured] = await Promise.all([getSettings(), getFeaturedProperties(1)]);
  const cover = featured[0]?.images[0];
  const title = `${settings.agency_name} · Propiedades en Puerto Varas`;
  const description =
    settings.tagline ??
    "Casas, parcelas y terrenos en Puerto Varas, Llanquihue, Frutillar y Ensenada. Corredora de propiedades con conocimiento local.";
  const images = cover
    ? [
        {
          url: imageUrl(cover, "md"),
          width: variantWidth(cover, "md"),
          height: Math.round((variantWidth(cover, "md") * cover.height) / cover.width),
          alt: cover.alt ?? featured[0].title,
        },
      ]
    : // Sin fotos: imagen de marca para que el enlace compartido no salga vacío
      [{ url: "/portada/osorno-og.jpg", width: 1200, height: 630, alt: "Volcán Osorno, Región de Los Lagos" }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", title, description, url: "/", images },
    twitter: { card: "summary_large_image", title, description, images: images?.map((i) => i.url) },
  };
}

const HERO_WIDTHS = [828, 1280, 1920, 2560];

export default async function HomePage() {
  const [settings, featured] = await Promise.all([getSettings(), getFeaturedProperties(6)]);
  const lead = featured[0];
  const wa = whatsappLink(settings.whatsapp, "Hola, quisiera conversar sobre una propiedad.");
  const tel = telHref(settings.phone);
  const ig = settings.instagram?.replace(/^@/, "").trim();
  const about = toParagraphs(settings.about);
  const areas = (settings.service_area ?? "")
    .split(/,| y /)
    .map((s) => s.trim())
    .filter(Boolean);
  const headline = settings.tagline ?? "Propiedades entre lagos y volcanes";

  const agent: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: settings.agency_name,
    url: SITE_URL,
    description: settings.about ?? undefined,
    telephone: settings.phone ?? undefined,
    email: settings.email ?? undefined,
    areaServed: areas.length ? areas : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address ?? undefined,
      addressLocality: "Puerto Varas",
      addressCountry: "CL",
    },
    sameAs: ig ? [`https://www.instagram.com/${ig}`] : undefined,
  };

  return (
    <>
      <JsonLd data={agent} />

      {/* ───── Hero ───── */}
      <section className={styles.hero} aria-labelledby="hero-titulo">
        <div className={styles.heroMedia}>
          {/* Foto de portada fija: volcán Osorno. Variantes AVIF/WebP pregeneradas en /public/portada */}
          <picture>
            <source
              type="image/avif"
              srcSet={HERO_WIDTHS.map((w) => `/portada/osorno-${w}.avif ${w}w`).join(", ")}
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet={HERO_WIDTHS.map((w) => `/portada/osorno-${w}.webp ${w}w`).join(", ")}
              sizes="100vw"
            />
            <img
              src="/portada/osorno-1920.webp"
              alt="Volcán Osorno nevado sobre el bosque nativo y los saltos del río Petrohué"
              width={2560}
              height={1920}
              fetchPriority="high"
              decoding="async"
              className={styles.heroPhoto}
            />
          </picture>
          <div className={styles.heroShade} />
        </div>

        <div className={`container ${styles.heroBody}`}>
          <p className={`eyebrow ${styles.heroEyebrow}`}>Puerto Varas · Región de Los Lagos</p>
          <h1 id="hero-titulo" className={styles.heroTitle}>
            {headline}
          </h1>
          <p className={styles.heroSub}>
            Casas, parcelas y terrenos en el sur de Chile, con acompañamiento cercano de principio a fin.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/propiedades" className="btn btn--light">
              Ver propiedades <ArrowRightIcon width={18} height={18} />
            </Link>
            {wa && (
              <a href={wa} className={`btn ${styles.ghostLight}`} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon width={18} height={18} /> Hablar por WhatsApp
              </a>
            )}
          </div>
          {lead && (
            <Link href={`/propiedades/${lead.slug}`} className={styles.heroCaption}>
              <span className={styles.captionKicker}>
                Destacada · {TYPE_LABELS[lead.property_type]} en {lead.commune}
              </span>
              <span className={styles.captionTitle}>
                {lead.title} <span className="tabular">· {formatPrice(lead.price, lead.currency)}</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* ───── Destacadas ───── */}
      <section className={styles.section} aria-labelledby="destacadas">
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <p className="eyebrow">Selección</p>
              <h2 id="destacadas" className={styles.h2}>
                Propiedades destacadas
              </h2>
            </div>
            <Link href="/propiedades" className={styles.more}>
              Ver todas <ArrowRightIcon width={18} height={18} />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className={styles.grid}>
              {featured.map((p, i) => (
                <PropertyCard key={p.id} property={p} index={i} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyNote}>
              Estamos preparando nuestra selección de propiedades. Escríbenos y te contamos qué tenemos disponible.
            </p>
          )}
        </div>
      </section>

      {/* ───── Nosotros ───── */}
      <section id="nosotros" className={styles.about} aria-labelledby="nosotros-titulo">
        <div className={`container ${styles.aboutGrid}`}>
          <div>
            <p className="eyebrow">Nosotros</p>
            <h2 id="nosotros-titulo" className={styles.h2}>
              Sobre {settings.agency_name}
            </h2>
            {settings.owner_name && <p className={styles.owner}>{settings.owner_name}, corredora de propiedades</p>}
          </div>
          <div className={styles.aboutText}>
            {about.map((para, i) => (
              <p key={i} className={i === 0 ? styles.aboutLead : undefined}>
                {para}
              </p>
            ))}
            {areas.length > 0 && (
              <div className={styles.areas}>
                <p className="eyebrow">Zona de atención</p>
                <ul>
                  {areas.map((a) => (
                    <li key={a}>
                      <PinIcon width={16} height={16} /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───── Contacto ───── */}
      <section id="contacto" className={styles.contact} aria-labelledby="contacto-titulo">
        <div className={`container ${styles.contactGrid}`}>
          <div className={styles.contactCopy}>
            <p className="eyebrow">Contacto</p>
            <h2 id="contacto-titulo" className={styles.h2}>
              Conversemos sobre lo que buscas
            </h2>
            <p className={styles.contactLead}>
              Cuéntanos si quieres comprar, vender o arrendar. Te respondemos por el medio que prefieras.
            </p>
            <ul className={styles.contactList}>
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon width={20} height={20} /> WhatsApp
                  </a>
                </li>
              )}
              {tel && settings.phone && (
                <li>
                  <a href={tel}>
                    <PhoneIcon width={20} height={20} /> {settings.phone}
                  </a>
                </li>
              )}
              {settings.email && (
                <li>
                  <a href={`mailto:${settings.email}`}>
                    <MailIcon width={20} height={20} /> {settings.email}
                  </a>
                </li>
              )}
              {ig && (
                <li>
                  <a href={`https://www.instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">
                    <InstagramIcon width={20} height={20} /> @{ig}
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div className={styles.formCard}>
            <InquiryForm heading="Escríbenos" />
          </div>
        </div>
      </section>
    </>
  );
}
