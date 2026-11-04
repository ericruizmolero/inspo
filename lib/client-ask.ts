// A link that asks a client the project's open questions, with no account. The token in the address is the proof, and
// it opens answers only: nothing of the project is shown but its name and those questions. A press of Send saves them
// with source "client" and sends the one who asked one email. The file does not change: that person starts any new pass.
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { saveAnswer } from "./brief";
import { allow } from "./rate-limit";
import { setupFacts } from "./setup";
import { setupState } from "./setup-core";
import { questionById, questionText } from "./playbook-questions";
import { sendMail, clientAnswersMail } from "./mail";
import { inBackground } from "./notify";
import { APP_URL } from "./auth";
import { BRIEF_LIMITS } from "@/types/brief";
import { toLocale, type Locale } from "./i18n/locale";

const A = schema.clientAsk, P = schema.project, U = schema.user;
const SENDS_PER_HOUR = 10;

export type { ClientAskView } from "./client-ask-core";
import type { ClientAskView } from "./client-ask-core";

/** The live link for a project: one at a time, so asking twice sends the same address */
export async function clientAskToken(organizationId: string, projectId: string, userId: string): Promise<string> {
  const [live] = await db.select({ token: A.token }).from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId), isNull(A.revokedAt), isNull(A.answeredAt))).orderBy(desc(A.createdAt)).limit(1);
  if (live) return live.token;
  const [project] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!project) throw new Error("No project");
  const token = randomBytes(16).toString("base64url");
  await db.insert(A).values({ id: newId(), token, organizationId, projectId, createdBy: userId, createdAt: new Date() });
  return token;
}

async function live(token: string) {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [row] = await db.select().from(A).where(and(eq(A.token, token), isNull(A.revokedAt))).limit(1);
  return row ?? null;
}

const openOf = async (organizationId: string, projectId: string) => setupState(await setupFacts(organizationId, projectId)).ask;

/** What the page shows. Null: the link is unknown or turned off. No questions: they were answered, here or elsewhere */
export async function clientAskView(token: string, locale: Locale): Promise<ClientAskView | null> {
  const row = await live(token);
  if (!row) return null;
  const [project] = await db.select({ name: P.name }).from(P).where(eq(P.id, row.projectId)).limit(1);
  if (!project) return null;
  if (row.answeredAt) return { project: project.name, questions: [] };
  const ids = await openOf(row.organizationId, row.projectId);
  return { project: project.name, questions: ids.flatMap((id) => { const q = questionById(id); return q ? [{ id, text: questionText(q, locale, false) }] : []; }) };
}

/** Saves what the client wrote, only for questions still open, and tells the one who asked, once */
export async function submitClientAnswers(token: string, answers: Record<string, unknown>): Promise<"saved" | "gone" | "limited"> {
  const row = await live(token);
  if (!row || row.answeredAt) return "gone";
  if (!(await allow(`client-ask:${row.id}`, SENDS_PER_HOUR, 3_600_000))) return "limited";
  const open = new Set(await openOf(row.organizationId, row.projectId));
  const given = Object.entries(answers).flatMap(([id, v]) => {
    const text = typeof v === "string" ? v.trim().slice(0, BRIEF_LIMITS.answer) : "";
    return open.has(id) && text ? [{ id, text }] : [];
  });
  if (!given.length) return "saved";
  for (const a of given) await saveAnswer(row.organizationId, row.projectId, a.id, { text: a.text, by: "Client", source: "client" }, row.createdBy ?? "client");
  await db.update(A).set({ answeredAt: new Date() }).where(eq(A.id, row.id));
  inBackground(async () => {
    if (!row.createdBy) return;
    const [[who], [project]] = await Promise.all([
      db.select({ email: U.email, language: U.language }).from(U).where(eq(U.id, row.createdBy)).limit(1),
      db.select({ name: P.name }).from(P).where(eq(P.id, row.projectId)).limit(1),
    ]);
    if (who && project) await sendMail(who.email, clientAnswersMail({ project: project.name, n: given.length, url: `${APP_URL}/p/${encodeURIComponent(row.projectId)}` }, toLocale(who.language)));
  });
  return "saved";
}
