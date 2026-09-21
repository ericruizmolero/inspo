"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
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
    const callbackURL = origin + (next && next.startsWith("/") ? next : "/");
    const { error: err } = await authClient.signIn.magicLink({ email: value, callbackURL, errorCallbackURL: `${origin}/login` });
    setLoading(false);
    if (err) { setError(err.message ?? "No se pudo enviar el enlace"); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth__sent">
        <p className="auth__lead">Revisa tu correo</p>
        <p className="auth__hint">Te hemos enviado un enlace a <strong>{email.trim()}</strong>. Caduca en 10 minutos.</p>
        <button className="btn btn--ghost btn--sm" onClick={() => setSent(false)}>Usar otro correo</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="auth__form">
      <p className="auth__lead">Entra con tu correo</p>
      <p className="auth__hint">Sin contraseñas: te mandamos un enlace de un solo uso.</p>
      <input
        className="input"
        type="email"
        autoFocus
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {error && <p className="modal__error">{error}</p>}
      <button className="btn btn--primary btn--block" type="submit" disabled={loading || !email.trim()}>
        {loading && <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} />}
        {loading ? "Enviando" : "Enviar enlace"}
      </button>
    </form>
  );
}
