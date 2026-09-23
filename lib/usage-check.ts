// Daily reconciliation with OpenRouter (#28): what we logged today against what OpenRouter
// says it billed our key today. If they differ by more than 1%, alert by email.
import "server-only";
import { totalCostSince } from "./usage";
import { fixedAdmins } from "./activity";
import { sendMail } from "./mail";

/** Below one cent the difference is rounding noise, not a bug */
const MIN_GAP_USD = 0.01;

/** Relative difference between our figure and the bill. null if they match. */
export function drift(ours: number, billed: number): number | null {
  const gap = Math.abs(ours - billed);
  if (gap < MIN_GAP_USD) return null;
  const rel = gap / Math.max(billed, ours);
  return rel > 0.01 ? rel : null;
}

export async function checkUsage(): Promise<{ ours: number; billed: number; drift: number | null }> {
  // Both figures are read at the same moment and cover the same span: since 00:00 UTC.
  // That way it doesn't matter what time of day the cron runs it.
  const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
  const [ours, res] = await Promise.all([
    totalCostSince(midnight),
    fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } }),
  ]);
  if (!res.ok) throw new Error(`OpenRouter /key ${res.status}`);
  const billed = Number((await res.json())?.data?.usage_daily ?? 0);
  const d = drift(ours, billed);

  if (d !== null) {
    const line = `Today (UTC) we logged $${ours.toFixed(4)} and OpenRouter billed $${billed.toFixed(4)}: a ${(d * 100).toFixed(1)}% difference.`;
    console.error(`usage-check: ${line}`);
    const why = "It's usually a call that skips recordUsage, a row without a real cost (cost_source = estimated) or someone using the same key outside production.";
    await sendMail(fixedAdmins(), "AI spend doesn't match OpenRouter", `<p>${line}</p><p>${why}</p>`, `${line}\n\n${why}`);
  }
  return { ours, billed, drift: d };
}
