"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";

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
    <Button variant="primary" block onClick={go} disabled={busy}>
      {busy ? t.invite.signingOut : t.invite.useAnotherEmail}
    </Button>
  );
}
