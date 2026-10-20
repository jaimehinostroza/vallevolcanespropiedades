"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { savePropertyAction } from "@/app/admin/actions";
import { COMMUNES, CURRENCIES, EMPTY_STATE } from "@/lib/admin/property-form";
import { OPERATION_LABELS, STATUS_LABELS, TYPE_LABELS, slugify } from "@/lib/format";
import type { Property, PropertyStatus } from "@/lib/types";
import { useToast } from "./Toast";
import { Field, FormMessage, Section, Spinner } from "./ui";
import ui from "./ui.module.css";
import styles from "./Forms.module.css";

const STATUS_HELP: Record<PropertyStatus, string> = {
  borrador: "Solo tú la ves. No aparece en el sitio.",
  publicada: "Visible para todos en el sitio.",
  reservada: "Se ve en el sitio con la etiqueta “Reservada”.",
  vendida: "Se ve en el sitio con la etiqueta “Vendida”.",
};

const numStr = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

export function PropertyForm({ property }: { property: Property | null }) {
  const toast = useToast();
  const [state, action, pending] = useActionState(savePropertyAction.bind(null, property?.id ?? null), EMPTY_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  const sv = state.values;
  const e = state.errors;
  const init = (k: string, fallback: string) => sv?.[k] ?? fallback;

  const [title, setTitle] = useState(property?.title ?? "");
  const [slug, setSlug] = useState(property?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(property));
  const [summary, setSummary] = useState(property?.summary ?? "");
  const [status, setStatus] = useState<PropertyStatus>(property?.status ?? "borrador");
  const [features, setFeatures] = useState<string[]>(property?.features ?? []);
  const [featureDraft, setFeatureDraft] = useState("");

  // Tras guardar, el servidor manda la dirección web y el estado definitivos (ajuste de render, sin efecto)
  const [seenSave, setSeenSave] = useState<number | undefined>(undefined);
  if (state.savedAt && state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.values?.slug) setSlug(state.values.slug);
    if (state.values?.status) setStatus(state.values.status as PropertyStatus);
  }

  // Aviso al terminar de guardar (una sola vez por guardado)
  const lastSaved = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.savedAt && state.savedAt !== lastSaved.current) {
      lastSaved.current = state.savedAt;
      toast.ok(state.message?.startsWith("Guardado como borrador") ? "Guardado como borrador" : "Guardado");
    }
  }, [state, toast]);

  // Mensajes de error: foco al primer campo con problema
  useEffect(() => {
    if (state.ok || !Object.keys(state.errors).length) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.focus();
    toast.error(state.message ?? "No se pudo guardar.");
  }, [state, toast]);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const addFeature = () => {
    const v = featureDraft.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (!features.some((f) => f.toLowerCase() === v.toLowerCase())) setFeatures((f) => [...f, v.slice(0, 60)]);
    setFeatureDraft("");
  };
  const onFeatureKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter" || ev.key === ",") {
      ev.preventDefault(); // Enter no envía el formulario
      addFeature();
    } else if (ev.key === "Backspace" && !featureDraft && features.length) {
      setFeatures((f) => f.slice(0, -1));
    }
  };

  const isNew = !property;
  const left = 280 - summary.length;

  return (
    <form
      ref={formRef}
      className={styles.form}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        // Si quedó una característica escrita sin Enter, también se guarda
        const draft = featureDraft.trim();
        if (draft && !features.includes(draft)) fd.append("features", draft);
        const submitter = (ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        fd.set("intent", submitter?.value ?? "guardar");
        startTransition(() => action(fd));
      }}
    >
      {e.form && <FormMessage>{e.form}</FormMessage>}
      {state.ok && state.message && <FormMessage ok>{state.message}</FormMessage>}

      <Section title="Lo esencial" description="Lo primero que ve quien visita el sitio.">
        <Field name="title" label="Título" hint="Ejemplo: Casa con vista al lago en Ensenada." error={e.title}>
          {(p) => (
            <input
              {...p}
              className={ui.input}
              value={title}
              onChange={(ev) => onTitle(ev.target.value)}
              maxLength={140}
              autoComplete="off"
              enterKeyHint="next"
            />
          )}
        </Field>

        <div className={styles.grid2}>
          <Field name="operation" label="¿Se vende o se arrienda?" error={e.operation}>
            {(p) => (
              <select {...p} className={ui.select} defaultValue={init("operation", property?.operation ?? "venta")}>
                {Object.entries(OPERATION_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="property_type" label="Tipo de propiedad" error={e.property_type}>
            {(p) => (
              <select {...p} className={ui.select} defaultValue={init("property_type", property?.property_type ?? "casa")}>
                {Object.entries(TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className={styles.priceRow}>
          <Field name="price" label="Precio" hint="Déjalo vacío para mostrar “Precio a consultar”." optional error={e.price}>
            {(p) => (
              <input
                {...p}
                className={ui.input}
                inputMode="decimal"
                autoComplete="off"
                defaultValue={init("price", numStr(property?.price))}
                placeholder="8500"
              />
            )}
          </Field>
          <Field name="currency" label="Moneda" error={e.currency}>
            {(p) => (
              <select {...p} className={ui.select} defaultValue={init("currency", property?.currency ?? "UF")}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "CLP" ? "Pesos ($)" : c === "USD" ? "Dólares (US$)" : "UF"}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <fieldset className={styles.fieldset} aria-describedby="status-help">
          <legend className={ui.label}>¿Quieres que se vea en el sitio?</legend>
          <div className={styles.radioGrid}>
            {(Object.keys(STATUS_LABELS) as PropertyStatus[]).map((s) => (
              <label key={s} className={styles.radio} data-checked={status === s}>
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
                <span>{STATUS_LABELS[s]}</span>
              </label>
            ))}
          </div>
          <p id="status-help" className={ui.hint} aria-live="polite">
            {STATUS_HELP[status]}
          </p>
          {e.status && <p className={ui.error}>{e.status}</p>}
        </fieldset>

        <label className={styles.check}>
          <input type="checkbox" name="featured" defaultChecked={sv ? sv.featured === "on" : (property?.featured ?? false)} />
          <span>
            <strong>Destacada</strong>
            <small>Aparece primero en la portada del sitio.</small>
          </span>
        </label>

        <Field
          name="slug"
          label="Dirección web de la propiedad"
          hint={
            <>
              Se arma sola con el título. Así se verá: <code>/propiedades/{slug || "titulo-de-la-propiedad"}</code>
              {property ? ". Si la cambias, el enlace anterior dejará de funcionar." : ""}
            </>
          }
          error={e.slug}
        >
          {(p) => (
            <input
              {...p}
              className={ui.input}
              value={slug}
              onChange={(ev) => {
                setSlugTouched(true);
                setSlug(ev.target.value);
              }}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
      </Section>

      <Section title="Ubicación">
        <div className={styles.grid2}>
          <Field name="commune" label="Comuna" error={e.commune}>
            {(p) => (
              <>
                <input
                  {...p}
                  list="communes"
                  className={ui.input}
                  defaultValue={init("commune", property?.commune ?? "Puerto Varas")}
                  autoComplete="off"
                />
                <datalist id="communes">
                  {COMMUNES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field name="sector" label="Sector" hint="Ejemplo: Ensenada, Colonia Tres Puentes." optional error={e.sector}>
            {(p) => <input {...p} className={ui.input} defaultValue={init("sector", property?.sector ?? "")} autoComplete="off" />}
          </Field>
        </div>
        <Field name="address" label="Dirección" hint="Si no quieres mostrarla, déjala vacía." optional error={e.address}>
          {(p) => <input {...p} className={ui.input} defaultValue={init("address", property?.address ?? "")} autoComplete="off" />}
        </Field>
        <div className={styles.grid2}>
          <Field
            name="latitude"
            label="Latitud"
            hint="Cópiala desde Google Maps: toca el punto en el mapa y copia el primer número."
            optional
            error={e.latitude}
          >
            {(p) => (
              <input {...p} className={ui.input} inputMode="decimal" defaultValue={init("latitude", numStr(property?.latitude))} placeholder="-41.3185" />
            )}
          </Field>
          <Field name="longitude" label="Longitud" hint="Es el segundo número, al lado de la latitud." optional error={e.longitude}>
            {(p) => (
              <input {...p} className={ui.input} inputMode="decimal" defaultValue={init("longitude", numStr(property?.longitude))} placeholder="-72.9857" />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Ficha técnica" description="Deja en blanco lo que no corresponda (por ejemplo, dormitorios en un terreno).">
        <div className={styles.grid3}>
          <Field name="bedrooms" label="Dormitorios" optional error={e.bedrooms}>
            {(p) => <input {...p} className={ui.input} inputMode="numeric" defaultValue={init("bedrooms", numStr(property?.bedrooms))} />}
          </Field>
          <Field name="bathrooms" label="Baños" optional error={e.bathrooms}>
            {(p) => <input {...p} className={ui.input} inputMode="numeric" defaultValue={init("bathrooms", numStr(property?.bathrooms))} />}
          </Field>
          <Field name="parking" label="Estacionamientos" optional error={e.parking}>
            {(p) => <input {...p} className={ui.input} inputMode="numeric" defaultValue={init("parking", numStr(property?.parking))} />}
          </Field>
          <Field name="built_m2" label="m² construidos" optional error={e.built_m2}>
            {(p) => <input {...p} className={ui.input} inputMode="decimal" defaultValue={init("built_m2", numStr(property?.built_m2))} />}
          </Field>
          <Field name="land_m2" label="m² de terreno" optional error={e.land_m2}>
            {(p) => <input {...p} className={ui.input} inputMode="decimal" defaultValue={init("land_m2", numStr(property?.land_m2))} />}
          </Field>
          <Field name="year_built" label="Año de construcción" optional error={e.year_built}>
            {(p) => <input {...p} className={ui.input} inputMode="numeric" maxLength={4} defaultValue={init("year_built", numStr(property?.year_built))} />}
          </Field>
        </div>
      </Section>

      <Section title="Textos">
        <Field
          name="summary"
          label="Resumen"
          hint="Una o dos frases para las tarjetas y para cuando se comparte el enlace."
          optional
          error={e.summary}
          aside={
            <span className={styles.counter} data-over={left < 0} aria-live="polite">
              {left < 0 ? `${-left} de más` : `${left} restantes`}
            </span>
          }
        >
          {(p) => (
            <textarea
              {...p}
              className={ui.textarea}
              rows={3}
              value={summary}
              onChange={(ev) => setSummary(ev.target.value)}
            />
          )}
        </Field>
        <Field name="description" label="Descripción completa" hint="Cuenta lo que hace especial a la propiedad. Puedes separar párrafos con una línea en blanco." optional error={e.description}>
          {(p) => <textarea {...p} className={ui.textarea} rows={9} defaultValue={init("description", property?.description ?? "")} />}
        </Field>
      </Section>

      <Section title="Características" description="Detalles que se muestran como etiquetas: “Vista al lago”, “Quincho”, “Calefacción a leña”.">
        <Field name="feature-draft" label="Agregar característica" error={e.features} hint="Escribe y presiona Enter (o el botón Agregar). Toca la ✕ para quitar una.">
          {(p) => (
            <div className={styles.featureAdd}>
              <input
                id={p.id}
                aria-describedby={p["aria-describedby"]}
                aria-invalid={p["aria-invalid"]}
                className={ui.input}
                value={featureDraft}
                onChange={(ev) => setFeatureDraft(ev.target.value)}
                onKeyDown={onFeatureKey}
                enterKeyHint="done"
                maxLength={60}
                autoComplete="off"
              />
              <button type="button" className="btn btn--ghost" onClick={addFeature} disabled={!featureDraft.trim()}>
                Agregar
              </button>
            </div>
          )}
        </Field>
        {features.length > 0 && (
          <ul className={styles.chips} aria-label="Características agregadas">
            {features.map((f) => (
              <li key={f} className={styles.chip}>
                <span>{f}</span>
                <input type="hidden" name="features" value={f} />
                <button type="button" onClick={() => setFeatures((list) => list.filter((x) => x !== f))} aria-label={`Quitar ${f}`}>
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className={styles.actionBar} data-sticky="true">
        <p className={styles.actionNote}>
          {status === "borrador" ? "Estado: borrador (no visible)" : `Estado: ${STATUS_LABELS[status].toLowerCase()} (visible)`}
        </p>
        <div className={styles.actionBtns}>
          {status === "borrador" ? (
            <>
              <button type="submit" value="guardar" className="btn btn--ghost" disabled={pending}>
                {pending && <Spinner />}
                Guardar borrador
              </button>
              <button type="submit" value="publicar" className="btn btn--forest" disabled={pending}>
                {pending && <Spinner />}
                {isNew ? "Publicar" : "Publicar ahora"}
              </button>
            </>
          ) : (
            <button type="submit" value="guardar" className="btn btn--forest" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
