/** URL pública del sitio, sin barra final. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.vallevolcanespropiedades.cl").replace(
  /\/+$/,
  "",
);

/** Separa un texto largo en párrafos (línea en blanco = nuevo párrafo). */
export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Número para `tel:` a partir de un teléfono libre. */
export function telHref(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 6 ? `tel:${digits}` : null;
}
