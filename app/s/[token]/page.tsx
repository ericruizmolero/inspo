// A project's board, shared by link: the references the team chose, for people outside it to comment on and choose
// from (lib/share-board.ts, lib/share-guests.ts). No session: the token is the proof (lib/share.ts), the general
// address or an invited person's own. Not indexed, and it sends no referrer, so the address does not leak to the image
// hosts the page loads from. The link shares the board only: not criterio.md, not the brand (Eric, 06-11).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { resolveShare, markViewed } from "@/lib/share";
import { loadShareBoard } from "@/lib/share-board";
import { shareActivity } from "@/lib/share-guests";
import { getLocale, dictOf } from "@/lib/i18n";
import SharePage from "@/components/brand/SharePage";

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const share = await resolveShare(token);
  const t = dictOf(await getLocale());
  const robots = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };
  if (!share) return { title: t.brand.guidelines, robots, referrer: "no-referrer" };
  const board = await loadShareBoard(share, `/s/${token}`);
  const title = board?.name ?? t.brand.guidelines;
  // Pasted in a chat, the link speaks of the project, not of the app (Eric, 10-11): its subtitle, or how many
  // references it holds; and the picture of the first one, through the link
  const description = share.subtitle || (board ? t.brand.share.preview(board.items.length, title) : title);
  const first = board?.items.find((i) => board.thumbs[i.web] || board.shots[i.web] || board.cards[i.web]);
  const image = first && board ? board.cards[first.web] ?? board.thumbs[first.web] ?? board.shots[first.web]?.tileUrl : undefined;
  const images = image ? [{ url: image }] : undefined;
  return {
    title: { absolute: title }, description, robots, referrer: "no-referrer",
    openGraph: { title, description, siteName: title, type: "website", ...(images ? { images } : {}) },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, ...(images ? { images } : {}) },
  };
}

export default async function Page({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const share = await resolveShare(token);
  if (!share) notFound();
  const [board, activity] = await Promise.all([loadShareBoard(share, `/s/${token}`), shareActivity(share)]);
  if (!board) notFound();
  after(() => markViewed(share));
  const { name, keys: _keys, ...data } = board;
  return <SharePage token={token} name={name} subtitle={share.subtitle} board={data} activity={activity}
    guest={share.guest ? { key: share.guest.key, name: share.guest.name } : null} />;
}
