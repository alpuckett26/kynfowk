import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kynfowk",
    short_name: "Kynfowk",
    description:
      "A warm family coordination app for scheduling calls, sharing availability, and keeping up your Family Connections rhythm.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fcf7f1",
    theme_color: "#c7663f",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
