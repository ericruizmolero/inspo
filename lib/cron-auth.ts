// Vercel Cron sends CRON_SECRET as a bearer token (vercel.json). Without the env var nothing gets in.
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Hashed first so both sides have the same length, and the compare takes the same time whatever was sent
  return timingSafeEqual(digest(req.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}
