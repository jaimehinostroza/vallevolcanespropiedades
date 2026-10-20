"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/login/actions";
import { EMPTY_STATE } from "@/lib/admin/property-form";
import { Field, FormMessage, Spinner } from "./ui";
import ui from "./ui.module.css";
import styles from "./LoginForm.module.css";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, EMPTY_STATE);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.mark} aria-hidden="true">
          VV
        </span>
        <h1 className={styles.title}>Valle Volcanes</h1>
        <p className={styles.sub}>Panel de administración</p>

        <form action={action} className={styles.form} noValidate>
          <input type="hidden" name="next" value={next} />
          {state.errors.form && <FormMessage>{state.errors.form}</FormMessage>}
          <Field name="email" label="Correo" error={state.errors.email}>
            {(p) => (
              <input
                {...p}
                className={ui.input}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={state.values?.email ?? ""}
                required
              />
            )}
          </Field>
          <Field name="password" label="Contraseña" error={state.errors.password}>
            {(p) => <input {...p} className={ui.input} type="password" autoComplete="current-password" required />}
          </Field>
          <button type="submit" className="btn btn--forest" disabled={pending} style={{ minHeight: 52 }}>
            {pending && <Spinner />}
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className={styles.help}>Si olvidaste tu contraseña, contacta al administrador del sitio.</p>
      </div>
    </main>
  );
}
