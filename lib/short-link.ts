// The short address of one reference: /i/<code> in place of /i/<item>?in=<project>, which ran to 83 characters once
// pasted (Eric, 11-11: "es larguísimo"). "Copy link" asks for it (shortLinkOf, app/actions/library.ts) and
// app/(library)/i/[id]/page.tsx reads it back: a person is sent on to the long address, a preview app reads the
// reference's card under the short one. One code per reference and place, so copying twice gives the same link.
//
// With no session the code is the secret a preview app comes with, as the item's id was: ten letters and digits
// (about 59 bits), never fewer.
import "server-only";
import { randomInt } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";

const T = schema.shortLink;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LENGTH = 10;
/** What a short code looks like: an item's own id is 24 characters, so the two never read as each other */
export const SHORT_CODE = /^[A-Za-z0-9]{10}$/;
/** A `?in=` worth keeping: a project's id or "inbox" */
const INSIDE = /^[\w-]{1,64}$/;

const newCode = () => Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** The code of a reference in a place (`?in=`), made the first time it is asked for. The caller has already checked
 *  that the person may see the reference */
export async function shortCodeFor(itemId: string, inside: string | null | undefined, by: string): Promise<string> {
  const where = inside && INSIDE.test(inside) ? inside : "";
  const same = and(eq(T.itemId, itemId), eq(T.inside, where));
  const [had] = await db.select({ code: T.code }).from(T).where(same).limit(1);
  if (had) return had.code;
  // Two copies at once: the second insert does nothing and reads the first one's code
  await db.insert(T).values({ code: newCode(), itemId, inside: where, createdBy: by }).onConflictDoNothing({ target: [T.itemId, T.inside] });
  const [made] = await db.select({ code: T.code }).from(T).where(same).limit(1);
  if (!made) throw new Error("short link not saved");
  return made.code;
}

/** What a code stands for, or null: the reference and where it was copied ("" for nowhere) */
export async function resolveShort(code: string): Promise<{ itemId: string; inside: string } | null> {
  if (!SHORT_CODE.test(code)) return null;
  const [row] = await db.select({ itemId: T.itemId, inside: T.inside }).from(T).where(eq(T.code, code)).limit(1);
  return row ?? null;
}
