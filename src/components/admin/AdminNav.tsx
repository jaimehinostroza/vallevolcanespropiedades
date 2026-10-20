"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { IconExternal, IconHome, IconInbox, IconLogout, IconSliders } from "./icons";
import styles from "./AdminNav.module.css";

interface Props {
  unread: number;
  email: string;
}

export function AdminNav({ unread, email }: Props) {
  const pathname = usePathname();
  const isProps = pathname === "/admin" || pathname.startsWith("/admin/propiedades");
  const isInq = pathname.startsWith("/admin/consultas");
  const isSet = pathname.startsWith("/admin/ajustes");

  return (
    <nav className={styles.nav} aria-label="Panel de administración">
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          VV
        </span>
        <span className={styles.brandText}>
          Valle Volcanes
          <small>Panel de administración</small>
        </span>
      </div>

      <ul className={styles.list}>
        <li>
          <NavLink href="/admin" active={isProps} icon={<IconHome />} label="Propiedades" />
        </li>
        <li>
          <NavLink
            href="/admin/consultas"
            active={isInq}
            icon={<IconInbox />}
            label="Consultas"
            badge={unread > 0 ? unread : undefined}
          />
        </li>
        <li>
          <NavLink href="/admin/ajustes" active={isSet} icon={<IconSliders />} label="Ajustes" longLabel="Ajustes del sitio" />
        </li>
        <li className={styles.sep} aria-hidden="true" />
        <li>
          <a className={styles.item} href="/" target="_blank" rel="noopener">
            <IconExternal />
            <span>Ver sitio</span>
          </a>
        </li>
        <li>
          <form action={logoutAction}>
            <button type="submit" className={styles.item}>
              <IconLogout />
              <span>Salir</span>
            </button>
          </form>
        </li>
      </ul>

      <p className={styles.who} title={email}>
        {email}
      </p>
    </nav>
  );
}

function NavLink({
  href,
  active,
  icon,
  label,
  longLabel,
  badge,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  longLabel?: string;
  badge?: number;
}) {
  return (
    <Link href={href} className={styles.item} aria-current={active ? "page" : undefined} data-active={active}>
      <span className={styles.iconWrap}>
        {icon}
        {badge !== undefined && (
          <span className={styles.badge} aria-hidden="true">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span>
        <span className={styles.shortLabel}>{label}</span>
        <span className={styles.longLabel}>{longLabel ?? label}</span>
      </span>
      {badge !== undefined && <span className="visually-hidden">, {badge} sin leer</span>}
    </Link>
  );
}
