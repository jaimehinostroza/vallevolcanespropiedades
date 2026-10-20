import type { PropertyImage } from "./types";

/**
 * Variantes que se generan al subir cada foto. El límite es sobre el lado largo,
 * así una foto vertical no termina pesando el doble que una horizontal.
 */
export const IMAGE_VARIANTS = [
  { name: "sm", longEdge: 640, quality: 0.78, maxBytes: 90_000 },
  { name: "md", longEdge: 1280, quality: 0.8, maxBytes: 260_000 },
  { name: "lg", longEdge: 2048, quality: 0.82, maxBytes: 620_000 },
] as const;

export type VariantName = (typeof IMAGE_VARIANTS)[number]["name"];

export const IMAGE_BUCKET = "property-images";

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}`;

export function imageUrl(img: Pick<PropertyImage, "storage_prefix" | "ext">, size: VariantName = "md") {
  return `${STORAGE_BASE}/${img.storage_prefix}/${size}.${img.ext}`;
}

/** Ancho real de una variante, derivado de las dimensiones guardadas (las de "lg"). */
export function variantWidth(img: Pick<PropertyImage, "width" | "height">, size: VariantName) {
  const v = IMAGE_VARIANTS.find((x) => x.name === size)!;
  const lgLong = Math.max(img.width, img.height);
  const scale = Math.min(1, v.longEdge / lgLong);
  return Math.round(img.width * scale);
}

export function imageSrcSet(img: Pick<PropertyImage, "storage_prefix" | "ext" | "width" | "height">) {
  return IMAGE_VARIANTS.map((v) => `${imageUrl(img, v.name)} ${variantWidth(img, v.name)}w`).join(", ");
}

/** Valores de `sizes` para los usos típicos del sitio. */
export const IMAGE_SIZES = {
  card: "(min-width: 1200px) 380px, (min-width: 720px) 45vw, 92vw",
  hero: "100vw",
  gallery: "(min-width: 1024px) 66vw, 100vw",
  lightbox: "100vw",
  thumb: "160px",
} as const;
