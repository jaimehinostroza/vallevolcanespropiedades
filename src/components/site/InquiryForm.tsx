"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { sendInquiry, type InquiryState } from "@/app/(site)/actions";
import { CheckIcon } from "./icons";
import styles from "./InquiryForm.module.css";

const initial: InquiryState = { status: "idle" };

interface Props {
  propertyId?: string;
  propertyTitle?: string;
  heading?: string;
  intro?: string;
}

export function InquiryForm({ propertyId, propertyTitle, heading, intro }: Props) {
  const [state, action, pending] = useActionState(sendInquiry, initial);
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const id = (k: string) => `${uid}-${k}`;
  const errs = state.fieldErrors ?? {};
  const defaultMessage = propertyTitle ? `Hola, me interesa «${propertyTitle}». ` : "";

  const hasFieldErrors = state.status === "error" && Object.keys(errs).length > 0;

  // Con errores por campo: foco al primer campo inválido
  useEffect(() => {
    if (!hasFieldErrors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state, hasFieldErrors]);

  if (state.status === "success") {
    return (
      <div className={styles.success} role="status">
        <span className={styles.tick}>
          <CheckIcon width={22} height={22} />
        </span>
        <p className={styles.successTitle}>Consulta enviada</p>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className={styles.form} noValidate>
      {heading && <h3 className={styles.heading}>{heading}</h3>}
      {intro && <p className={styles.intro}>{intro}</p>}
      {propertyId && <input type="hidden" name="property_id" value={propertyId} />}

      {/* Campo trampa anti-spam: oculto para personas y lectores de pantalla */}
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor={id("trap")}>No completar este campo</label>
        <input id={id("trap")} name="empresa_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("name")}>Nombre</label>
        <input
          id={id("name")}
          name="name"
          type="text"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          aria-invalid={errs.name ? true : undefined}
          aria-describedby={errs.name ? id("name-err") : undefined}
        />
        {errs.name && (
          <p className={styles.err} id={id("name-err")}>
            {errs.name}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={id("contact")}>Correo o teléfono</label>
        <input
          id={id("contact")}
          name="contact"
          type="text"
          autoComplete="email"
          required
          defaultValue={state.values?.contact}
          aria-invalid={errs.contact ? true : undefined}
          aria-describedby={errs.contact ? id("contact-err") : undefined}
        />
        {errs.contact && (
          <p className={styles.err} id={id("contact-err")}>
            {errs.contact}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={id("message")}>Mensaje</label>
        <textarea
          id={id("message")}
          name="message"
          rows={4}
          required
          defaultValue={state.values?.message ?? defaultMessage}
          aria-invalid={errs.message ? true : undefined}
          aria-describedby={errs.message ? id("message-err") : undefined}
        />
        {errs.message && (
          <p className={styles.err} id={id("message-err")}>
            {errs.message}
          </p>
        )}
      </div>

      <div aria-live="polite">
        {state.status === "error" && (hasFieldErrors || state.message) && (
          <p className={styles.errBox}>
            {hasFieldErrors ? "Revisa los campos marcados para poder enviar tu consulta." : state.message}
          </p>
        )}
      </div>

      <button type="submit" className="btn btn--forest" disabled={pending} aria-busy={pending}>
        {pending ? "Enviando…" : "Enviar consulta"}
      </button>
      <p className={styles.fine}>Usaremos tus datos solo para responder esta consulta.</p>
    </form>
  );
}
