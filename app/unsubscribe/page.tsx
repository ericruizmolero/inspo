import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { getT } from "@/lib/i18n";
import { setEmailPref, unsubscribeValid } from "@/lib/notify";
import ResubscribeButton from "./ResubscribeButton";

// The one-click link at the foot of a team email (lib/notify.ts). Public (proxy.ts): no sign-in, the signature
// in the link is the proof. Opening it turns that kind of email off at once; the page says so and offers the way back.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.unsubscribe.title.digest };
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; k?: string; s?: string }> }) {
  const [{ u, k, s }, { t }] = await Promise.all([searchParams, getT()]);
  const valid = unsubscribeValid(u, k, s);
  if (valid) await setEmailPref(u!, k, false);
  const kind = valid ? k : null;
  return (
    <div className="page">
      <header className="page__head">
        <Link href="/" aria-label="criterio.design"><Logo size={36} /></Link>
        <div className="page__heading">
          <h1 className="page__title">{kind ? t.unsubscribe.title[kind] : t.unsubscribe.invalid}</h1>
          <p className="page__lead t-body">{kind ? t.unsubscribe.lead[kind] : t.unsubscribe.invalidLead}</p>
        </div>
      </header>
      {kind ? <ResubscribeButton userId={u!} kind={kind} sig={s!} /> : <Link className="cr-btn cr-btn-m" href="/settings/account">{t.unsubscribe.account}</Link>}
    </div>
  );
}
