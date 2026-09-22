"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { SocialProvider } from "@/lib/auth";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const IcArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" />
  </svg>
);
const IcMail = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3.5 7.5L12 13l8.5-5.5" />
  </svg>
);

const IcGoogle = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3c-.5-1.5-.5-3.1 0-4.6V6.6H1.2a12 12 0 000 10.8l4.1-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
  </svg>
);
const IcApple = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.4 12.7c0-2.5 2.1-3.7 2.2-3.8-1.2-1.7-3-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.3zM13.9 5.2c.7-.8 1.2-2 1-3.2-1 0-2.2.7-3 1.5-.6.7-1.2 1.9-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z" />
  </svg>
);
const IcX = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9.1L1 2h7l4.8 6.4L18.2 2zm-1.2 18h1.9L7.1 3.9H5.1L17 20z" />
  </svg>
);

const SOCIAL: Record<SocialProvider, { label: string; icon: React.ReactNode }> = {
  google: { label: "Google", icon: IcGoogle },
  apple: { label: "Apple", icon: IcApple },
  twitter: { label: "X", icon: IcX },
};

const devLoginHref = (next: string) => `/api/dev-login?next=${encodeURIComponent(next.startsWith("/login") ? "/" : next)}`;

/**
 * Formulario de acceso por magic link. Lo usan la página /login y la ventana
 * que salta al hacer la primera acción como invitado (LoginGate).
 * - `next`: ruta a la que volver tras entrar (por defecto, la actual).
 * - `lead`/`hint`: titular y ayuda; si no se pasan, se usan los genéricos.
 * - `providers`: botones de Google / Apple / X que se pintan (los que tienen claves en el servidor).
 */
export default function LoginForm({ next, initialError, lead, hint, autoFocus = true, devEmail, providers = [] }: {
  next?: string; initialError?: string; lead?: React.ReactNode; hint?: React.ReactNode; autoFocus?: boolean;
  /** Solo en desarrollo: correo que entra sin pasar por el buzón (DEV_LOGIN_EMAIL) */
  devEmail?: string;
  providers?: SocialProvider[];
}) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState<SocialProvider | null>(null);
  const [error, setError] = useState(initialError ?? "");
  // Cookie que deja el plugin lastLoginMethod al entrar: "google" | "apple" | "twitter" | "magic-link"
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  useEffect(() => setLastUsed(authClient.getLastUsedLoginMethod()), []);
  const badge = <span className="auth__last">{t.login.lastUsed}</span>;

  // Ruta de vuelta tras entrar (relativa, nunca /login ni //otro-dominio)
  const backPath = () => {
    const back = next && next.startsWith("/") && !next.startsWith("//") ? next : window.location.pathname + window.location.search;
    return back.startsWith("/login") ? "/" : back;
  };

  // Entrar con Google / Apple / X: redirige al proveedor y vuelve a callbackURL con sesión
  const social_ = async (provider: SocialProvider) => {
    setSocial(provider); setError("");
    const origin = window.location.origin;
    const { error: err } = await authClient.signIn.social({
      provider,
      callbackURL: origin + backPath(),
      errorCallbackURL: `${origin}/login?next=${encodeURIComponent(backPath())}`,
    });
    if (err) { setSocial(null); setError(err.message ?? t.login.socialFailed(SOCIAL[provider].label)); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setLoading(true); setError("");
    // URLs absolutas: el servidor puede estar detrás de un proxy (preview) y no conocer el origen público
    const origin = window.location.origin;
    const back = backPath();
    const callbackURL = origin + back;
    // En desarrollo el enlace de este correo no se envía nunca: entra por la ruta de auto-login
    if (devEmail && value === devEmail) { window.location.assign(devLoginHref(back)); return; }
    // errorCallbackURL conserva el destino: si no, un enlace caducado pierde la invitación
    const { error: err } = await authClient.signIn.magicLink({ email: value, callbackURL, errorCallbackURL: `${origin}/login?next=${encodeURIComponent(back)}` });
    setLoading(false);
    if (err) { setError(err.message ?? t.login.linkFailed); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth__sent" role="status">
        <span className="auth__sent-icon">{IcMail}</span>
        <p className="auth__lead display">{t.login.checkInbox}</p>
        <p className="auth__hint">{t.login.sentToBefore}<strong>{email.trim()}</strong>{t.login.sentToAfter}</p>
        <button className="auth__alt" type="button" onClick={() => setSent(false)}>{t.login.useAnotherEmail}</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="auth__form">
      <p className="auth__lead display">{lead ?? t.login.leadDefault}</p>
      <p className="auth__hint">{hint ?? t.login.hintDefault}</p>
      {providers.length > 0 && (
        <>
          <div className="auth__social" role="group" aria-label={t.login.signInWithOther}>
            {providers.map((p) => (
              <Button
                key={p}
                className={`auth__social-btn auth__social-btn--${p}`}
                disabled={loading || social !== null}
                aria-busy={social === p}
                onClick={() => social_(p)}
              >
                {social === p ? <span className="spinner spinner--sm" /> : SOCIAL[p].icon}
                <span>{t.login.continueWith(SOCIAL[p].label)}</span>
                {lastUsed === p && badge}
              </Button>
            ))}
          </div>
          <div className="auth__or" aria-hidden><span>{t.login.orWithEmail}</span></div>
        </>
      )}
      <label className="auth__field">
        <span className="auth__label">{t.login.email}{lastUsed === "magic-link" && badge}</span>
        <Input size="lg"
          
          type="email"
          autoFocus={autoFocus}
          autoComplete="email"
          inputMode="email"
          placeholder={t.login.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      {error && <p className="modal__error">{error}</p>}
      <Button variant="primary" block className="auth__submit" type="submit" disabled={loading || social !== null || !email.trim()}>
        {loading
          ? <><span className="spinner" /> {t.login.sending}</>
          : <>{t.login.sendLink} {IcArrow}</>}
      </Button>
      {devEmail && (
        <a className="auth__alt auth__dev" href={devLoginHref(next && next.startsWith("/") && !next.startsWith("//") ? next : "/")}>
          {t.login.devLogin(devEmail)}
        </a>
      )}
    </form>
  );
}
