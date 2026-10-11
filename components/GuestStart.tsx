"use client";

import { useRouter } from "next/navigation";
import EmptyStart from "./EmptyStart";
import { useT } from "./I18nProvider";
import { Button, TipWindow } from "@/components/criterio";
import Logo from "@/components/Logo";
import ThemeToggle from "./ThemeToggle";
import { PLANS, isPaid, planOf } from "@/lib/plans";
import { fmtCount, fmtPrice } from "@/lib/i18n/format";
import { marketingHref } from "@/lib/site";
import type { ExampleMd } from "@/lib/example-md";

const FREE = planOf("free");
const FROM = Math.min(...PLANS.filter(isPaid).map((p) => p.price.month));

/**
 * Signed-out home page: the same start canvas a new user sees, without the sidebar.
 * Pasting a URL goes to /login carrying the URL; back from the link, the site saves itself (?add=).
 */
export default function GuestStart({ inviteOnly, example }: { inviteOnly: boolean; example: ExampleMd }) {
  const router = useRouter();
  const { t, locale } = useT();
  // A board goes the same way: back from login, ?add= sees it is a board and imports it
  const signIn = (web: string) => router.push(`/login?next=${encodeURIComponent(`/?add=${encodeURIComponent(web)}`)}`);

  return (
    <div className="guest">
      <header className="guest__bar">
        <Logo />
        {inviteOnly && <span className="guest__note t-small">{t.login.inviteOnlyShort}</span>}
        <Button size="s" href="/login">{t.common.signIn}</Button>
      </header>

      <EmptyStart
        onAddUrl={async (web) => { signIn(web); }}
        onImportBoard={async (input) => { signIn(input.trim()); return null; }}
        lead={t.guest.what}
      >
        <p className="guest__cost t-small">
          {t.guest.cost(t.plans.items.free.name, fmtCount(FREE.aiActionsPerMonth ?? 0, locale), fmtCount(FREE.itemsMax ?? 0, locale), fmtPrice(FROM, locale))}{" "}
          {/* Every plan, side by side, is on the marketing site */}
          <a href={marketingHref("/pricing/", locale)}>{t.sidebar.seePlans}</a>
        </p>
        <figure className="guest__example">
          <figcaption className="t-small">{t.guest.example}</figcaption>
          <TipWindow title="criterio.md" onClose={false} className="guest__window">
            <pre className="guest__md" tabIndex={0} aria-label={example.name}>{example.md}</pre>
          </TipWindow>
        </figure>
      </EmptyStart>

      {/* The theme is a preference, so it is here before signing in too (Eric, 07-10) */}
      <ThemeToggle />
    </div>
  );
}
