"use client";

import { useId, type ReactNode } from "react";
import styles from "./ui.module.css";

export interface ControlProps {
  id: string;
  name: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldProps {
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  /** Contenido a la derecha de la etiqueta (ej. contador de letras) */
  aside?: ReactNode;
  children: (props: ControlProps) => ReactNode;
}

/** Etiqueta + ayuda + error asociados al control con aria-describedby. */
export function Field({ name, label, hint, error, optional, className, aside, children }: FieldProps) {
  const uid = useId();
  const id = `${uid}-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")} data-invalid={error ? "true" : undefined}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> (opcional)</span>}
        </label>
        {aside}
      </div>
      {children({ id, name, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

export function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  const uid = useId();
  return (
    <section className={styles.section} aria-labelledby={`${uid}-t`} id={id}>
      <header className={styles.sectionHead}>
        <h2 id={`${uid}-t`} className={styles.sectionTitle}>
          {title}
        </h2>
        {description && <p className={styles.sectionDesc}>{description}</p>}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function FormMessage({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <p className={styles.message} data-ok={ok ? "true" : undefined} role={ok ? "status" : "alert"}>
      {children}
    </p>
  );
}
