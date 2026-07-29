import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/availability",
        "/calls",
        "/dashboard",
        "/family",
        "/notifications",
        "/onboarding",
        "/phonebook",
        "/settings",
        "/upgrade",
      ],
    },
    sitemap: "https://kynfowk.com/sitemap.xml",
  };
}
