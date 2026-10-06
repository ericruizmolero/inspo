// The body of a request to the token and revocation endpoints: a form (what OAuth asks for) or, from a lenient
// client, JSON. The client's credentials may come in the body or as HTTP Basic.
import "server-only";

export async function readForm(req: Request): Promise<Record<string, string | undefined>> {
  const raw = (await req.text()).slice(0, 16 * 1024);
  const out: Record<string, string | undefined> = {};
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    try { for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) if (typeof v === "string") out[k] = v; } catch { /* an empty form */ }
  } else for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
  const basic = /^Basic\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (basic) {
    try {
      const [id, ...rest] = Buffer.from(basic, "base64").toString("utf8").split(":");
      out.client_id ??= decodeURIComponent(id);
      out.client_secret ??= decodeURIComponent(rest.join(":"));
    } catch { /* not Basic credentials */ }
  }
  return out;
}
