import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/data";
import { SITE_URL } from "@/components/site/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getPublishedSlugs();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/propiedades`, changeFrequency: "daily", priority: 0.9 },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/propiedades/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
