import { PhoneIcon, WhatsAppIcon } from "./icons";
import styles from "./ContactCard.module.css";

interface Props {
  priceText: string;
  statusNote?: string | null;
  whatsappHref: string | null;
  telHref: string | null;
  phone: string | null;
}

/** Tarjeta pegajosa en escritorio y barra fija inferior en móvil (mismos botones, dos presentaciones). */
export function ContactCard({ priceText, statusNote, whatsappHref, telHref, phone }: Props) {
  if (!whatsappHref && !telHref) return null;
  return (
    <>
      <aside className={styles.card} aria-label="Contacto">
        <p className="eyebrow">Consulta por esta propiedad</p>
        <p className={`${styles.price} tabular`}>{priceText}</p>
        {statusNote && <p className={styles.note}>{statusNote}</p>}
        <div className={styles.actions}>
          {whatsappHref && (
            <a className="btn btn--forest" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={18} height={18} /> Escribir por WhatsApp
            </a>
          )}
          {telHref && (
            <a className="btn btn--ghost" href={telHref}>
              <PhoneIcon width={18} height={18} /> Llamar{phone ? ` · ${phone}` : ""}
            </a>
          )}
        </div>
        <a className={styles.formLink} href="#consulta">
          O déjanos tu consulta por escrito
        </a>
      </aside>

      <div className={styles.bar} role="region" aria-label="Contacto rápido">
        <p className={`${styles.barPrice} tabular`}>{priceText}</p>
        <div className={styles.barActions}>
          {telHref && (
            <a className={`btn btn--ghost ${styles.round}`} href={telHref} aria-label="Llamar por teléfono">
              <PhoneIcon width={20} height={20} />
            </a>
          )}
          {whatsappHref && (
            <a className="btn btn--forest" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={18} height={18} /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </>
  );
}
