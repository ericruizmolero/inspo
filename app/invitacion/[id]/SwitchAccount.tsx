"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/I18nProvider";

/** Salir de esta cuenta y volver al login con la invitación como destino. */
export default function SwitchAccount({ next }: { next: string }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await authClient.signOut();
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  };
  return (
    <button className="btn btn--primary btn--block" onClick={go} disabled={busy}>
      {busy ? t.invite.signingOut : t.invite.useAnotherEmail}
    </button>
  );
}
