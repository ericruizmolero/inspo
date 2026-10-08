import { NextRequest } from "next/server";
import { setEmailPref, unsubscribeValid } from "@/lib/notify";

// A mail client's own unsubscribe button (List-Unsubscribe-Post, RFC 8058) posts here with the signed link's
// query. Public (proxy.ts): the signature says who asked. The page at /unsubscribe is the same for people.
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const userId = q.get("u"), kind = q.get("k"), sig = q.get("s");
  if (!unsubscribeValid(userId, kind, sig)) return Response.json({ error: "invalid" }, { status: 400 });
  await setEmailPref(userId!, kind, false);
  return Response.json({ ok: true });
}
