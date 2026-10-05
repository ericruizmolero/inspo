import type { NextConfig } from "next";

// Chromium for screenshots: the binary (.br) isn't found through imports, so it has
// to be added by hand to the bundle of the routes that launch it. Without this, Vercel fails
// with "The input directory /var/task/node_modules/@sparticuz/chromium/bin does not exist".
const CHROMIUM_BIN = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const nextConfig: NextConfig = {
  // Memoizes components and hooks at build time (babel-plugin-react-compiler): the board's big client tree
  // no longer re-renders whole on a keystroke or a poll. The manual useMemo/useCallback stay; new code needn't add them.
  reactCompiler: true,
  // Development only: the bottom-left corner holds the zoom pill, so the indicator takes the free corner
  devIndicators: { position: "bottom-right" },
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
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  experimental: {
    // proxy.ts runs before every route, and Next buffers the body for it up to this size (10 MB by
    // default). Uploaded images can be 20 MB (lib/media.ts), so a bigger one would arrive cut short.
    proxyClientMaxBodySize: "21mb",
  },
  outputFileTracingIncludes: {
    "/api/shot": CHROMIUM_BIN,
    "/api/design-md": CHROMIUM_BIN,
    // A template's result page is captured the first time anyone asks for it
    "/api/templates/*/page": CHROMIUM_BIN,
    // Share card: reads the TTF fonts with readFile, which tracing doesn't see
    "/opengraph-image": ["./app/fonts/*.ttf"],
    // Login showcase: reads the folder with readdir, which tracing doesn't see
    "/login": ["./public/showcase/*"],
    "/twitter-image": ["./app/fonts/*.ttf"],
    // The extension zip is built at build time, but a regeneration at request time would read the folder again
    "/extension/download": ["./extension/chrome/**/*"],
    // Built-in templates: their folders are read with readFile the first time a workspace lists its templates
    // (lib/template-seed.ts), from the server action on the home page
    "/": ["./docs/templates/**/*"],
  },
};

export default nextConfig;
