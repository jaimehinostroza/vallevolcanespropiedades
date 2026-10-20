"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { saveSettingsAction } from "@/app/admin/actions";
import { EMPTY_STATE } from "@/lib/admin/property-form";
import type { SiteSettings } from "@/lib/types";
import { useToast } from "./Toast";
import { Field, FormMessage, Section, Spinner } from "./ui";
import ui from "./ui.module.css";
import styles from "./Forms.module.css";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, EMPTY_STATE);
  const toast = useToast();
  const lastSaved = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.savedAt && state.savedAt !== lastSaved.current) {
      lastSaved.current = state.savedAt;
      toast.ok("Guardado");
    } else if (!state.ok && state.message && state.savedAt === undefined) {
      toast.error(state.message);
    }
  }, [state, toast]);

  const v = (k: keyof SiteSettings) => state.values?.[k] ?? (settings[k] as string | null) ?? "";
  const e = state.errors;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {e.form && <FormMessage>{e.form}</FormMessage>}

      <Section title="La corredora" description="Cómo te presentas en el sitio.">
        <Field name="agency_name" label="Nombre de la corredora" error={e.agency_name}>
          {(p) => <input {...p} className={ui.input} defaultValue={v("agency_name")} maxLength={120} autoComplete="organization" />}
        </Field>
        <Field name="owner_name" label="Tu nombre" optional error={e.owner_name}>
          {(p) => <input {...p} className={ui.input} defaultValue={v("owner_name")} maxLength={120} autoComplete="name" />}
        </Field>
        <Field name="tagline" label="Frase principal" hint="Es el titular grande de la portada." optional error={e.tagline}>
          {(p) => <input {...p} className={ui.input} defaultValue={v("tagline")} maxLength={160} />}
        </Field>
        <Field name="about" label="Sobre nosotros" hint="Un par de párrafos sobre ti y tu forma de trabajar." optional error={e.about}>
          {(p) => <textarea {...p} className={ui.textarea} rows={6} defaultValue={v("about")} maxLength={4000} />}
        </Field>
      </Section>

      <Section title="Contacto" description="Los botones de contacto del sitio usan estos datos.">
        <div className={styles.grid2}>
          <Field name="phone" label="Teléfono" optional error={e.phone}>
            {(p) => <input {...p} className={ui.input} type="tel" inputMode="tel" autoComplete="tel" defaultValue={v("phone")} placeholder="+56 9 1234 5678" />}
          </Field>
          <Field
            name="whatsapp"
            label="WhatsApp"
            hint="Solo números, con 56 al inicio. Ejemplo: 56912345678."
            optional
            error={e.whatsapp}
          >
            {(p) => <input {...p} className={ui.input} type="tel" inputMode="numeric" defaultValue={v("whatsapp")} placeholder="56912345678" />}
          </Field>
        </div>
        <div className={styles.grid2}>
          <Field name="email" label="Correo" optional error={e.email}>
            {(p) => <input {...p} className={ui.input} type="email" inputMode="email" autoCapitalize="none" spellCheck={false} defaultValue={v("email")} />}
          </Field>
          <Field name="instagram" label="Instagram" hint="Tu nombre de usuario, sin @." optional error={e.instagram}>
            {(p) => <input {...p} className={ui.input} autoCapitalize="none" spellCheck={false} defaultValue={v("instagram")} placeholder="vallevolcanespropiedades" />}
          </Field>
        </div>
      </Section>

      <Section title="Ubicación">
        <Field name="address" label="Dirección de la oficina" optional error={e.address}>
          {(p) => <input {...p} className={ui.input} autoComplete="street-address" defaultValue={v("address")} />}
        </Field>
        <Field name="service_area" label="Zona de servicio" hint="Las comunas donde trabajas, separadas por coma." optional error={e.service_area}>
          {(p) => <input {...p} className={ui.input} defaultValue={v("service_area")} />}
        </Field>
      </Section>

      <div className={styles.actionBar}>
        <button type="submit" className="btn btn--forest" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Guardando…" : "Guardar ajustes"}
        </button>
      </div>
    </form>
  );
}
