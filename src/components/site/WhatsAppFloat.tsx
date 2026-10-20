"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "./icons";
import styles from "./WhatsAppFloat.module.css";

/** Botón flotante discreto. En las fichas de propiedad se oculta: ahí ya hay una barra/tarjeta de contacto. */
export function WhatsAppFloat({ href }: { href: string | null }) {
  const pathname = usePathname();
  if (!href || /^\/propiedades\/[^/]+/.test(pathname)) return null;
  return (
    <a
      className={styles.fab}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp (se abre en una pestaña nueva)"
    >
      <WhatsAppIcon width={26} height={26} />
    </a>
  );
}
