"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { imageSrcSet, imageUrl } from "@/lib/images";
import type { PropertyImage } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";
import styles from "./Lightbox.module.css";

interface Props {
  images: PropertyImage[];
  index: number;
  title: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

const SWIPE_DISTANCE = 60; // px
const SWIPE_VELOCITY = 0.11; // px/ms (valor de Sonner)
const DISMISS_DISTANCE = 110;
const EXIT_MS = 160;

/** Visor a pantalla completa: teclado sin animación, swipe con velocidad, foco atrapado, scroll bloqueado. */
export function Lightbox({ images, index, title, onIndexChange, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const n = images.length;
  const go = useCallback(
    (delta: number) => onIndexChange((indexRef.current + delta + n) % n),
    [n, onIndexChange],
  );

  // Cierre con salida corta (clic, botón, swipe vertical). Con Esc se cierra sin animación.
  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  // Bloqueo de scroll + foco inicial + devolución del foco
  useEffect(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      const el = returnTo.current;
      if (el && el.isConnected) el.focus({ preventScroll: true });
    };
  }, []);

  // Teclado: flechas y Esc instantáneos; Tab atrapado dentro del visor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Tab" && dialog.current) {
        const items = dialog.current.querySelectorAll<HTMLElement>("button:not([disabled])");
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
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Precarga de la foto siguiente y la anterior, con el mismo srcset/sizes que usará el visor
  useEffect(() => {
    if (n < 2) return;
    for (const j of [(index + 1) % n, (index - 1 + n) % n]) {
      const img = new Image();
      img.sizes = "100vw";
      img.srcset = imageSrcSet(images[j]);
      img.src = imageUrl(images[j], "md");
    }
  }, [index, images, n]);

  // Gesto táctil: horizontal cambia de foto, vertical descarta. Se decide por distancia o velocidad.
  const drag = useRef<{ id: number; x: number; y: number; t: number; axis: "x" | "y" | null; dx: number; dy: number } | null>(null);

  const apply = (dx: number, dy: number) => {
    if (figure.current) figure.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    if (backdrop.current) backdrop.current.style.opacity = String(1 - Math.min(Math.abs(dy) / 360, 0.65));
  };

  const settle = () => {
    const f = figure.current;
    const b = backdrop.current;
    if (f) {
      f.style.transition = "transform 220ms var(--ease-out)";
      f.style.transform = "";
    }
    if (b) {
      b.style.transition = "opacity 220ms var(--ease-out)";
      b.style.opacity = "";
    }
    window.setTimeout(() => {
      if (f) f.style.transition = "";
      if (b) b.style.transition = "";
    }, 240);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || drag.current) return; // un solo dedo; el mouse usa flechas y botones
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), axis: null, dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (d.axis === "x") {
      // Fricción en los extremos de la serie
      const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === n - 1);
      d.dx = atEdge ? dx * 0.3 : dx;
      apply(d.dx, 0);
    } else {
      d.dy = dy;
      apply(0, dy > 0 ? dy : dy * 0.25);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const elapsed = Math.max(performance.now() - d.t, 1);
    if (d.axis === "x") {
      const velocity = Math.abs(d.dx) / elapsed;
      if ((Math.abs(d.dx) >= SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) && n > 1) {
        const dir = d.dx < 0 ? 1 : -1;
        const target = indexRef.current + dir;
        if (target >= 0 && target < n) {
          if (figure.current) figure.current.style.transform = "";
          onIndexChange(target);
          return;
        }
      }
      settle();
    } else if (d.axis === "y") {
      const velocity = Math.abs(d.dy) / elapsed;
      if (d.dy > 0 && (d.dy >= DISMISS_DISTANCE || velocity > SWIPE_VELOCITY)) {
        requestClose();
      } else {
        settle();
      }
    }
  };

  const current = images[index];
  if (typeof document === "undefined" || !current) return null;

  return createPortal(
    <div
      ref={dialog}
      className={styles.root}
      data-closing={closing}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${title}`}
    >
      <div ref={backdrop} className={styles.backdrop} onClick={requestClose} />

      <div className={styles.top}>
        <p className={`${styles.counter} tabular`} aria-live="polite">
          {index + 1} / {n}
        </p>
        <button ref={closeBtn} type="button" className={styles.iconBtn} aria-label="Cerrar visor de fotos" onClick={requestClose}>
          <CloseIcon width={24} height={24} />
        </button>
      </div>

      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      >
        <div ref={figure} className={styles.figure}>
          <PropertyPhoto
            key={current.id}
            image={current}
            sizes="lightbox"
            alt={current.alt ?? `${title}, foto ${index + 1} de ${n}`}
            priority
            className={styles.photo}
          />
        </div>
      </div>

      {n > 1 && (
        <>
          <button type="button" className={`${styles.iconBtn} ${styles.prev}`} aria-label="Foto anterior" onClick={() => go(-1)}>
            <ChevronLeftIcon width={26} height={26} />
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.next}`} aria-label="Foto siguiente" onClick={() => go(1)}>
            <ChevronRightIcon width={26} height={26} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

/** Utilidad para el contenedor: abre el visor en un índice y lo cierra. */
export function useLightbox() {
  const [index, setIndex] = useState<number | null>(null);
  return { index, open: (i: number) => setIndex(i), close: () => setIndex(null), setIndex };
}
