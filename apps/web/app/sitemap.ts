import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com";
  const lastModified = new Date();

  return [
    { url: `${baseUrl}/`, lastModified, priority: 1.0 },
    { url: `${baseUrl}/case-studies`, lastModified, priority: 0.8 },
    { url: `${baseUrl}/dashboard`, lastModified, priority: 0.6 },
    { url: `${baseUrl}/insights`, lastModified, priority: 0.5 },
  ];
}
