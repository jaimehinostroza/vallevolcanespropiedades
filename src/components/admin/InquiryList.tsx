"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteInquiryAction, setInquiryReadAction } from "@/app/admin/actions";
import { whatsappLink } from "@/lib/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconCheck, IconMail, IconTrash, IconWhatsapp } from "./icons";
import { useToast } from "./Toast";
import styles from "./InquiryList.module.css";

export interface InquiryItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  read: boolean;
  created_at: string;
  property: { id: string; title: string; slug: string } | null;
}

const rtf = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });
const fullFmt = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" });

function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "justo ahora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function InquiryList({ items }: { items: InquiryItem[] }) {
  const toast = useToast();
  const [list, setList] = useState(items);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [toDelete, setToDelete] = useState<InquiryItem | null>(null);
  const [pending, startTransition] = useTransition();

  const unread = list.filter((i) => !i.read).length;
  const visible = onlyUnread ? list.filter((i) => !i.read) : list;

  const toggleRead = (item: InquiryItem) => {
    const read = !item.read;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, read } : i))); // optimista
    startTransition(async () => {
      const res = await setInquiryReadAction(item.id, read);
      if (!res.ok) {
        setList((l) => l.map((i) => (i.id === item.id ? { ...i, read: !read } : i)));
        toast.error(res.error);
      }
    });
  };

  const remove = () => {
    const item = toDelete;
    if (!item) return;
    startTransition(async () => {
      const res = await deleteInquiryAction(item.id);
      setToDelete(null);
      if (res.ok) {
        setList((l) => l.filter((i) => i.id !== item.id));
        toast.ok("Consulta eliminada");
      } else toast.error(res.error);
    });
  };

  if (list.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>Todavía no hay consultas</h2>
        <p>Cuando alguien te escriba desde el sitio, el mensaje aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filtrar consultas">
        <button type="button" className={styles.filter} aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>
          Todas <span>{list.length}</span>
        </button>
        <button type="button" className={styles.filter} aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}>
          Sin leer <span>{unread}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <p className={styles.none}>No tienes consultas sin leer.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((q, i) => {
            const wa = q.phone
              ? whatsappLink(
                  q.phone.replace(/\D/g, "").length <= 9 ? `56${q.phone.replace(/\D/g, "")}` : q.phone,
                  `Hola ${q.name}, te escribo de Valle Volcanes Propiedades por tu consulta${q.property ? ` sobre "${q.property.title}"` : ""}.`,
                )
              : null;
            const mail = q.email
              ? `mailto:${q.email}?subject=${encodeURIComponent(`Tu consulta en Valle Volcanes Propiedades${q.property ? `: ${q.property.title}` : ""}`)}&body=${encodeURIComponent(`Hola ${q.name},\n\n`)}`
              : null;
            return (
              <li key={q.id} className={styles.item} data-read={q.read} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <div className={styles.head}>
                  <span className={styles.dot} aria-hidden="true" data-read={q.read} />
                  <div className={styles.who}>
                    <h2 className={styles.name}>
                      {q.name}
                      {!q.read && <span className="visually-hidden"> (sin leer)</span>}
                    </h2>
                    <p className={styles.contact}>
                      {[q.phone, q.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <time className={styles.time} dateTime={q.created_at} title={fullFmt.format(new Date(q.created_at))} suppressHydrationWarning>
                    {relative(q.created_at)}
                  </time>
                </div>

                {q.property && (
                  <p className={styles.prop}>
                    Sobre:{" "}
                    <Link href={`/admin/propiedades/${q.property.id}`}>{q.property.title}</Link>
                  </p>
                )}
                <p className={styles.message}>{q.message}</p>

                <div className={styles.actions}>
                  {wa && (
                    <a className={`${styles.btn} ${styles.primary}`} href={wa} target="_blank" rel="noopener">
                      <IconWhatsapp width={18} height={18} /> WhatsApp
                    </a>
                  )}
                  {mail && (
                    <a className={styles.btn} href={mail}>
                      <IconMail width={18} height={18} /> Correo
                    </a>
                  )}
                  <button type="button" className={styles.btn} onClick={() => toggleRead(q)}>
                    <IconCheck width={18} height={18} /> {q.read ? "Marcar sin leer" : "Marcar leída"}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={() => setToDelete(q)} aria-label={`Eliminar consulta de ${q.name}`}>
                    <IconTrash width={18} height={18} /> <span className={styles.hideSm}>Eliminar</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar esta consulta?"
        confirmLabel="Sí, eliminar"
        danger
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      >
        <p>El mensaje de {toDelete?.name} se borrará para siempre.</p>
      </ConfirmDialog>
    </>
  );
}
