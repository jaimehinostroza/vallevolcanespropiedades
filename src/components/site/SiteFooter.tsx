import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import type { SiteSettings } from "@/lib/types";
import { telHref } from "./config";
import { InstagramIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "./icons";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const wa = whatsappLink(settings.whatsapp);
  const tel = telHref(settings.phone);
  const ig = settings.instagram?.replace(/^@/, "").trim();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandCol}>
          <p className={styles.brand}>{settings.agency_name}</p>
          {settings.tagline && <p className={styles.tagline}>{settings.tagline}</p>}
        </div>

        <nav aria-label="Pie de página" className={styles.col}>
          <h2 className={styles.heading}>Sitio</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/propiedades">Propiedades</Link>
            </li>
            <li>
              <Link href="/#nosotros">Nosotros</Link>
            </li>
            <li>
              <Link href="/#contacto">Contacto</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.heading}>Contacto</h2>
          <ul className={styles.list}>
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon width={18} height={18} /> WhatsApp
                </a>
              </li>
            )}
            {tel && settings.phone && (
              <li>
                <a href={tel}>
                  <PhoneIcon width={18} height={18} /> {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`}>
                  <MailIcon width={18} height={18} /> {settings.email}
                </a>
              </li>
            )}
            {ig && (
              <li>
                <a href={`https://www.instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon width={18} height={18} /> @{ig}
                </a>
              </li>
            )}
            {settings.address && (
              <li>
                <span className={styles.plain}>
                  <PinIcon width={18} height={18} /> {settings.address}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className={`container ${styles.legal}`}>
        <p>© {settings.agency_name}. Todos los derechos reservados.</p>
        {settings.service_area && <p>Atendemos en {settings.service_area}.</p>}
      </div>
    </footer>
  );
}
