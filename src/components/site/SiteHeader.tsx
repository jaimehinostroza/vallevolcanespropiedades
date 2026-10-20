"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloseIcon, MenuIcon, PhoneIcon, WhatsAppIcon } from "./icons";
import styles from "./SiteHeader.module.css";

const LINKS = [
  { href: "/propiedades", label: "Propiedades" },
  { href: "/#nosotros", label: "Nosotros" },
  { href: "/#contacto", label: "Contacto" },
];

// "Scrolled" como store externo: evita setState dentro de efectos y sincroniza al montar.
function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
const getScrolled = () => window.scrollY > 24;
const getServerScrolled = () => false;

interface Props {
  brand: string;
  whatsappHref: string | null;
  telHref: string | null;
  phone: string | null;
}

export function SiteHeader({ brand, whatsappHref, telHref, phone }: Props) {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(subscribeScroll, getScrolled, getServerScrolled);
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  const onHero = pathname === "/" && !scrolled && !open;
  const close = useCallback(() => setOpen(false), []);

  // Bloqueo de scroll, foco y teclado mientras la hoja está abierta
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) menuBtn.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    closeBtn.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !sheet.current) return;
      const items = sheet.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  return (
    <header
      className={styles.header}
      data-hero={onHero}
      data-scrolled={scrolled}
      data-open={open}
    >
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} onClick={close}>
          {brand}
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={styles.navLink}>
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          ref={menuBtn}
          type="button"
          className={styles.menuBtn}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen(true)}
        >
          <MenuIcon width={26} height={26} />
        </button>
      </div>

      <div className={styles.backdrop} data-open={open} onClick={close} aria-hidden="true" />
      <div
        id="menu-movil"
        ref={sheet}
        className={styles.sheet}
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        inert={!open}
      >
        <div className={styles.sheetTop}>
          <span className="eyebrow">Menú</span>
          <button ref={closeBtn} type="button" className={styles.closeBtn} aria-label="Cerrar menú" onClick={close}>
            <CloseIcon width={24} height={24} />
          </button>
        </div>
        <nav aria-label="Menú móvil" className={styles.sheetNav}>
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.sheetLink}
              style={{ "--i": i } as React.CSSProperties}
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sheetFoot}>
          {whatsappHref && (
            <a className="btn btn--forest" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={18} height={18} /> Escribir por WhatsApp
            </a>
          )}
          {telHref && phone && (
            <a className={styles.sheetPhone} href={telHref}>
              <PhoneIcon width={18} height={18} /> {phone}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
