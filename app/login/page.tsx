import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";
import { showcaseImages } from "@/lib/showcase";
import LoginForm from "@/components/LoginForm";
import { DEV_LOGIN_EMAIL, SOCIAL_PROVIDERS } from "@/lib/auth";
import { getT, type Dict } from "@/lib/i18n";
import { Fragment } from "react";
import Logo from "@/components/Logo";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.login.pageTitle };
}

/** Headlines carry a deliberate line break: in the dictionary it is a \n. */
const lines = (s: string) => s.split("\n").map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>);

const IcBack = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" />
  </svg>
);

// Messages for the error codes Better Auth returns to /login?error=… with
function loginError(code: string | undefined, t: Dict): string | undefined {
  switch (code) {
    case undefined: case "": return undefined;
    case "INVALID_TOKEN": case "EXPIRED_TOKEN": return t.login.errors.expired;
    case "access_denied": case "user_cancelled_authorize": return t.login.errors.cancelled;
    case "account_not_linked": case "email_doesn't_match": return t.login.errors.notLinked;
    case "email_not_found": return t.login.errors.noEmail;
    case "signup_disabled": return t.login.errors.signupDisabled;
    default: return t.login.errors.generic;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const { t } = await getT();
  if (await getSession()) redirect(next && next.startsWith("/") ? next : "/");
  // Someone arriving from an invitation needs to know what they are joining and with which email
  const fromInvitation = (next ?? "").startsWith("/invite/");
  // If they come from the start canvas with a URL (?next=/?add=…), the headline says so
  const pendingDomain = (() => {
    try {
      const add = new URL(next ?? "", "http://x").searchParams.get("add");
      return add ? new URL(add).hostname.replace(/^www\./, "") : "";
    } catch { return ""; }
  })();
  // Side panel: the fixed images from public/showcase, always 3 columns of 6. If there are fewer
  // they repeat to fill; with none, text.
  const found = await showcaseImages();
  const covers = found.length ? Array.from({ length: 18 }, (_, i) => found[i % found.length]) : [];
  const cols = covers.length ? [0, 1, 2].map((c) => covers.filter((_, i) => i % 3 === c)) : null;

  return (
    <div className="auth">
      <section className="auth__panel">
        <header className="auth__top">
          <span className="auth__brand">
            <Logo size={36} />
            <span className="auth__by">savvia.studio</span>
          </span>
          <Link href="/" className="auth__back">{IcBack} {t.common.back}</Link>
        </header>

        <div className="auth__card">
          <LoginForm
            next={next}
            lead={lines(fromInvitation ? t.login.leadInvitation : pendingDomain ? t.login.leadPending(pendingDomain) : t.login.leadDefault)}
            hint={fromInvitation ? t.login.hintInvitation : pendingDomain ? t.login.hintPending : t.login.hintDefault}
            initialError={loginError(error, t)}
            devEmail={DEV_LOGIN_EMAIL || undefined}
            providers={SOCIAL_PROVIDERS}
          />
        </div>

        <footer className="auth__foot">
          <span>{t.login.firstTime}</span>
        </footer>
      </section>

      <aside className="auth__visual" aria-hidden>
        {cols ? (
          <>
            <div className="collage">
              {cols.map((col, ci) => (
                <div key={ci} className="collage__col">
                  {col.map((src, i) => <img key={i} src={src} alt="" loading="lazy" decoding="async" />)}
                </div>
              ))}
            </div>
            <div className="auth__visual-caption">
              <span className="display">{t.login.latest}</span>
              <span>{t.login.latestSub}</span>
            </div>
          </>
        ) : (
          <div className="auth__visual-empty">
            <Logo size={88} />
            <span>{t.login.visualEmpty}</span>
          </div>
        )}
      </aside>
    </div>
  );
}
