import { defineConfig } from "astro/config";

// Static output: Cloudflare serves ./dist as assets (wrangler.jsonc), no adapter or server needed.
export default defineConfig({
  site: "https://criterio.design",
  output: "static",
  // video/ is where the home video is recorded and rendered: thousands of frames written there must not reload the page being recorded
  vite: { server: { watch: { ignored: ["**/video/**"] } } },
});
