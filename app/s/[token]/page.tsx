// A project's board, shared by link: read only, as the team sees it (lib/share-board.ts). No session: the token is
// the proof (lib/share.ts). Not indexed, and it sends no referrer, so the address does not leak to the image hosts
// the page loads from. The link shares the board only: not criterio.md, not the brand (Eric, 06-11).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { resolveShare, markViewed } from "@/lib/share";
import { loadShareBoard } from "@/lib/share-board";
import { getLocale, dictOf } from "@/lib/i18n";
import SharePage from "@/components/brand/SharePage";

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const share = await resolveShare(token);
  const t = dictOf(await getLocale());
  const robots = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };
  if (!share) return { title: t.brand.guidelines, robots, referrer: "no-referrer" };
  const board = await loadShareBoard(share.organizationId, share.projectId, share.mode, `/s/${token}`);
  const title = board?.name ?? t.brand.guidelines;
  return { title: { absolute: title }, robots, referrer: "no-referrer", openGraph: { title } };
}

export default async function Page({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const share = await resolveShare(token);
  if (!share) notFound();
  const board = await loadShareBoard(share.organizationId, share.projectId, share.mode, `/s/${token}`);
  if (!board) notFound();
  after(() => markViewed(share.id));
  const { name, keys: _keys, ...data } = board;
  return <SharePage token={token} name={name} board={data} />;
}
