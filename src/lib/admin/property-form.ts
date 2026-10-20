// Validación y tipos del formulario de propiedad. Sin dependencias de servidor: lo usan
// tanto la Server Action como el formulario (para valores iniciales y tipos).
import type { PriceCurrency, PropertyOperation, PropertyStatus, PropertyType } from "@/lib/types";
import { OPERATION_LABELS, STATUS_LABELS, TYPE_LABELS, slugify } from "@/lib/format";

export const COMMUNES = [
  "Puerto Varas",
  "Llanquihue",
  "Frutillar",
  "Ensenada",
  "Puerto Montt",
  "Fresia",
  "Los Muermos",
  "Cochamó",
] as const;

export const CURRENCIES: PriceCurrency[] = ["UF", "CLP", "USD"];

/** Ruta pública de una propiedad (la define el sitio público). */
export const publicPropertyPath = (slug: string) => `/propiedades/${slug}`;

export type FieldName =
  | "title"
  | "slug"
  | "status"
  | "operation"
  | "property_type"
  | "price"
  | "currency"
  | "commune"
  | "sector"
  | "address"
  | "latitude"
  | "longitude"
  | "bedrooms"
  | "bathrooms"
  | "parking"
  | "built_m2"
  | "land_m2"
  | "year_built"
  | "summary"
  | "description"
  | "features"
  | "email"
  | "password"
  | "agency_name"
  | "owner_name"
  | "tagline"
  | "about"
  | "phone"
  | "whatsapp"
  | "instagram"
  | "service_area";

export type FieldErrors = Partial<Record<FieldName | "form", string>>;

export interface FormState {
  ok: boolean;
  message?: string;
  errors: FieldErrors;
  /** Valores enviados, para no perder lo escrito cuando hay errores */
  values?: Record<string, string>;
  /** Cambia en cada guardado correcto (para mostrar un aviso una sola vez) */
  savedAt?: number;
}

export const EMPTY_STATE: FormState = { ok: false, errors: {} };

/** Números como los escribe una persona en Chile: "8.500", "8,5", "1.250,75". */
export function parseLocaleNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}

/** Coordenadas: punto o coma como decimal, sin separador de miles. */
function parseCoordinate(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}

export interface PropertyRow {
  title: string;
  status: PropertyStatus;
  operation: PropertyOperation;
  property_type: PropertyType;
  price: number | null;
  currency: PriceCurrency;
  commune: string;
  sector: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  built_m2: number | null;
  land_m2: number | null;
  parking: number | null;
  year_built: number | null;
  summary: string | null;
  description: string | null;
  features: string[];
  featured: boolean;
}

export interface ParsedProperty {
  row: PropertyRow;
  /** Dirección web pedida (ya normalizada); puede chocar con otra, el servidor resuelve */
  slugBase: string;
  errors: FieldErrors;
  values: Record<string, string>;
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export function parseProperty(fd: FormData): ParsedProperty {
  const errors: FieldErrors = {};
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "features") values[k] = v;
  const features = fd
    .getAll("features")
    .filter((v): v is string => typeof v === "string")
    .map((f) => f.trim())
    .filter(Boolean);
  values.features = JSON.stringify(features);

  const title = str(fd, "title");
  if (title.length < 3) errors.title = "Escribe un título de al menos 3 letras.";
  else if (title.length > 140) errors.title = "El título es muy largo (máximo 140 letras).";

  let slugBase = slugify(str(fd, "slug") || title);
  if (!slugBase && !errors.title) {
    errors.slug = "Usa letras o números en la dirección web.";
  }
  if (slugBase.length < 1) slugBase = "propiedad";

  const intent = str(fd, "intent");
  let status = str(fd, "status") as PropertyStatus;
  if (intent === "publicar") status = "publicada";
  if (!(status in STATUS_LABELS)) {
    errors.status = "Elige el estado de la propiedad.";
    status = "borrador";
  }

  const operation = str(fd, "operation") as PropertyOperation;
  if (!(operation in OPERATION_LABELS)) errors.operation = "Elige si es venta o arriendo.";
  const property_type = str(fd, "property_type") as PropertyType;
  if (!(property_type in TYPE_LABELS)) errors.property_type = "Elige el tipo de propiedad.";
  const currency = str(fd, "currency") as PriceCurrency;
  if (!CURRENCIES.includes(currency)) errors.currency = "Elige la moneda.";

  let price: number | null = null;
  const priceRaw = str(fd, "price");
  if (priceRaw) {
    price = parseLocaleNumber(priceRaw);
    if (price == null || Number.isNaN(price)) errors.price = "Escribe solo números, por ejemplo 8500 o 8.500,5.";
    else if (price < 0) errors.price = "El precio no puede ser negativo.";
    else if (price >= 1e12) errors.price = "Ese precio es demasiado alto.";
  }

  const commune = str(fd, "commune");
  if (!commune) errors.commune = "Indica la comuna.";
  else if (commune.length > 80) errors.commune = "El nombre de la comuna es muy largo.";

  const coord = (k: "latitude" | "longitude", min: number, max: number, label: string) => {
    const raw = str(fd, k);
    if (!raw) return null;
    const n = parseCoordinate(raw);
    if (n == null || Number.isNaN(n)) {
      errors[k] = `La ${label} debe ser un número, por ejemplo -41.3185.`;
      return null;
    }
    if (n < min || n > max) {
      errors[k] = `La ${label} debe estar entre ${min} y ${max}.`;
      return null;
    }
    return n;
  };
  const latitude = coord("latitude", -90, 90, "latitud");
  const longitude = coord("longitude", -180, 180, "longitud");
  if ((latitude == null) !== (longitude == null) && !errors.latitude && !errors.longitude) {
    errors[latitude == null ? "latitude" : "longitude"] = "Completa latitud y longitud juntas, o deja ambas vacías.";
  }

  const int = (k: "bedrooms" | "bathrooms" | "parking", label: string) => {
    const raw = str(fd, k);
    if (!raw) return null;
    const n = parseLocaleNumber(raw);
    if (n == null || Number.isNaN(n) || !Number.isInteger(n) || n < 0 || n > 999) {
      errors[k] = `${label}: escribe un número entero, desde 0.`;
      return null;
    }
    return n;
  };
  const bedrooms = int("bedrooms", "Dormitorios");
  const bathrooms = int("bathrooms", "Baños");
  const parking = int("parking", "Estacionamientos");

  const area = (k: "built_m2" | "land_m2", label: string) => {
    const raw = str(fd, k);
    if (!raw) return null;
    const n = parseLocaleNumber(raw);
    if (n == null || Number.isNaN(n) || n < 0 || n >= 1e10) {
      errors[k] = `${label}: escribe un número desde 0.`;
      return null;
    }
    return n;
  };
  const built_m2 = area("built_m2", "Superficie construida");
  const land_m2 = area("land_m2", "Superficie del terreno");

  let year_built: number | null = null;
  const yearRaw = str(fd, "year_built");
  if (yearRaw) {
    const n = Number(yearRaw);
    if (!Number.isInteger(n) || n < 1850 || n > 2100) errors.year_built = "El año debe estar entre 1850 y 2100.";
    else year_built = n;
  }

  const summary = str(fd, "summary");
  if (summary.length > 280) errors.summary = `El resumen tiene ${summary.length} letras; el máximo es 280.`;

  if (features.length > 40) errors.features = "Son demasiadas características (máximo 40).";
  if (features.some((f) => f.length > 60)) errors.features = "Cada característica debe ser corta (máximo 60 letras).";

  return {
    slugBase,
    errors,
    values,
    row: {
      title,
      status,
      operation,
      property_type,
      price,
      currency,
      commune,
      sector: str(fd, "sector") || null,
      address: str(fd, "address") || null,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      built_m2,
      land_m2,
      parking,
      year_built,
      summary: summary || null,
      description: str(fd, "description") || null,
      features: [...new Set(features)],
      featured: fd.get("featured") === "on",
    },
  };
}

/** Elige una dirección web libre: base, base-2, base-3… */
export function pickFreeSlug(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

// ───────── Ajustes del sitio ─────────

export interface ParsedSettings {
  row: Record<string, string | null>;
  errors: FieldErrors;
  values: Record<string, string>;
}

export function parseSettings(fd: FormData): ParsedSettings {
  const errors: FieldErrors = {};
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") values[k] = v;

  const agency_name = str(fd, "agency_name");
  if (agency_name.length < 2) errors.agency_name = "Escribe el nombre de la corredora.";

  const whatsappRaw = str(fd, "whatsapp");
  const whatsapp = whatsappRaw.replace(/[\s+()-]/g, "");
  if (whatsapp && !/^\d{9,15}$/.test(whatsapp)) {
    errors.whatsapp = "Escribe solo números, con 56 al inicio. Ejemplo: 56912345678.";
  } else if (whatsapp && !whatsapp.startsWith("56")) {
    errors.whatsapp = "El número debe partir con 56 (código de Chile). Ejemplo: 56912345678.";
  }

  const email = str(fd, "email");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Revisa el correo: parece incompleto.";

  const instagram = str(fd, "instagram")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?].*$/, "")
    .replace(/^@/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    errors.instagram = "Escribe solo el nombre de usuario, sin espacios. Ejemplo: vallevolcanespropiedades.";
  }

  const opt = (k: string, max: number, label: string) => {
    const v = str(fd, k);
    if (v.length > max) errors[k as FieldName] = `${label} es muy largo (máximo ${max} letras).`;
    return v || null;
  };

  return {
    errors,
    values,
    row: {
      agency_name,
      owner_name: opt("owner_name", 120, "El nombre"),
      tagline: opt("tagline", 160, "La frase principal"),
      about: opt("about", 4000, "El texto"),
      phone: opt("phone", 40, "El teléfono"),
      whatsapp: whatsapp || null,
      email: email || null,
      instagram: instagram || null,
      address: opt("address", 200, "La dirección"),
      service_area: opt("service_area", 200, "La zona de servicio"),
    },
  };
}
