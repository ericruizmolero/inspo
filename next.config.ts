import type { NextConfig } from "next";

// Chromium para las capturas: el binario (.br) no se descubre por imports, así que hay
// que meterlo a mano en el bundle de las rutas que lo lanzan. Sin esto, en Vercel falla
// con "The input directory /var/task/node_modules/@sparticuz/chromium/bin does not exist".
const CHROMIUM_BIN = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "@libsql/client"],
  outputFileTracingIncludes: {
    "/api/shot": CHROMIUM_BIN,
    "/api/design-md": CHROMIUM_BIN,
  },
};

export default nextConfig;
