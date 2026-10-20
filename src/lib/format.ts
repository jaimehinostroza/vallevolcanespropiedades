import type { PriceCurrency, PropertyOperation, PropertyStatus, PropertyType } from "./types";

export const TYPE_LABELS: Record<PropertyType, string> = {
  casa: "Casa",
  departamento: "Departamento",
  parcela: "Parcela",
  terreno: "Terreno",
  cabana: "Cabaña",
  local_comercial: "Local comercial",
  oficina: "Oficina",
  campo: "Campo",
};

export const OPERATION_LABELS: Record<PropertyOperation, string> = {
  venta: "Venta",
  arriendo: "Arriendo",
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  reservada: "Reservada",
  vendida: "Vendida",
};

const nf = (digits = 0) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** "UF 8.500" · "$ 320.000.000" · "US$ 450.000" · "Precio a consultar" */
export function formatPrice(price: number | null, currency: PriceCurrency) {
  if (price == null) return "Precio a consultar";
  switch (currency) {
    case "UF":
      return `UF ${nf(2).format(price)}`;
    case "CLP":
      return `$ ${nf().format(price)}`;
    case "USD":
      return `US$ ${nf().format(price)}`;
  }
}

/** "1.250 m²" · "5.000 m²" · "2,5 ha" para superficies de 1 ha o más */
export function formatArea(m2: number | null) {
  if (m2 == null) return null;
  if (m2 >= 10_000) return `${nf(2).format(m2 / 10_000)} ha`;
  return `${nf(1).format(m2)} m²`;
}

/** Convierte un título en slug para la URL: "Casa en Ensenada" → "casa-en-ensenada" */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Enlace de WhatsApp con mensaje prellenado. `number` solo dígitos con código país. */
export function whatsappLink(number: string | null | undefined, message?: string) {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
