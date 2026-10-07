"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { Workspace } from "@/lib/workspace-core";
import { useT, messageOf } from "@/components/I18nProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { useConfirm } from "@/components/useConfirm";
import OutputLanguageSwitch from "@/components/OutputLanguageSwitch";
import { Avatar, FieldRow, SettingsWindow, toneFor } from "@/components/criterio";

export default function WorkspacePanel({ workspace, canManage }: { workspace: Workspace; canManage: boolean }) {
  const { t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(workspace.name);
  const [busy, setBusy] = useState(false);
  // Each error sits under the control it is about (leaving: in its window's footer)
  const [nameError, setNameError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [outError, setOutError] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [saved, setSaved] = useState(false);

  if (workspace.kind === "personal") {
    return (
      <div className="page__body">
        <SettingsWindow title={t.settings.personalSpace} note={t.settings.personalSpaceHint}
          actions={<Link className={buttonVariants()} href="/settings/account">{t.settings.goToAccount}</Link>} />
      </div>
    );
  }

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value || value === workspace.name) return;
    setBusy(true); setNameError(""); setSaved(false);
    const { error: err } = await authClient.organization.update({ organizationId: workspace.id, data: { name: value } });
    setBusy(false);
    if (err) { setNameError(err.message ?? t.ws.renameFailed); return; }
    setSaved(true);
    router.refresh();
  };

  const setLogo = async (logo: string | null) => {
    setBusy(true); setLogoError("");
    const { error: err } = await authClient.organization.update({ organizationId: workspace.id, data: { logo } });
    setBusy(false);
    if (err) { setLogoError(err.message ?? t.ws.logoFailed); return; }
    router.refresh();
  };
  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { await setLogo(await fileToSquareDataURL(file, 128)); }
    catch (err) { setLogoError(messageOf(err, t, t.ws.imageFailed)); }
  };

  const leave = async () => {
    if (!(await confirm({ title: t.team.leaveConfirm(workspace.name), description: t.settings.leaveHint, action: t.team.leaveTeam, danger: true }))) return;
    setBusy(true); setLeaveError("");
    const { error: err } = await authClient.organization.leave({ organizationId: workspace.id });
    setBusy(false);
    if (err) { setLeaveError(err.message ?? t.team.leaveFailed); return; }
    router.push("/"); router.refresh();
  };

  return (
    <div className="page__body">
      {confirmDialog}

      <SettingsWindow title={t.ws.team}>
        <form onSubmit={rename}>
          <FieldRow label={t.settings.name} hint={t.settings.teamNameHint} htmlFor="team-name" error={nameError}
            action={canManage && (
              <Button variant="primary" type="submit" disabled={busy || !name.trim() || name.trim() === workspace.name}>
                {saved ? t.settings.saved : t.settings.save}
              </Button>
            )}>
            <input id="team-name" className="cr-input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
              placeholder={t.ws.teamName} maxLength={60} required disabled={!canManage} aria-invalid={nameError ? true : undefined} />
          </FieldRow>
        </form>
        <FieldRow label={t.ws.logo} hint={t.settings.logoHint} error={logoError}>
          <span className="setting-photo">
            <Avatar initials={workspace.name.slice(0, 1).toUpperCase()} name={workspace.name} tone={toneFor(workspace.name)} src={workspace.logo} size={44} square />
            {canManage && <Button onClick={() => logoRef.current?.click()} disabled={busy}>{workspace.logo ? t.ws.change : t.ws.add}</Button>}
            {canManage && workspace.logo && <Button variant="quiet" onClick={() => setLogo(null)} disabled={busy}>{t.ws.remove}</Button>}
            <input ref={logoRef} type="file" accept="image/*" hidden onChange={onLogoFile} />
          </span>
        </FieldRow>
      </SettingsWindow>

      {/* A switch that does nothing needs a reason: members can see the language, not change it */}
      <SettingsWindow title={t.settings.outputLanguage} description={t.settings.outputLanguageHint}
        note={!canManage ? t.settings.outputLanguageAdmins : undefined}>
        <FieldRow label={t.settings.language} error={outError}>
          <OutputLanguageSwitch workspaceId={workspace.id} value={workspace.outputLanguage} disabled={!canManage} onError={setOutError} />
        </FieldRow>
      </SettingsWindow>

      {workspace.role !== "owner" && (
        <SettingsWindow title={t.settings.leave}
          note={leaveError ? <span className="cr-field-hint is-error" role="alert">{leaveError}</span> : t.settings.leaveHint}
          actions={<Button onClick={leave} disabled={busy}>{t.team.leaveTeam}</Button>} />
      )}
    </div>
  );
}
