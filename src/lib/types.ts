// Tipos del dominio. Reflejan supabase/migrations/*.sql — si cambias el esquema, actualiza aquí.

export type PropertyStatus = "borrador" | "publicada" | "reservada" | "vendida";
export type PropertyOperation = "venta" | "arriendo";
export type PropertyType =
  | "casa"
  | "departamento"
  | "parcela"
  | "terreno"
  | "cabana"
  | "local_comercial"
  | "oficina"
  | "campo";
export type PriceCurrency = "UF" | "CLP" | "USD";

export interface PropertyImage {
  id: string;
  property_id: string;
  storage_prefix: string;
  ext: "webp" | "jpg" | "avif";
  width: number;
  height: number;
  placeholder: string | null;
  alt: string | null;
  position: number;
  bytes_total: number | null;
  created_at: string;
}

export interface Property {
  id: string;
  slug: string;
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
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithImages extends Property {
  images: PropertyImage[];
}

export interface SiteSettings {
  id: 1;
  agency_name: string;
  owner_name: string | null;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  service_area: string | null;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  property_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface PropertyFilters {
  operation?: PropertyOperation;
  type?: PropertyType;
  commune?: string;
  minBedrooms?: number;
  /** Incluir vendidas/reservadas (por defecto sí, al final de la lista) */
  includeClosed?: boolean;
}
