// A project's brand, shared by link: the presentation read only, and criterio.md to copy or download. No session:
// the token is the proof (lib/share.ts). Not indexed, and it sends no referrer, so the address does not leak to the
// font and image hosts the page loads from.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { resolveShare, markViewed } from "@/lib/share";
import { loadShareView } from "@/lib/share-view";
import { getLocale, dictOf } from "@/lib/i18n";
import { requestOrigin } from "@/lib/share-origin";
import SharePage from "@/components/brand/SharePage";

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const share = await resolveShare(token);
  const t = dictOf(await getLocale());
  const robots = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };
  if (!share) return { title: t.brand.guidelines, robots, referrer: "no-referrer" };
  const view = await loadShareView(share.organizationId, share.projectId, share.mode, await getLocale(), `/s/${token}`, await requestOrigin());
  const title = `${view?.name ?? ""} · ${t.brand.guidelines}`;
  return { title: { absolute: title }, description: view?.system.brand?.intro.headline || view?.system.summary.slice(0, 160) || undefined, robots, referrer: "no-referrer", openGraph: { title } };
}

export default async function Page({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const share = await resolveShare(token);
  if (!share) notFound();
  const locale = await getLocale();
  const view = await loadShareView(share.organizationId, share.projectId, share.mode, locale, `/s/${token}`, await requestOrigin());
  if (!view) notFound();
  after(() => markViewed(share.id));
  return <SharePage token={token} name={view.name} system={view.system} refs={view.refs} markdown={view.markdown} />;
}
