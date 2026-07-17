import type { MetadataRoute } from "next";

const BASE = "https://kynfowk.com";

// Public marketing/legal pages only — the app surface (dashboard, calls,
// family, etc.) is auth-gated and excluded via robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${BASE}/case-studies`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/privacy`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE}/terms`, priority: 0.3, changeFrequency: "yearly" },
  ];
}
