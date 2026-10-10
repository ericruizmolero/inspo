"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { setActiveWorkspace } from "@/components/workspace-switch";
import { useT } from "@/components/I18nProvider";
import { Avatar, Button, toneFor } from "@/components/criterio";
import AuthWindow from "@/components/AuthWindow";

export default function AcceptInvitation({ id, teamName, inviterName, inviterEmail, inviterImage, youAre }: {
  id: string; teamName: string; inviterName: string; inviterEmail: string; inviterImage?: string | null; youAre: string;
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
    if (orgId) await setActiveWorkspace(orgId);
    // Confirmation before dropping the person into the library: without it, it looks like they did not get in
    setDone(true);
    router.refresh();
    setTimeout(() => router.push("/"), 900);
  };

  if (done) {
    return (
      <AuthWindow title={t.invite.pageTitle} live heading={t.invite.joined(teamName)} status={t.invite.signedInAs(youAre)}>
        <p className="auth__hint">{t.invite.opening}</p>
      </AuthWindow>
    );
  }

  return (
    <AuthWindow
      title={t.invite.pageTitle}
      heading={t.invite.invitesYou(inviterName, teamName)}
      status={t.invite.signedInAs(youAre)}
      footer={<Button variant="primary" onClick={accept} disabled={busy}>{busy ? t.invite.joining : t.invite.join}</Button>}
    >
      <div className="auth-window__from">
        <Avatar initials={inviterName.slice(0, 1).toUpperCase()} name={inviterName} tone={toneFor(inviterName)} src={inviterImage} size={32} />
        <span className="auth-window__who">
          <span className="auth-window__name">{inviterName}</span>
          <span className="auth-window__email">{inviterEmail}</span>
        </span>
      </div>
      <p className="auth__hint">{t.invite.sharedLibrary}</p>
      {error && <p className="modal__error">{error}</p>}
    </AuthWindow>
  );
}
