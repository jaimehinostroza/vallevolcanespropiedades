"use client";
/**
 * Procesa cada fotografía en el navegador antes de subirla:
 *  1. Decodifica respetando la orientación EXIF (fotos de celular giradas).
 *  2. Reescala en pasos sucesivos con suavizado alto (evita el "serrucho" de reducir de golpe).
 *  3. Codifica en WebP (JPEG si el navegador no sabe WebP) con calidad alta, y si una variante
 *     supera su presupuesto de peso, baja la calidad de a poco hasta entrar (con un piso de 0.68).
 *  4. Genera tres variantes (640 / 1280 / 2048 px lado largo) + un placeholder diminuto.
 *  5. Al re-codificar se descartan los metadatos EXIF, incluida la ubicación GPS de la foto.
 * Luego sube las variantes directo a Supabase Storage (sin pasar por el servidor: no hay límite
 * de tamaño de request) y registra la foto en la tabla property_images.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_BUCKET, IMAGE_VARIANTS, type VariantName } from "./images";
import type { PropertyImage } from "./types";

const MIN_QUALITY = 0.68;
const MAX_SOURCE_BYTES = 40 * 1024 * 1024; // 40 MB: más que eso no es una foto razonable

export interface ProcessedVariant {
  name: VariantName;
  blob: Blob;
  width: number;
  height: number;
}

export interface ProcessedImage {
  variants: ProcessedVariant[];
  ext: "webp" | "jpg";
  /** Dimensiones de la variante grande (lg) */
  width: number;
  height: number;
  placeholder: string;
  bytesTotal: number;
  originalBytes: number;
}

export class ImageProcessingError extends Error {}

type Source = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Source> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageProcessingError(`"${file.name}" pesa más de 40 MB.`);
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Respaldo para navegadores que no decodifican el formato vía createImageBitmap
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new ImageProcessingError(
        `No se pudo leer "${file.name}". Si es una foto HEIC de iPhone, expórtala como JPG e inténtalo de nuevo.`,
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function dims(src: Source) {
  return "naturalWidth" in src ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new ImageProcessingError("La foto es demasiado grande para procesarla en este dispositivo.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/** Safari en iPhone no crea canvas de más de ~16,7 MP; nos mantenemos bajo ese techo. */
const MAX_CANVAS_PIXELS = 16_000_000;

function releaseCanvas(c: HTMLCanvasElement) {
  // Safari retiene la memoria de los canvas hasta que se reducen a 0×0
  c.width = 0;
  c.height = 0;
}

/** Reduce a la mitad sucesivamente hasta acercarse al tamaño final, luego el último paso exacto. */
function resize(src: Source | HTMLCanvasElement, targetW: number, targetH: number): HTMLCanvasElement {
  let current: Source | HTMLCanvasElement = src;
  let { w, h } =
    current instanceof HTMLCanvasElement ? { w: current.width, h: current.height } : dims(current as Source);

  const step = (nw: number, nh: number) => {
    const { canvas, ctx } = makeCanvas(nw, nh);
    ctx.drawImage(current, 0, 0, nw, nh);
    if (current !== src && current instanceof HTMLCanvasElement) releaseCanvas(current);
    current = canvas;
    w = nw;
    h = nh;
  };

  // Primer paso: si la mitad aún excede el techo de iOS, bajar directo hasta caber.
  if (w / 2 >= targetW && h / 2 >= targetH && (w / 2) * (h / 2) > MAX_CANVAS_PIXELS) {
    const s = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
    step(Math.max(targetW, Math.floor(w * s)), Math.max(targetH, Math.floor(h * s)));
  }
  while (w / 2 >= targetW && h / 2 >= targetH) {
    step(Math.round(w / 2), Math.round(h / 2));
  }
  const { canvas, ctx } = makeCanvas(targetW, targetH);
  ctx.fillStyle = "#fff"; // PNG con transparencia → fondo blanco en vez de negro
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(current, 0, 0, targetW, targetH);
  if (current !== src && current instanceof HTMLCanvasElement) releaseCanvas(current);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageProcessingError("No se pudo codificar la imagen."))), type, quality),
  );
}

let webpSupport: boolean | undefined;
async function supportsWebp() {
  if (webpSupport !== undefined) return webpSupport;
  const { canvas } = makeCanvas(2, 2);
  const b = await toBlob(canvas, "image/webp", 0.8).catch(() => null);
  webpSupport = b?.type === "image/webp";
  return webpSupport;
}

async function encodeWithinBudget(canvas: HTMLCanvasElement, mime: string, quality: number, maxBytes: number) {
  let q = quality;
  let blob = await toBlob(canvas, mime, q);
  while (blob.size > maxBytes && q > MIN_QUALITY) {
    q = Math.max(MIN_QUALITY, q - 0.05);
    blob = await toBlob(canvas, mime, q);
  }
  return blob;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const source = await decode(file);
  const canvases: HTMLCanvasElement[] = [];
  try {
    const { w: srcW, h: srcH } = dims(source);
    if (srcW < 200 || srcH < 200) {
      throw new ImageProcessingError(`"${file.name}" es muy pequeña (${srcW}×${srcH}). Usa fotos de al menos 1200 px.`);
    }

    const webp = await supportsWebp();
    const mime = webp ? "image/webp" : "image/jpeg";
    const ext = webp ? "webp" : "jpg";
    const srcLong = Math.max(srcW, srcH);

    // De mayor a menor: cada variante se reduce desde la anterior (más rápido y igual de nítido).
    const ordered = [...IMAGE_VARIANTS].sort((a, b) => b.longEdge - a.longEdge);
    const variants: ProcessedVariant[] = [];
    let base: Source | HTMLCanvasElement = source;

    for (const v of ordered) {
      const scale = Math.min(1, v.longEdge / srcLong); // nunca agrandar
      const w = Math.max(1, Math.round(srcW * scale));
      const h = Math.max(1, Math.round(srcH * scale));
      const canvas = resize(base, w, h);
      canvases.push(canvas);
      const blob = await encodeWithinBudget(canvas, mime, v.quality, v.maxBytes);
      variants.push({ name: v.name, blob, width: w, height: h });
      base = canvas;
    }

    // Placeholder borroso de ~24 px (se muestra mientras carga la foto real)
    const lgVariant = variants.find((v) => v.name === "lg")!;
    const phW = 24;
    const phH = Math.max(1, Math.round((lgVariant.height / lgVariant.width) * phW));
    const phCanvas = resize(base, phW, phH);
    canvases.push(phCanvas);
    const placeholder = phCanvas.toDataURL("image/jpeg", 0.5);

    return {
      variants: variants.sort(
        (a, b) => IMAGE_VARIANTS.findIndex((x) => x.name === a.name) - IMAGE_VARIANTS.findIndex((x) => x.name === b.name),
      ),
      ext,
      width: lgVariant.width,
      height: lgVariant.height,
      placeholder,
      bytesTotal: variants.reduce((s, v) => s + v.blob.size, 0),
      originalBytes: file.size,
    };
  } finally {
    if ("close" in source) source.close();
    canvases.forEach(releaseCanvas);
  }
}

export type UploadStage = "procesando" | "subiendo" | "listo";

/**
 * Procesa y sube una foto a una propiedad. Devuelve la fila creada en property_images.
 * Requiere una sesión de administradora (las políticas de Storage y RLS lo exigen).
 */
export async function uploadPropertyImage(
  supabase: SupabaseClient,
  propertyId: string,
  file: File,
  position: number,
  onStage?: (stage: UploadStage, info?: ProcessedImage) => void,
): Promise<PropertyImage> {
  onStage?.("procesando");
  const processed = await processImage(file);
  onStage?.("subiendo", processed);

  const prefix = `${propertyId}/${crypto.randomUUID()}`;
  const contentType = processed.ext === "webp" ? "image/webp" : "image/jpeg";

  const uploaded: string[] = [];
  try {
    for (const v of processed.variants) {
      const path = `${prefix}/${v.name}.${processed.ext}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, v.blob, {
        contentType,
        cacheControl: "31536000", // las rutas son únicas e inmutables: caché de un año
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(path);
    }

    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || null;
    const { data, error } = await supabase
      .from("property_images")
      .insert({
        property_id: propertyId,
        storage_prefix: prefix,
        ext: processed.ext,
        width: processed.width,
        height: processed.height,
        placeholder: processed.placeholder,
        alt,
        position,
        bytes_total: processed.bytesTotal,
      })
      .select()
      .single();
    if (error) throw error;

    onStage?.("listo", processed);
    return data as PropertyImage;
  } catch (err) {
    if (uploaded.length) await supabase.storage.from(IMAGE_BUCKET).remove(uploaded);
    throw err;
  }
}

/** Borra una foto: primero los archivos, luego la fila. */
export async function deletePropertyImage(supabase: SupabaseClient, img: Pick<PropertyImage, "id" | "storage_prefix" | "ext">) {
  const paths = IMAGE_VARIANTS.map((v) => `${img.storage_prefix}/${v.name}.${img.ext}`);
  const { error: storageError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (storageError) throw storageError;
  const { error } = await supabase.from("property_images").delete().eq("id", img.id);
  if (error) throw error;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
