"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitation({ id, teamName }: { id: string; teamName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true); setError("");
    const { data, error: err } = await authClient.organization.acceptInvitation({ invitationId: id });
    if (err) { setBusy(false); setError(err.message ?? "No se pudo aceptar"); return; }
    const orgId = data?.invitation?.organizationId;
    if (orgId) await authClient.organization.setActive({ organizationId: orgId });
    router.push("/"); router.refresh();
  };

  return (
    <div className="auth__sent">
      <p className="auth__lead">Te invitan a {teamName}</p>
      <p className="auth__hint">Compartirás la librería de inspiración con el resto del equipo.</p>
      {error && <p className="modal__error">{error}</p>}
      <button className="btn btn--primary btn--block" onClick={accept} disabled={busy}>
        {busy ? "Uniéndote…" : "Unirme al equipo"}
      </button>
    </div>
  );
}
