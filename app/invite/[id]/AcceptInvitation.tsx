"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";

export default function AcceptInvitation({ id, teamName, inviterName, inviterEmail, youAre }: {
  id: string; teamName: string; inviterName: string; inviterEmail: string; youAre: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true); setError("");
    const { data, error: err } = await authClient.organization.acceptInvitation({ invitationId: id });
    if (err) { setBusy(false); setError(err.message ?? t.invite.acceptFailed); return; }
    const orgId = data?.invitation?.organizationId;
    if (orgId) await authClient.organization.setActive({ organizationId: orgId });
    // Confirmation before dropping the person into the library: without it, it looks like they did not get in
    setDone(true);
    router.refresh();
    setTimeout(() => router.push("/"), 900);
  };

  if (done) {
    return (
      <div className="auth__sent" role="status">
        <p className="auth__lead">{t.invite.joined(teamName)}</p>
        <p className="auth__hint">{t.invite.opening}</p>
      </div>
    );
  }

  return (
    <div className="auth__sent">
      <p className="auth__lead">{t.invite.invitesYou(inviterName, teamName)}</p>
      <p className="auth__hint">{inviterEmail} · {t.invite.sharedLibrary}</p>
      {error && <p className="modal__error">{error}</p>}
      <Button variant="primary" block onClick={accept} disabled={busy}>
        {busy ? t.invite.joining : t.invite.join}
      </Button>
      <p className="auth__hint">{t.invite.signedInAs(youAre)}</p>
    </div>
  );
}
