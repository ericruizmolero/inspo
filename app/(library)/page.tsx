import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { marketingHref } from "@/lib/site";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCtx, getSession } from "@/lib/workspace";
import GuestStart from "@/components/GuestStart";
import { getSignupMode } from "@/lib/access";
import { getLocale } from "@/lib/i18n";
import { exampleCriterioMd } from "@/lib/example-md";

const P = schema.project;

// The library's server actions run here: an add tags its item after answering (app/actions/library.ts)
export const maxDuration = 300;

// With a session the library is the layout; this page only adds the guest start.
// A guest who arrives with ?add=<url> (the marketing site's "Save to Criterio") signs in first and comes back with it
export default async function Home({ searchParams }: { searchParams: Promise<{ add?: string; in?: string; view?: string; moved?: string }> }) {
  const { add, in: place, view, moved } = await searchParams;
  if (await getSession()) {
    // An address to a project in another of this person's workspaces: /p/ moves there first. `moved` ends it if that failed
    if (place && !moved) {
      const ctx = await getCtx();
      const [project] = await db.select({ organizationId: P.organizationId }).from(P).where(and(eq(P.id, place), inArray(P.organizationId, ctx.workspaces.map((w) => w.id)))).limit(1);
      if (project && project.organizationId !== ctx.workspace.id) redirect(`/p/${encodeURIComponent(place)}${view ? `?view=${encodeURIComponent(view)}` : "?view=board"}`);
    }
    return null;
  }
  if (add) redirect(`/login?next=${encodeURIComponent(`/?add=${encodeURIComponent(add)}`)}`);
  const locale = await getLocale();
  // The guest home is the marketing landing page (06/11). Only with no session cookie at all: a stale one keeps the
  // "signed in" hint, and the marketing site would send that browser straight back here
  if (!getSessionCookie(await headers())) redirect(marketingHref("/", locale));
  const mode = await getSignupMode();
  return <GuestStart inviteOnly={mode === "invite"} example={exampleCriterioMd(locale)} />;
}
