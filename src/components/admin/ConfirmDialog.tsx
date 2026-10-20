"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ConfirmDialog.module.css";
import { Spinner } from "./ui";

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación con <dialog> nativo: el navegador atrapa el foco, bloquea el fondo
 * y cierra con Esc. Al abrir, el foco va al botón de cancelar (la opción segura).
 */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancelar", danger, pending, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      cancelRef.current?.focus();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault(); // Esc: dejamos que el estado del padre cierre
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !pending) onCancel(); // clic en el fondo
      }}
    >
      <div className={styles.panel}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children && <div className={styles.body}>{children}</div>}
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? styles.danger : "btn--forest"}`}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
