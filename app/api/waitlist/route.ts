// The marketing site's waitlist form (criterio.design's home and /landing/) posts here across origins. Public, so
// only the marketing site's origin is let in, and every accepted request gets the same 200: new, already on the
// list, already an account or caught by the honeypot. The answer never says whether an address is signed up.
import { enlist, mayEnlist, parseEmail } from "@/lib/access";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locale";
import { MARKETING_URL } from "@/lib/site";

const MARKETING_ORIGIN = new URL(MARKETING_URL).origin;
// `astro dev` and `astro preview` serve the marketing site on localhost
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  return origin === MARKETING_ORIGIN || (process.env.NODE_ENV !== "production" && DEV_ORIGIN.test(origin));
}

type Signup =
  | { kind: "person"; email: string; locale: Locale }
  /** The hidden `website` field came filled: a bot */
  | { kind: "bot" }
  | { kind: "invalid"; error: "email" | "consent" };

function parse(body: unknown): Signup {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) return { kind: "bot" };
  const email = parseEmail(b.email);
  if (!email) return { kind: "invalid", error: "email" };
  if (b.consent !== true) return { kind: "invalid", error: "consent" };
  return { kind: "person", email, locale: isLocale(b.locale) ? b.locale : DEFAULT_LOCALE };
}

const cors = (origin: string) => ({ "Access-Control-Allow-Origin": origin, Vary: "Origin" });
const refused = () => Response.json({ ok: false, error: "origin" }, { status: 403, headers: { Vary: "Origin" } });

export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  if (!allowedOrigin(origin)) return refused();
  return new Response(null, {
    status: 204,
    headers: { ...cors(origin), "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" },
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!allowedOrigin(origin)) return refused();
  const answer = (status: number, body: object) => Response.json(body, { status, headers: cors(origin) });

  if (!(await mayEnlist(req.headers))) return answer(429, { ok: false, error: "too_many" });
  const signup = parse(await req.json().catch(() => null));
  if (signup.kind === "invalid") return answer(400, { ok: false, error: signup.error });
  if (signup.kind === "person") await enlist({ email: signup.email, locale: signup.locale, source: "landing" });
  return answer(200, { ok: true });
}
