"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Salir de esta cuenta y volver al login con la invitación como destino. */
export default function SwitchAccount({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await authClient.signOut();
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  };
  return (
    <button className="btn btn--primary btn--block" onClick={go} disabled={busy}>
      {busy ? "Saliendo…" : "Entrar con otro correo"}
    </button>
  );
}
