"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";

/** Sign out of this account and return to login with the invitation as the destination. */
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
