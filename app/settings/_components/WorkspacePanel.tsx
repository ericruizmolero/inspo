"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { useT, messageOf } from "@/components/I18nProvider";
import { Avatar, Button, FieldRow, SettingsWindow, toneFor } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";
import OutputLanguageSwitch from "@/components/OutputLanguageSwitch";
import PersonAvatar from "@/components/PersonAvatar";

export default function WorkspacePanel({ workspace, workspaces, me, canManage }: { workspace: Workspace; workspaces: Workspace[]; me: SessionUser; canManage: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(workspace.name);
  const [busy, setBusy] = useState(false);
  // Each error sits under the control it is about
  const [nameError, setNameError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [outError, setOutError] = useState("");
  const [saved, setSaved] = useState(false);

  if (workspace.kind === "personal") {
    return (
      <div className="page__body">
        <SettingsWindow title={t.settings.personalSpace} note={t.settings.personalSpaceHint}
          actions={<Link className="cr-btn cr-btn-secondary cr-btn-s" href="/settings/account">{t.settings.goToAccount}</Link>} />
        <Spaces workspace={workspace} workspaces={workspaces} me={me} />
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

  return (
    <div className="page__body">

      <SettingsWindow title={t.ws.team}>
        <form onSubmit={rename}>
          <FieldRow label={t.settings.name} hint={t.settings.teamNameHint} htmlFor="team-name" error={nameError}
            action={canManage && (
              <Button variant="primary" size="s" type="submit" disabled={busy || !name.trim() || name.trim() === workspace.name}>
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
            {canManage && <Button size="s" onClick={() => logoRef.current?.click()} disabled={busy}>{workspace.logo ? t.ws.change : t.ws.add}</Button>}
            {canManage && workspace.logo && <Button variant="quiet" size="s" onClick={() => setLogo(null)} disabled={busy}>{t.ws.remove}</Button>}
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

      <Spaces workspace={workspace} workspaces={workspaces} me={me} />
    </div>
  );
}

/** Every space the person is in, whichever is open: a team is left, or deleted by whoever created it. Each row
 *  names its space, so nobody leaves the one that happens to be open meaning another. The personal one stays. */
function Spaces({ workspace, workspaces, me }: { workspace: Workspace; workspaces: Workspace[]; me: SessionUser }) {
  const { t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Out of the open space there is nothing left to show here: back to the library, which opens another
  const after = (id: string) => { if (id === workspace.id) router.push("/"); router.refresh(); };
  const leave = async (w: Workspace) => {
    if (!(await confirm({ title: t.team.leaveConfirm(w.name), description: t.settings.leaveHint, action: t.team.leaveTeam, danger: true }))) return;
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.leave({ organizationId: w.id });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.leaveFailed); return; }
    after(w.id);
  };
  const remove = async (w: Workspace) => {
    if (!(await confirm({ title: t.settings.deleteSpaceConfirm(w.name), description: t.settings.deleteSpaceHint, action: t.settings.deleteSpaceAction, danger: true, typed: w.name }))) return;
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.delete({ organizationId: w.id });
    setBusy(false);
    if (err) { setError(err.message ?? t.settings.deleteSpaceFailed); return; }
    after(w.id);
  };

  // The window's footer carries the error of the last leave or delete
  return (
    <SettingsWindow title={t.settings.spaces} figure={workspaces.length} description={t.settings.spacesHint}
      note={error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : undefined}>
      {confirmDialog}
      <ul className="list">
        {workspaces.map((w) => {
          // The personal space wears its person until it has a logo; a team wears its logo or its initial, square
          const personal = w.kind === "personal" && !w.logo;
          return (
            <li key={w.id} className="list__row">
              <PersonAvatar name={personal ? me.name : w.name} image={personal ? me.image : w.logo} size={32} square={!personal} />
              <span className="list__main">
                <span className="list__name t-ui"><span className="list__text">{w.name}{w.id === workspace.id && t.settings.spaceOpen}</span></span>
                <span className="list__sub t-small">{w.kind === "personal" ? t.ws.personal : t.team.roles[w.role]}</span>
              </span>
              {/* The danger red waits for the confirm step, which also asks for the name typed */}
              {w.kind === "team" && (w.role === "owner"
                ? <Button variant="quiet" size="s" onClick={() => remove(w)} disabled={busy}>{t.settings.deleteSpace}</Button>
                : <Button variant="quiet" size="s" onClick={() => leave(w)} disabled={busy}>{t.team.leaveTeam}</Button>)}
            </li>
          );
        })}
      </ul>
    </SettingsWindow>
  );
}
