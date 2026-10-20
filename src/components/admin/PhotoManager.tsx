"use client";

import { useCallback, useEffect, useId, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  deletePropertyImage,
  formatBytes,
  ImageProcessingError,
  uploadPropertyImage,
  type ProcessedImage,
} from "@/lib/image-pipeline";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PropertyImage } from "@/lib/types";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { reorderImagesAction, revalidatePropertyAction, updateImageAltAction } from "@/app/admin/actions";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconChevronLeft, IconChevronRight, IconGrip, IconStar, IconTrash, IconUpload, IconWarn } from "./icons";
import { useToast } from "./Toast";
import styles from "./PhotoManager.module.css";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const CONCURRENCY = 2;
const MIN_LONG_EDGE = 1600;
const PERSIST_DELAY = 400;

type Stage = "espera" | "procesando" | "subiendo" | "error";
interface QueueItem {
  id: string;
  name: string;
  stage: Stage;
  error?: string;
  preview: string;
}
interface Job {
  id: string;
  file: File;
  position: number;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface DragView {
  from: number;
  over: number;
  rects: Rect[];
}
interface DragRuntime {
  pointerId: number;
  from: number;
  over: number;
  startX: number;
  startY: number;
  rects: Rect[];
  el: HTMLElement;
  settling: boolean;
}

const STAGE_TEXT: Record<Stage, string> = {
  espera: "En espera…",
  procesando: "Optimizando la foto…",
  subiendo: "Subiendo…",
  error: "No se pudo subir",
};

function friendlyError(err: unknown): string {
  if (err instanceof ImageProcessingError) return err.message;
  const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  if (/row-level security|jwt|not authorized|unauthorized|permission/i.test(msg)) {
    return "Tu sesión ya no tiene permiso. Vuelve a entrar y reintenta.";
  }
  if (/failed to fetch|network|load failed|offline/i.test(msg)) return "Se cortó la conexión. Reintenta cuando tengas internet.";
  if (/too large|maximum|exceed/i.test(msg)) return "La foto pesa demasiado. Prueba con otra más liviana.";
  return "No se pudo subir la foto. Inténtalo otra vez.";
}

const bytes = (n: number) => formatBytes(n).replace(".", ",");
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  propertyId: string;
  slug: string;
  initialImages: PropertyImage[];
}

export function PhotoManager({ propertyId, slug, initialImages }: Props) {
  const toast = useToast();
  const [images, setImages] = useState<PropertyImage[]>(initialImages);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [savings, setSavings] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<DragView | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const [toDelete, setToDelete] = useState<PropertyImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [announce, setAnnounce] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const imagesRef = useRef(images);
  const slugRef = useRef(slug);
  const jobs = useRef<Job[]>([]);
  const active = useRef(0);
  const okCount = useRef(0);
  const failCount = useRef(0);
  const nextPosition = useRef(initialImages.reduce((m, i) => Math.max(m, i.position + 1), 0));
  const previews = useRef(new Map<string, string>());
  const failedJobs = useRef(new Map<string, Job>());
  const persistTimer = useRef<number | undefined>(undefined);
  const dragRt = useRef<DragRuntime | null>(null);
  const pump = useRef<() => void>(() => {});

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  // ───────────── Subida (cola con concurrencia 2) ─────────────

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const dropPreview = useCallback((id: string) => {
    const url = previews.current.get(id);
    if (url) URL.revokeObjectURL(url);
    previews.current.delete(id);
  }, []);

  const finishBatch = useCallback(async () => {
    const ok = okCount.current;
    const fail = failCount.current;
    okCount.current = 0;
    failCount.current = 0;
    if (ok > 0) {
      const res = await revalidatePropertyAction(slugRef.current);
      if (!res.ok) toast.error(res.error);
      else toast.ok(ok === 1 ? "Foto subida" : `${ok} fotos subidas`);
    }
    if (fail > 0) toast.error(fail === 1 ? "Una foto no se pudo subir. Puedes reintentar." : `${fail} fotos no se pudieron subir. Puedes reintentar.`);
  }, [toast]);

  useEffect(() => {
    const runJob = async (job: Job) => {
      patchItem(job.id, { stage: "procesando", error: undefined });
      let info: ProcessedImage | undefined;
      try {
        const row = await uploadPropertyImage(getSupabaseBrowserClient(), propertyId, job.file, job.position, (stage, processed) => {
          if (stage === "subiendo") patchItem(job.id, { stage: "subiendo" });
          if (stage === "listo") info = processed;
        });
        setImages((prev) => [...prev, row].sort((a, b) => a.position - b.position));
        if (info) setSavings((s) => ({ ...s, [row.id]: `${bytes(info!.originalBytes)} → ${bytes(info!.bytesTotal)}` }));
        setQueue((q) => q.filter((it) => it.id !== job.id));
        dropPreview(job.id);
        okCount.current++;
      } catch (err) {
        console.error("[admin] subida de foto", err);
        patchItem(job.id, { stage: "error", error: friendlyError(err) });
        failedJobs.current.set(job.id, job);
        failCount.current++;
      } finally {
        active.current--;
        if (jobs.current.length === 0 && active.current === 0) void finishBatch();
        pump.current();
      }
    };
    pump.current = () => {
      while (active.current < CONCURRENCY && jobs.current.length > 0) {
        const job = jobs.current.shift()!;
        active.current++;
        void runJob(job);
      }
    };
  }, [propertyId, patchItem, dropPreview, finishBatch]);

  const enqueue = useCallback(
    (list: File[]) => {
      const valid = list.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
      if (valid.length < list.length) toast.error("Solo se pueden subir fotos (JPG, PNG, WebP o HEIC).");
      if (!valid.length) return;
      const newItems: QueueItem[] = [];
      for (const file of valid) {
        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);
        previews.current.set(id, preview);
        jobs.current.push({ id, file, position: nextPosition.current++ });
        newItems.push({ id, name: file.name, stage: "espera", preview });
      }
      setQueue((q) => [...q, ...newItems]);
      pump.current();
    },
    [toast],
  );

  const retryItem = (item: QueueItem) => {
    const job = failedJobs.current.get(item.id);
    if (!job) return;
    failedJobs.current.delete(item.id);
    patchItem(item.id, { stage: "espera", error: undefined });
    jobs.current.push(job);
    pump.current();
  };

  const removeFailed = (item: QueueItem) => {
    failedJobs.current.delete(item.id);
    setQueue((q) => q.filter((it) => it.id !== item.id));
    dropPreview(item.id);
  };

  // Limpieza al salir: liberar vistas previas y guardar el orden pendiente
  useEffect(() => {
    const map = previews.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
      map.clear();
    };
  }, []);

  // ───────────── Orden ─────────────

  const persistNow = useCallback(async () => {
    persistTimer.current = undefined;
    const ids = imagesRef.current.map((i) => i.id);
    const res = await reorderImagesAction(propertyId, slugRef.current, ids);
    if (res.ok) toast.ok("Orden guardado");
    else toast.error(res.error);
  }, [propertyId, toast]);

  useEffect(() => {
    return () => {
      if (persistTimer.current !== undefined) {
        window.clearTimeout(persistTimer.current);
        void reorderImagesAction(propertyId, slugRef.current, imagesRef.current.map((i) => i.id));
      }
    };
  }, [propertyId]);

  const commitOrder = useCallback(
    (next: PropertyImage[]) => {
      const renumbered = next.map((img, i) => ({ ...img, position: i }));
      imagesRef.current = renumbered;
      setImages(renumbered);
      window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => void persistNow(), PERSIST_DELAY);
    },
    [persistNow],
  );

  const move = (from: number, to: number, focusAct?: "before" | "after" | "cover") => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = images.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commitOrder(next);
    setAnnounce(to === 0 ? "Foto movida al primer lugar: es la portada" : `Foto movida al lugar ${to + 1} de ${next.length}`);
    // El foco sigue a la foto movida (sin animación: es una acción de teclado)
    requestAnimationFrame(() => {
      const root = gridRef.current?.querySelector(`[data-id="${item.id}"]`);
      const pick = (a: string) => root?.querySelector<HTMLButtonElement>(`[data-act="${a}"]:not(:disabled)`);
      (pick(focusAct ?? "after") ?? pick("before") ?? pick("after"))?.focus();
    });
  };

  // ───────────── Arrastrar con puntero propio ─────────────

  const measure = (): Rect[] => {
    const lis = gridRef.current?.querySelectorAll<HTMLElement>(":scope > li[data-id]") ?? [];
    return Array.from(lis).map((li) => {
      const r = li.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    });
  };

  const overIndex = (rects: Rect[], px: number, py: number) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
      const d = (px - (r.x + r.w / 2)) ** 2 + (py - (r.y + r.h / 2)) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const onDragStart = (e: PointerEvent<HTMLElement>, index: number) => {
    if (dragRt.current) return; // ignora un segundo dedo mientras se arrastra
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget.closest<HTMLElement>("li[data-id]");
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rects = measure();
    dragRt.current = {
      pointerId: e.pointerId,
      from: index,
      over: index,
      startX: e.clientX + window.scrollX,
      startY: e.clientY + window.scrollY,
      rects,
      el,
      settling: false,
    };
    el.style.transition = "none";
    setDrag({ from: index, over: index, rects });
  };

  const onDragMove = (e: PointerEvent<HTMLElement>) => {
    const d = dragRt.current;
    if (!d || d.settling || e.pointerId !== d.pointerId) return;
    const px = e.clientX + window.scrollX;
    const py = e.clientY + window.scrollY;
    d.el.style.transform = `translate3d(${px - d.startX}px, ${py - d.startY}px, 0) scale(1.03)`;
    const over = overIndex(d.rects, px, py);
    if (over !== d.over) {
      d.over = over;
      setDrag((v) => (v ? { ...v, over } : v));
    }
    // Acercarse al borde de la pantalla desplaza la página
    if (e.clientY < 80) window.scrollBy(0, -16);
    else if (e.clientY > window.innerHeight - 80) window.scrollBy(0, 16);
  };

  const endDrag = (e: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = dragRt.current;
    if (!d || d.settling || e.pointerId !== d.pointerId) return;
    d.settling = true;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const target = cancelled ? d.from : d.over;
    const slot = d.rects[target];
    const own = d.rects[d.from];
    const finish = () => {
      d.el.style.transition = "";
      d.el.style.transform = "";
      dragRt.current = null;
      setDrag(null);
      if (!cancelled && target !== d.from) {
        const next = imagesRef.current.slice();
        const [item] = next.splice(d.from, 1);
        next.splice(target, 0, item);
        commitOrder(next);
        setAnnounce(target === 0 ? "Foto movida al primer lugar: es la portada" : `Foto movida al lugar ${target + 1} de ${next.length}`);
      }
    };
    if (reducedMotion()) return finish();
    // La foto "se asienta" en su casilla antes de confirmar el nuevo orden
    d.el.style.transition = "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)";
    d.el.style.transform = `translate3d(${slot.x - own.x}px, ${slot.y - own.y}px, 0)`;
    window.setTimeout(finish, 185);
  };

  // ───────────── Borrar y textos ─────────────

  const confirmDelete = async () => {
    const img = toDelete;
    if (!img) return;
    setDeleting(true);
    try {
      await deletePropertyImage(getSupabaseBrowserClient(), img);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      setSavings(({ [img.id]: _gone, ...rest }) => (void _gone, rest));
      setToDelete(null);
      const res = await revalidatePropertyAction(slugRef.current);
      if (res.ok) toast.ok("Foto eliminada");
      else toast.error(res.error);
    } catch (err) {
      console.error("[admin] borrar foto", err);
      toast.error("No pudimos eliminar la foto. Inténtalo otra vez.");
    } finally {
      setDeleting(false);
    }
  };

  const saveAlt = async (img: PropertyImage, alt: string) => {
    const res = await updateImageAltAction(img.id, slugRef.current, alt);
    if (res.ok) {
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, alt: alt.trim() || null } : i)));
      toast.ok("Guardado");
    } else toast.error(res.error);
  };

  // ───────────── Soltar archivos ─────────────

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDropOver(false);
    enqueue(Array.from(e.dataTransfer.files));
  };

  // Posición visual de cada tarjeta mientras se arrastra
  const shiftFor = (i: number): { x: number; y: number } | null => {
    if (!drag || i === drag.from) return null;
    let slot = i;
    if (drag.from < drag.over && i > drag.from && i <= drag.over) slot = i - 1;
    else if (drag.from > drag.over && i >= drag.over && i < drag.from) slot = i + 1;
    if (slot === i) return null;
    return { x: drag.rects[slot].x - drag.rects[i].x, y: drag.rects[slot].y - drag.rects[i].y };
  };

  return (
    <section className={styles.wrap} aria-labelledby="photos-title" id="fotos">
      <header className={styles.head}>
        <div>
          <h2 id="photos-title" className={styles.title}>
            Fotografías
          </h2>
          <p className={styles.sub}>
            La primera foto es la <strong>portada</strong>: la que se ve en el listado y arriba de la propiedad.
          </p>
        </div>
      </header>

      <div
        className={styles.drop}
        data-over={dropOver}
        onDragEnter={(e) => hasFiles(e) && (e.preventDefault(), setDropOver(true))}
        onDragOver={(e) => hasFiles(e) && (e.preventDefault(), setDropOver(true))}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
        }}
        onDrop={onDrop}
      >
        <IconUpload width={28} height={28} />
        <p className={styles.dropText}>
          <span className={styles.dropDesktop}>Arrastra las fotos hasta aquí o</span>
          <span className={styles.dropMobile}>Elige las fotos desde tu galería</span>
        </p>
        <button type="button" className="btn btn--forest" onClick={() => fileInput.current?.click()} style={{ minHeight: 48 }}>
          Agregar fotos
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Elegir fotos"
          onChange={(e) => {
            enqueue(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <p className={styles.dropHint}>JPG, PNG, WebP o HEIC. Se achican solas para que el sitio cargue rápido.</p>
      </div>

      {queue.length > 0 && (
        <ul className={styles.queue} aria-label="Fotos en proceso">
          {queue.map((it) => (
            <li key={it.id} className={styles.qItem} data-stage={it.stage}>
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
              <img src={it.preview} alt="" className={styles.qThumb} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              <div className={styles.qBody}>
                <p className={styles.qName}>{it.name}</p>
                <p className={styles.qStage} role={it.stage === "error" ? "alert" : undefined}>
                  {it.stage === "error" ? it.error : STAGE_TEXT[it.stage]}
                </p>
                {it.stage !== "error" && <span className={styles.bar} data-active={it.stage !== "espera"} aria-hidden="true" />}
              </div>
              {it.stage === "error" && (
                <div className={styles.qActions}>
                  <button type="button" className="btn btn--ghost" onClick={() => retryItem(it)}>
                    Reintentar
                  </button>
                  <button type="button" className={styles.link} onClick={() => removeFailed(it)}>
                    Quitar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {images.length === 0 && queue.length === 0 ? (
        <p className={styles.empty}>Todavía no hay fotos. Una buena portada hace que quieran ver el resto.</p>
      ) : (
        <ul ref={gridRef} className={styles.grid} data-dragging={drag !== null} aria-label="Fotos de la propiedad">
          {images.map((img, i) => (
            <PhotoCard
              key={img.id}
              img={img}
              index={i}
              total={images.length}
              saving={savings[img.id]}
              dragging={drag?.from === i}
              shift={shiftFor(i)}
              onMove={move}
              onDelete={() => setToDelete(img)}
              onSaveAlt={saveAlt}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={endDrag}
            />
          ))}
        </ul>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </p>

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar esta foto?"
        confirmLabel="Sí, eliminar"
        danger
        pending={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>La foto se borrará de la propiedad y del sitio. No se puede deshacer.</p>
      </ConfirmDialog>
    </section>
  );
}

interface CardProps {
  img: PropertyImage;
  index: number;
  total: number;
  saving?: string;
  dragging: boolean;
  shift: { x: number; y: number } | null;
  onMove: (from: number, to: number, act?: "before" | "after" | "cover") => void;
  onDelete: () => void;
  onSaveAlt: (img: PropertyImage, alt: string) => Promise<void>;
  onDragStart: (e: PointerEvent<HTMLElement>, index: number) => void;
  onDragMove: (e: PointerEvent<HTMLElement>) => void;
  onDragEnd: (e: PointerEvent<HTMLElement>, cancelled: boolean) => void;
}

function PhotoCard({ img, index, total, saving, dragging, shift, onMove, onDelete, onSaveAlt, onDragStart, onDragMove, onDragEnd }: CardProps) {
  const altId = useId();
  const [alt, setAlt] = useState(img.alt ?? "");
  const isCover = index === 0;
  const small = Math.max(img.width, img.height) < MIN_LONG_EDGE;
  const portrait = img.height > img.width;

  return (
    <li
      className={styles.card}
      data-id={img.id}
      data-dragging={dragging}
      data-shifted={shift !== null}
      style={shift ? { transform: `translate3d(${shift.x}px, ${shift.y}px, 0)` } : undefined}
    >
      <div className={styles.photoWrap}>
        <PropertyPhoto image={img} sizes="(min-width: 900px) 240px, 90vw" aspectRatio="4 / 3" alt="" />
        {isCover && <span className={styles.cover}>Portada</span>}
        <div
          className={styles.handle}
          aria-hidden="true"
          title="Arrastra para cambiar el orden"
          onPointerDown={(e) => onDragStart(e, index)}
          onPointerMove={onDragMove}
          onPointerUp={(e) => onDragEnd(e, false)}
          onPointerCancel={(e) => onDragEnd(e, true)}
        >
          <IconGrip width={20} height={20} />
        </div>
        <span className={styles.pos} aria-hidden="true">
          {index + 1}
        </span>
      </div>

      <div className={styles.tools} role="group" aria-label={`Foto ${index + 1} de ${total}`}>
        <button type="button" className={styles.tool} data-act="before" onClick={() => onMove(index, index - 1, "before")} disabled={index === 0} aria-label={`Mover la foto ${index + 1} antes`}>
          <IconChevronLeft width={20} height={20} />
        </button>
        <button type="button" className={styles.tool} data-act="after" onClick={() => onMove(index, index + 1, "after")} disabled={index === total - 1} aria-label={`Mover la foto ${index + 1} después`}>
          <IconChevronRight width={20} height={20} />
        </button>
        <button
          type="button"
          className={`${styles.tool} ${styles.toolWide}`}
          data-act="cover"
          onClick={() => onMove(index, 0, "after")}
          disabled={isCover}
          aria-label={`Usar la foto ${index + 1} como portada`}
        >
          <IconStar width={18} height={18} /> <span>Portada</span>
        </button>
        <button type="button" className={`${styles.tool} ${styles.toolDanger}`} data-act="delete" onClick={onDelete} aria-label={`Eliminar la foto ${index + 1}`}>
          <IconTrash width={18} height={18} />
        </button>
      </div>

      <div className={styles.altField}>
        <label htmlFor={altId} className={styles.altLabel}>
          Descripción de la foto
        </label>
        <input
          id={altId}
          className={styles.altInput}
          value={alt}
          maxLength={200}
          placeholder="Ej.: Living con vista al lago"
          enterKeyHint="done"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => {
            if (alt.trim() !== (img.alt ?? "")) void onSaveAlt(img, alt);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>

      {(small || portrait || saving) && (
        <div className={styles.notes}>
          {small && (
            <p className={styles.warn}>
              <IconWarn width={16} height={16} /> Foto pequeña ({Math.max(img.width, img.height)} px): se verá menos nítida
              {isCover ? " en la portada" : ""}.
            </p>
          )}
          {portrait && (
            <p className={styles.warn}>
              <IconWarn width={16} height={16} /> Foto vertical: se recortará{isCover ? " en la portada" : " en las vistas anchas"}.
            </p>
          )}
          {saving && <p className={styles.saving}>Optimizada: {saving}</p>}
        </div>
      )}
    </li>
  );
}
