import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";
import type { PropertyFilters, PropertyWithImages, SiteSettings } from "./types";
import { DEMO_PROPERTIES, DEMO_SETTINGS } from "./demo-data";

/**
 * DEMO_DATA=1 sirve datos de ejemplo sin consultar Supabase (para desarrollar sin conexión
 * o revisar el diseño). Nunca activar en producción.
 */
const DEMO = process.env.DEMO_DATA === "1";

function demoFilter(filters: PropertyFilters): PropertyWithImages[] {
  return DEMO_PROPERTIES.filter(
    (p) =>
      p.status !== "borrador" &&
      (!filters.operation || p.operation === filters.operation) &&
      (!filters.type || p.property_type === filters.type) &&
      (!filters.commune || p.commune === filters.commune) &&
      (!filters.minBedrooms || (p.bedrooms ?? 0) >= filters.minBedrooms) &&
      (filters.includeClosed !== false || p.status === "publicada"),
  );
}

/**
 * Lecturas públicas cacheadas. Se invalidan desde el panel con updateTag(TAGS.properties) o
 * updateTag(TAGS.settings) después de cada cambio, así el sitio se actualiza al instante
 * pero cada visita normal se sirve desde caché (rápido y sin consultar la base).
 */
export const TAGS = {
  properties: "properties",
  property: (slug: string) => `property:${slug}`,
  settings: "settings",
} as const;

const SELECT_WITH_IMAGES = "*, images:property_images(*)";

function sortImages(p: PropertyWithImages): PropertyWithImages {
  return { ...p, images: [...(p.images ?? [])].sort((a, b) => a.position - b.position) };
}

const STATUS_RANK: Record<string, number> = { publicada: 0, reservada: 1, vendida: 2 };

export async function getProperties(filters: PropertyFilters = {}): Promise<PropertyWithImages[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);

  if (DEMO) return demoFilter(filters).map(sortImages);

  const supabase = createPublicClient();
  let q = supabase.from("properties").select(SELECT_WITH_IMAGES).neq("status", "borrador");
  if (filters.operation) q = q.eq("operation", filters.operation);
  if (filters.type) q = q.eq("property_type", filters.type);
  if (filters.commune) q = q.eq("commune", filters.commune);
  if (filters.minBedrooms) q = q.gte("bedrooms", filters.minBedrooms);
  if (filters.includeClosed === false) q = q.eq("status", "publicada");

  const { data, error } = await q
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });
  if (error) throw error;

  return (data as PropertyWithImages[])
    .map(sortImages)
    .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9));
}

export async function getFeaturedProperties(limit = 6): Promise<PropertyWithImages[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);

  const all = await getProperties({ includeClosed: false });
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}

export async function getPropertyBySlug(slug: string): Promise<PropertyWithImages | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties, TAGS.property(slug));

  if (DEMO) return DEMO_PROPERTIES.find((p) => p.slug === slug && p.status !== "borrador") ?? null;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(SELECT_WITH_IMAGES)
    .eq("slug", slug)
    .neq("status", "borrador")
    .maybeSingle();
  if (error) throw error;
  return data ? sortImages(data as PropertyWithImages) : null;
}

export async function getPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);

  if (DEMO) return demoFilter({}).map((p) => p.slug);

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("properties").select("slug").neq("status", "borrador");
  if (error) throw error;
  return (data ?? []).map((r) => r.slug as string);
}

/** Comunas con propiedades publicadas (para el filtro del catálogo). */
export async function getCommunes(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);

  const all = await getProperties();
  return [...new Set(all.map((p) => p.commune))].sort((a, b) => a.localeCompare(b, "es"));
}

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.settings);

  if (DEMO) return DEMO_SETTINGS;

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as SiteSettings;
}
