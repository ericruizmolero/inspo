import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import { Card } from "@/components/criterio";
import { getT, fmtDate } from "@/lib/i18n";
import { LEGAL, LEGAL_UPDATED, legalReady, legalShown } from "@/lib/legal";
import "./LegalDoc.css";

// A legal page (/privacy, /terms): public, plain sections, text from lib/i18n/<locale>/legal.ts.
// A draft until the company's details are in lib/legal.ts: 404 in production, a notice in development.
export default async function LegalDoc({ doc }: { doc: "privacy" | "terms" }) {
  if (!legalShown()) notFound();
  const { t, locale } = await getT();
  const page = t.legal[doc];
  const facts = { ...LEGAL, entity: LEGAL.entity || t.legal.pending.entity, taxId: LEGAL.taxId || t.legal.pending.taxId, address: LEGAL.address || t.legal.pending.address };
  const links = ([["privacy", "/privacy"], ["terms", "/terms"], ["extension", "/extension/privacy"]] as const).filter(([key]) => key !== doc);
  // The extension privacy page's calm column (.page, .legal): the logo, the title, then plain sections to read
  return (
    <div className="page">
      <header className="page__head">
        <Link href="/" aria-label="criterio.design"><Logo size={36} /></Link>
        <div className="page__heading">
          <h1 className="page__title">{page.title}</h1>
          <p className="page__lead t-body">{page.lead}</p>
          <p className="legal__date t-small">{t.legal.updated(fmtDate(LEGAL_UPDATED, locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }))}</p>
          {!legalReady() && <Card tone="butter" className="legal__draft t-small">{t.legal.draft}</Card>}
        </div>
      </header>
      <div className="legal">
        {page.sections(facts).map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.body.map((block, i) => typeof block === "string"
              ? <p key={i} className="t-body">{block}</p>
              : <ul key={i}>{block.map((line) => <li key={line} className="t-body">{line}</li>)}</ul>)}
          </section>
        ))}
      </div>
      <nav className="legal__links t-small">
        {links.map(([key, href]) => <Link key={key} href={href}>{t.legal.links[key]}</Link>)}
      </nav>
    </div>
  );
}
