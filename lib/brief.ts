// A project's brief: the team's words about it (what it is, for whom, what to avoid) and, for a redesign, which
// reference is the client's current site. The system and criterio.md read it. It is kept on project.brief.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { SECTORS, STYLES } from "./taxonomy";
import { AUDIENCES, BRIEF_TEXT_MAX, type Brief } from "@/types/brief";

const P = schema.project;

async function stored(organizationId: string, projectId: string): Promise<Brief | null> {
  const [row] = await db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).projectNotFound);
  return row.brief;
}
const write = (organizationId: string, projectId: string, brief: Brief) =>
  db.update(P).set({ brief, updatedAt: new Date() }).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId)));

const text = (v: unknown) => String(v ?? "").trim().slice(0, BRIEF_TEXT_MAX);
const SECTOR_KEYS = new Set(SECTORS.map((s) => s.key));
const STYLE_KEYS = new Set(STYLES.map((s) => s.key));
const AUDIENCE_KEYS = new Set<string>(AUDIENCES);
const ids = (v: unknown, max: number) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, max) : []);

/** Cleans what was sent: unknown keys drop, texts are cut, lists are capped. */
export function cleanBrief(input: Partial<Brief>, userId: string): Brief {
  const sector = typeof input.sector === "string" && SECTOR_KEYS.has(input.sector) ? input.sector : null;
  return {
    sector,
    about: text(input.about),
    audience: ids(input.audience, AUDIENCES.length).filter((k): k is Brief["audience"][number] => AUDIENCE_KEYS.has(k)),
    audienceNote: text(input.audienceNote),
    tone: ids(input.tone, 2).filter((k) => STYLE_KEYS.has(k)),
    avoidItems: ids(input.avoidItems, 50),
    avoid: text(input.avoid),
    firstSeconds: text(input.firstSeconds),
    clientItemId: typeof input.clientItemId === "string" && input.clientItemId ? input.clientItemId.slice(0, 40) : null,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
}

/** Saves the brief. What is not sent stays: the sentence alone is the usual call, the client's site is set on its own */
export async function saveBrief(organizationId: string, projectId: string, input: Partial<Brief>, userId: string): Promise<{ brief: Brief }> {
  const current = await stored(organizationId, projectId);
  const brief = cleanBrief({ ...(current ?? {}), ...input }, userId);
  await write(organizationId, projectId, brief);
  return { brief };
}

/** Marks the reference that is the client's current site (a redesign), or clears it. Only a reference filed in the project */
export async function setClientBrand(organizationId: string, projectId: string, itemId: string | null, userId: string): Promise<void> {
  const current = await stored(organizationId, projectId);
  if (itemId) {
    const PI = schema.projectItem;
    const [own] = await db.select({ id: PI.itemId }).from(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), eq(PI.itemId, itemId))).limit(1);
    if (!own) throw new HttpError(400, (await getErrors()).badBody);
  }
  const base = current ?? cleanBrief({}, userId);
  await write(organizationId, projectId, { ...base, clientItemId: itemId, updatedAt: new Date().toISOString(), updatedBy: userId });
}
