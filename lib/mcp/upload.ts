// A link an agent uploads pictures to, from its own shell: a capture is far too big to go through the model as
// base64 (a 1 MB screenshot is hundreds of thousands of tokens), so upload_link hands out an address and the
// agent sends each file there with curl (app/api/mcp/upload/[token]/route.ts). The link is signed, not stored:
// it names the person, the project and the app, lasts UPLOAD_MINUTES and takes UPLOAD_FILES files.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError, listWorkspaces } from "../workspace-core";
import { toLocale } from "../i18n/locale";
import { REF_ROLES, type RefRole } from "@/types/suggestions";
import type { McpCtx } from "./auth";
import { resolveProject } from "./pieces";

export const UPLOAD_MINUTES = 30;
export const UPLOAD_FILES = 30;
/** What reaches the function: Vercel stops a body at 4.5 MB before the route sees it */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

interface Grant { u: string; p: string; v: string; s?: 1; r?: RefRole; x: number }

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is not set");
  return s ?? "dev-secret";
}
const sign = (body: string) => createHmac("sha256", secret()).update(`mcp-upload|${body}`).digest("base64url").slice(0, 32);

/** The link for one project, as the person who asked, signed with the app on the other end */
export async function uploadLink(ctx: McpCtx, origin: string, input: { project: string; suggested?: boolean; role?: RefRole }) {
  const project = await resolveProject(ctx, input.project);
  const grant: Grant = { u: ctx.user.id, p: project.id, v: ctx.via, ...(input.suggested ? { s: 1 as const } : {}), ...(input.role ? { r: input.role } : {}), x: Date.now() + UPLOAD_MINUTES * 60_000 };
  const body = Buffer.from(JSON.stringify(grant)).toString("base64url");
  const url = `${origin}/api/mcp/upload/${body}.${sign(body)}`;
  return {
    project: project.name, upload_url: url, expires_in_minutes: UPLOAD_MINUTES, files: UPLOAD_FILES,
    how: `One POST per picture, the file as the body, its name and why it is there in the query: curl -sS --data-binary @capture.png -H "Content-Type: image/png" "${url}?title=Hero%20we%20liked&note=Why%20it%20is%20here&areas=layout,typography"`,
    limits: `PNG, WebP or JPEG, at most ${UPLOAD_MAX_BYTES / 1024 / 1024} MB each: scale a bigger one down first (on a Mac: sips -Z 2400 in.png --out out.png). The answer of each POST is the reference saved, with its id.`,
    do: input.suggested
      ? "Each picture waits on the board, marked as yours, for the team's yes or no. Tell the person in a line what you left."
      : "Each picture goes on the board at once, signed with the person's name. Tell the person in a line what you saved.",
    no_shell: "If you cannot run commands, ask the person to drag the pictures onto the project's board in the app instead, and give them the note for each.",
  };
}

/** The link's grant, or an HttpError saying why it no longer holds */
export function readUploadToken(token: string): Grant & { id: string } {
  const [body, sig] = token.split(".");
  const want = body ? sign(body) : "";
  if (!body || !sig || sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) throw new HttpError(403, "This upload link is not valid. Ask for a new one with upload_link.");
  let grant: Grant;
  try { grant = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Grant; } catch { throw new HttpError(403, "This upload link is not valid. Ask for a new one with upload_link."); }
  if (!grant.u || !grant.p || !(grant.x > Date.now())) throw new HttpError(410, "This upload link has expired. Ask for a new one with upload_link.");
  if (grant.r && !(REF_ROLES as readonly string[]).includes(grant.r)) delete grant.r;
  return { ...grant, id: sig };
}

/** The person behind a link, as the connector would see them now: a member who left the workspace finds nothing */
export async function ctxOfGrant(grant: Grant): Promise<McpCtx> {
  const U = schema.user;
  const [u] = await db.select({ id: U.id, name: U.name, email: U.email, image: U.image, language: U.language }).from(U).where(eq(U.id, grant.u)).limit(1);
  if (!u) throw new HttpError(403, "This upload link is not valid. Ask for a new one with upload_link.");
  return { user: { ...u, language: toLocale(u.language) }, workspaces: await listWorkspaces(u.id), via: grant.v || "MCP" };
}
