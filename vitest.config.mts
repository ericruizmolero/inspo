import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

/** A "use client" module, seen from the server, is only a reference, as Next makes it: a component named after
 *  its export that renders nothing. A page's tree then says which client component it would hand which props. */
const clientReferences: Plugin = {
  name: "client-references",
  transform(code, id) {
    if (!/^\s*["']use client["']/.test(code)) return;
    const stub = (name: string) => `function ${name}() { return null; }`;
    const named = [...code.matchAll(/^export (?:async )?(?:function|const|let|class) (\w+)/gm)].map((m) => m[1]);
    const listed = [...code.matchAll(/^export \{([^}]+)\}/gm)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()!)).filter(Boolean);
    const lines = [...new Set([...named, ...listed])].filter((n) => n !== "default").map((n) => `export ${stub(n)}`);
    if (/^export default/m.test(code)) lines.push(`export default ${stub(basename(id).replace(/\.\w+$/, "").replace(/\W/g, "_"))}`);
    return { code: lines.join("\n"), map: null };
  },
};

export default defineConfig({
  plugins: [clientReferences],
  resolve: { alias: [{ find: /^@\//, replacement: root }] },
  // Server code imports "server-only" and React's server build, as the tsx check scripts do
  ssr: { resolve: { conditions: ["react-server", "node"], externalConditions: ["react-server"] } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    execArgv: ["--conditions=react-server"],
    // One database for every file: run them one after another
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
