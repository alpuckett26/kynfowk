import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  async rewrites() {
    return [
      // Apple Universal Links + Android App Links require the well-known
      // JSON files at exact paths. Next.js App Router won't route folders
      // beginning with `.` (treats them like private folders), so the
      // route handlers live at /api/well-known/* and we transparently
      // rewrite the public path.
      {
        source: "/.well-known/apple-app-site-association",
        destination: "/api/well-known/apple-app-site-association",
      },
      {
        source: "/.well-known/assetlinks.json",
        destination: "/api/well-known/assetlinks",
      },
    ];
  },
  async redirects() {
    return [
      // Permanent 308 from the old vercel.app to canonical kynfowk.com.
      // Verification only runs against the canonical domain, so a
      // blanket host-based redirect here is safe.
      {
        source: "/:path*",
        has: [{ type: "host", value: "kynfowk.vercel.app" }],
        destination: "https://kynfowk.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
