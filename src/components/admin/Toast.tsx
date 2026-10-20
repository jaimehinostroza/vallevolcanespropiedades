"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

type Kind = "ok" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
  closing: boolean;
}
interface ToastApi {
  show: (message: string, kind?: Kind) => void;
  ok: (message: string) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return api;
}

const EXIT_MS = 200;
const MAX = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const show = useCallback((message: string, kind: Kind = "ok") => {
    const id = nextId.current++;
    setItems((prev) => [...prev.filter((t) => !t.closing).slice(-(MAX - 1)), { id, kind, message, closing: false }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ show, ok: (m) => show(m, "ok"), error: (m) => show(m, "error") }),
    [show],
  );

  return (
    <Ctx value={api}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDone={dismiss} />
        ))}
      </div>
    </Ctx>
  );
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const duration = item.kind === "error" ? 7000 : 3500;
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // El temporizador se pausa mientras la pestaña está oculta, para no perder el aviso.
  useEffect(() => {
    const start = () => {
      startedAt.current = Date.now();
      timer.current = window.setTimeout(() => onDone(item.id), remaining.current);
    };
    const pause = () => {
      window.clearTimeout(timer.current);
      remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current));
    };
    const onVisibility = () => (document.hidden ? pause() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [item.id, onDone]);

  const visible = entered && !item.closing;
  return (
    <div
      className={styles.toast}
      data-kind={item.kind}
      data-visible={visible}
      role={item.kind === "error" ? "alert" : "status"}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>{item.message}</span>
      <button type="button" className={styles.close} onClick={() => onDone(item.id)} aria-label="Cerrar aviso">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
