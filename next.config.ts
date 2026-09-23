import type { NextConfig } from "next";

// Chromium for screenshots: the binary (.br) isn't found through imports, so it has
// to be added by hand to the bundle of the routes that launch it. Without this, Vercel fails
// with "The input directory /var/task/node_modules/@sparticuz/chromium/bin does not exist".
const CHROMIUM_BIN = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const nextConfig: NextConfig = {
  // Settings moved under /settings (22/09/2026). Old links, bookmarks and emails keep working;
  // the query passes through.
  async redirects() {
    return [
      { source: "/equipo", destination: "/settings/members", permanent: true },
      { source: "/planes", destination: "/settings/plan", permanent: true },
      // Routes in English (23/09/2026). Invitation emails already sent keep working.
      { source: "/invitacion/:id", destination: "/invite/:id", permanent: true },
    ];
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "@libsql/client"],
  outputFileTracingIncludes: {
    "/api/shot": CHROMIUM_BIN,
    "/api/design-md": CHROMIUM_BIN,
    // Share card: reads the TTF fonts with readFile, which tracing doesn't see
    "/opengraph-image": ["./app/fonts/*.ttf"],
    // Login showcase: reads the folder with readdir, which tracing doesn't see
    "/login": ["./public/showcase/*"],
    "/twitter-image": ["./app/fonts/*.ttf"],
  },
};

export default nextConfig;
