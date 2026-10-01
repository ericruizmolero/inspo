// Applies pending migrations during a Vercel build (vercel.json, buildCommand), before next build.
// Each environment has its own database: the preview build migrates the Neon preview branch, the
// production build migrates production. A migration that fails fails the build, so a deploy never
// goes live on a schema it doesn't expect.
//
// Neon can take a while to wake a suspended compute, and the first connection may time out: a few
// tries before giving up. Drizzle runs the pending migrations in one transaction, so a retry after
// a failure starts from a clean state.
import { runMigrations } from "../lib/db/migrate";

const TRIES = 3;

async function main() {
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL?.trim() ?? "")) {
    throw new Error("DATABASE_URL is not a postgres:// URL: set it for this environment in Vercel");
  }
  for (let attempt = 1; ; attempt++) {
    try {
      await runMigrations();
      console.log("Schema up to date");
      return;
    } catch (e) {
      if (attempt === TRIES) throw e;
      console.warn(`Migration attempt ${attempt} failed (${(e as Error).message}), trying again`);
      await new Promise((r) => setTimeout(r, 5_000 * attempt));
    }
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
