import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/config";
import { SERVICES } from "@/lib/site/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/work`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/studio`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE.url}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.8 },
    { url: `${SITE.url}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const services: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${SITE.url}/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const legal: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/refund-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/cookie-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [...core, ...services, ...legal];
}
