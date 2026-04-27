import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  async redirects() {
    return [
      // Permanent 308 redirect from the old vercel.app domain to the
      // canonical kynfowk.com. Universal-link verification on iOS
      // requires NO redirect on /.well-known/* paths, so we exclude
      // them via a `not host` ... actually Vercel handles the AASA
      // path on the canonical domain only — verification only ever
      // runs against kynfowk.com, never the vercel.app alias, so a
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
