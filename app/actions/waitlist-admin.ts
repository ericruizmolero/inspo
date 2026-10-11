"use server";
// /admin/waitlist: priorities, waves, loose invites, revoke and resend. The logic is lib/waves.ts, shared with
// scripts/access.ts; this file checks what the browser sends.
import { createInvite, normalEmail } from "@/lib/access";
import { inviteLink, mailInvite, nextByPriority, openWave, revokeInvite, rotateInvite, setPriority, WAVE_CAP } from "@/lib/waves";
import { isPlanKey } from "@/lib/plans";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { log } from "@/lib/log";
import { appBase, asAdmin } from "@/lib/admin-action";

const isId = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length < 100;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function setWaitlistPriority(entryId: string, priority: number) {
  return asAdmin(async () => {
    if (!isId(entryId) || !Number.isSafeInteger(priority) || Math.abs(priority) > 1_000_000) throw new HttpError(400, (await getErrors()).badPriority);
    await setPriority(entryId, priority);
  });
}

export type WavePick = { ids: string[] } | { next: number };

async function pickedIds(pick: WavePick): Promise<{ ids?: string[]; n: number }> {
  const e = await getErrors();
  if ("ids" in pick) {
    const ids = Array.isArray(pick.ids) ? [...new Set(pick.ids.filter(isId))] : [];
    if (!ids.length || ids.length > WAVE_CAP) throw new HttpError(400, e.waveSize);
    return { ids, n: ids.length };
  }
  if (!Number.isInteger(pick.next) || pick.next < 1 || pick.next > WAVE_CAP) throw new HttpError(400, e.waveSize);
  return { n: pick.next };
}

/** Exactly who the wave would mail: the picked people still waiting, in queue order. */
export async function previewWave(pick: WavePick) {
  return asAdmin(async () => {
    const { ids, n } = await pickedIds(pick);
    return nextByPriority(n, ids);
  });
}

/** Sends the wave to the people the preview showed. Codes stay on the server; a failed mail is resent from the list. */
export async function sendWave(entryIds: string[], o: { wave: string; grantsPlan: string | null; grantsUntil: string | null }) {
  return asAdmin(async (s) => {
    const e = await getErrors();
    const { ids } = await pickedIds({ ids: entryIds });
    const wave = typeof o.wave === "string" ? o.wave.trim().slice(0, 80) : "";
    if (!wave) throw new HttpError(400, e.waveName);
    const grantsPlan = o.grantsPlan && isPlanKey(o.grantsPlan) && o.grantsPlan !== "free" ? o.grantsPlan : null;
    const until = grantsPlan && o.grantsUntil ? new Date(`${o.grantsUntil}T23:59:59Z`) : null;
    if (until && Number.isNaN(until.getTime())) throw new HttpError(400, e.badBody);
    const results = await openWave(ids!, { wave, grantsPlan, grantsUntil: until }, await appBase());
    log.info("admin.wave_sent", { wave, by: s.user.id, sent: results.filter((r) => r.status === "sent").length, failed: results.filter((r) => r.status === "failed").length });
    return results.map((r) => ({ entryId: r.entryId, email: r.email, status: r.status }));
  });
}

/** A link for someone not on the list. Shown once: only its hash is kept. */
export async function makeLooseInvite(o: { email: string | null; uses: number; mail: boolean }) {
  return asAdmin(async () => {
    const e = await getErrors();
    const email = o.email?.trim() ? normalEmail(o.email) : null;
    if (email && !EMAIL.test(email)) throw new HttpError(400, e.badEmail);
    if (!Number.isInteger(o.uses) || o.uses < 1 || o.uses > 1000) throw new HttpError(400, e.badUses);
    const base = await appBase();
    const { code } = await createInvite({ email, maxUses: o.uses });
    let mailed = false;
    if (email && o.mail) {
      try { await mailInvite(email, code, base); mailed = true; }
      catch (err) { log.warn("admin.invite_mail_not_sent", { err }); }
    }
    return { link: inviteLink(base, code), mailed };
  });
}

export async function revokeTeamInvite(inviteId: string) {
  return asAdmin(async () => {
    if (!isId(inviteId) || !(await revokeInvite(inviteId))) throw new HttpError(409, (await getErrors()).inviteSpent);
  });
}

/** A new code and the mail with it: the old link stops working. */
export async function resendInvite(inviteId: string) {
  return asAdmin(async () => {
    const rotated = isId(inviteId) ? await rotateInvite(inviteId) : null;
    if (!rotated) throw new HttpError(409, (await getErrors()).inviteSpent);
    try { await mailInvite(rotated.email, rotated.code, await appBase()); return { mailed: true }; }
    catch (err) { log.warn("admin.invite_mail_not_sent", { err }); return { mailed: false }; }
  });
}
