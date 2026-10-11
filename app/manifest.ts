import type { MetadataRoute } from "next";

// The colors are Board's --board (app/globals.css): the theme a first visit opens in
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "criterio.design",
    short_name: "Criterio",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F0F",
    theme_color: "#0F0F0F",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
