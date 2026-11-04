// A project's open questions, sent to a client. No session: the token is the proof (lib/client-ask.ts). Not indexed,
// and it sends no referrer, so the address does not leak.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clientAskView } from "@/lib/client-ask";
import { dictOf, getLocale } from "@/lib/i18n";
import ClientAsk from "@/components/ClientAsk";

export async function generateMetadata(): Promise<Metadata> {
  const t = dictOf(await getLocale());
  return { title: t.clientAsk.title, robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }, referrer: "no-referrer" };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await clientAskView(token, await getLocale());
  if (!view) notFound();
  return <ClientAsk token={token} view={view} />;
}
