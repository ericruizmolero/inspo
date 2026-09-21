"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

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

const devLoginHref = (next: string) => `/api/dev-login?next=${encodeURIComponent(next.startsWith("/login") ? "/" : next)}`;

/**
 * Formulario de acceso por magic link. Lo usan la página /login y la ventana
 * que salta al hacer la primera acción como invitado (LoginGate).
 * - `next`: ruta a la que volver tras entrar (por defecto, la actual).
 * - `lead`/`hint`: titular y ayuda; si no se pasan, se usan los genéricos.
 */
export default function LoginForm({ next, initialError, lead, hint, autoFocus = true, devEmail }: {
  next?: string; initialError?: string; lead?: React.ReactNode; hint?: React.ReactNode; autoFocus?: boolean;
  /** Solo en desarrollo: correo que entra sin pasar por el buzón (DEV_LOGIN_EMAIL) */
  devEmail?: string;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setLoading(true); setError("");
    // URLs absolutas: el servidor puede estar detrás de un proxy (preview) y no conocer el origen público
    const origin = window.location.origin;
    const back = next && next.startsWith("/") && !next.startsWith("//") ? next : window.location.pathname + window.location.search;
    const callbackURL = origin + (back.startsWith("/login") ? "/" : back);
    // En desarrollo el enlace de este correo no se envía nunca: entra por la ruta de auto-login
    if (devEmail && value === devEmail) { window.location.assign(devLoginHref(back)); return; }
    const { error: err } = await authClient.signIn.magicLink({ email: value, callbackURL, errorCallbackURL: `${origin}/login` });
    setLoading(false);
    if (err) { setError(err.message ?? "No se pudo enviar el enlace"); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth__sent" role="status">
        <span className="auth__sent-icon">{IcMail}</span>
        <p className="auth__lead display">Revisa tu correo</p>
        <p className="auth__hint">Hemos enviado un enlace a <strong>{email.trim()}</strong>. Ábrelo desde este dispositivo; caduca en 10 minutos.</p>
        <button className="auth__alt" type="button" onClick={() => setSent(false)}>Usar otro correo</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="auth__form">
      <p className="auth__lead display">{lead ?? "Entra con tu correo"}</p>
      <p className="auth__hint">{hint ?? "Sin contraseñas: te mandamos un enlace de un solo uso."}</p>
      <label className="auth__field">
        <span className="auth__label">Correo</span>
        <input
          className="input input--lg"
          type="email"
          autoFocus={autoFocus}
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      {error && <p className="modal__error">{error}</p>}
      <button className="btn btn--primary btn--block auth__submit" type="submit" disabled={loading || !email.trim()}>
        {loading
          ? <><span className="spinner" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} /> Enviando</>
          : <>Enviar enlace {IcArrow}</>}
      </button>
      {devEmail && (
        <a className="auth__alt auth__dev" href={devLoginHref(next && next.startsWith("/") && !next.startsWith("//") ? next : "/")}>
          Desarrollo: entrar como {devEmail} sin correo
        </a>
      )}
    </form>
  );
}
