import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import { isPreviewBot } from "@/lib/preview-bots";
import { sharedItem, previewImageOf, hostOf, captionOf, CARD } from "@/lib/share-card";
import { SITE } from "@/lib/site";

// The library's server actions run here: an add tags its item after answering (app/actions/library.ts)
export const maxDuration = 300;

const fromPreviewApp = async () => isPreviewBot((await headers()).get("user-agent"));

// A pasted link draws the reference as its card in Telegram, WhatsApp, Slack or X: its picture, and as the title
// the note under the card ("Eric: …"), or its name when nobody wrote one (lib/share-card.ts). Only for those apps; a person's tab gets its title from the open panel (hooks/use-panel-route.ts).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  if (!(await fromPreviewApp())) return {};
  const item = await sharedItem((await params).id);
  if (!item) return {};
  const [{ t }, image] = await Promise.all([getT(), previewImageOf(item)]);
  const host = hostOf(item);
  const description = t.meta.sharedRef(host);
  const title = captionOf(item) ?? item.name;
  // With no picture of its own (a text, a pin) it keeps the app's card
  const images = [{ url: image ?? "/opengraph-image", ...(image && !image.startsWith("/") ? {} : CARD), alt: item.name }];
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "website", siteName: "criterio.design", url: `${SITE}/i/${item.id}`, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

// A shared link to one inspiration's DESIGN.md. The library (the layout) reads the path and opens it.
export default async function InspoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSession())) {
    // A preview app only reads the metadata above
    if (await fromPreviewApp()) return null;
    redirect(`/login?next=${encodeURIComponent(`/i/${id}`)}`);
  }
  return null;
}
