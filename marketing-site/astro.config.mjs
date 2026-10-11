import { defineConfig } from "astro/config";

// Static output: Cloudflare serves ./dist as assets (wrangler.jsonc), no adapter or server needed.
export default defineConfig({
  site: "https://criterio.design",
  output: "static",
});
