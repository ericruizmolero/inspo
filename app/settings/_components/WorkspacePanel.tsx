"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { deleteTeam } from "@/app/actions/workspace";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { useT, messageOf } from "@/components/I18nProvider";
import { Avatar, Button, FieldRow, ReadOnlyField, SettingsWindow, toneFor } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";
import OutputLanguageSwitch from "@/components/OutputLanguageSwitch";
import PersonAvatar from "@/components/PersonAvatar";
import { reportPlanLimit } from "@/components/PlanLimitNotice";
import { setActiveWorkspace } from "@/components/workspace-switch";
import { importWorkspaceZip, type ImportInto } from "@/lib/workspace-import-client";

export default function WorkspacePanel({ workspace, workspaces, me, canManage, roomForTeam }: {
  workspace: Workspace; workspaces: Workspace[]; me: SessionUser; canManage: boolean;
  /** The person pays for the open workspace's plan and it holds another workspace: an import can be a new team */
  roomForTeam: boolean;
}) {
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

  // Output language is the workspace's own default: a member sees it, only who manages the team changes it
  const defaults = (
    <SettingsWindow title={t.settings.defaults}>
      <FieldRow label={t.settings.outputLanguage} error={outError}
        hint={workspace.kind === "personal" ? t.settings.outputLanguagePersonalHint : canManage ? t.settings.outputLanguageHint : t.settings.outputLanguageAdmins}>
        <OutputLanguageSwitch workspaceId={workspace.id} value={workspace.outputLanguage} disabled={workspace.kind === "team" && !canManage} onError={setOutError} />
      </FieldRow>
    </SettingsWindow>
  );

  if (workspace.kind === "personal") {
    return (
      <div className="page__body">
        <SettingsWindow title={t.settings.identity}>
          <FieldRow label={t.settings.name} hint={t.settings.personalSpaceHint} htmlFor="space-name"
            action={<Link className="cr-btn cr-btn-secondary cr-btn-s" href="/settings/account">{t.settings.goToAccount}</Link>}>
            <ReadOnlyField id="space-name" value={workspace.name} />
          </FieldRow>
        </SettingsWindow>
        {defaults}
        <ExportData workspace={workspace} canExport={canManage} />
        <ImportData workspace={workspace} canImport={canManage} roomForTeam={roomForTeam} />
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
      <SettingsWindow title={t.settings.identity}>
        <FieldRow label={t.ws.logo} hint={t.settings.logoHint} error={logoError}>
          <span className="setting-photo">
            <Avatar initials={workspace.name.slice(0, 1).toUpperCase()} name={workspace.name} tone={toneFor(workspace.name)} src={workspace.logo} size={44} square />
            {canManage && <Button size="s" onClick={() => logoRef.current?.click()} disabled={busy}>{workspace.logo ? t.ws.change : t.ws.add}</Button>}
            {canManage && workspace.logo && <Button variant="quiet" size="s" onClick={() => setLogo(null)} disabled={busy}>{t.ws.remove}</Button>}
            <input ref={logoRef} type="file" accept="image/*" hidden onChange={onLogoFile} />
          </span>
        </FieldRow>
        <form onSubmit={rename}>
          <FieldRow label={t.settings.name} hint={t.settings.teamNameHint} htmlFor="team-name" error={nameError}
            action={canManage && (
              <Button size="s" type="submit" disabled={busy || !name.trim() || name.trim() === workspace.name}>
                {saved ? t.settings.saved : t.settings.save}
              </Button>
            )}>
            <input id="team-name" className="cr-input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
              placeholder={t.ws.teamName} maxLength={60} required disabled={!canManage} aria-invalid={nameError ? true : undefined} />
          </FieldRow>
        </form>
      </SettingsWindow>

      {defaults}
      <ExportData workspace={workspace} canExport={canManage} />
      <ImportData workspace={workspace} canImport={canManage} roomForTeam={roomForTeam} />
      <Spaces workspace={workspace} workspaces={workspaces} me={me} />
    </div>
  );
}

/** The open space as one zip, its files with it (app/api/workspace/export). Members see why the button does nothing for them */
function ExportData({ workspace, canExport }: { workspace: Workspace; canExport: boolean }) {
  const { t } = useT();
  const d = t.workspaceData;
  return (
    <SettingsWindow title={d.exportTitle} description={d.exportHint(workspace.name)}
      note={!canExport ? d.exportAdmins : undefined}
      actions={canExport
        ? <a className="cr-btn cr-btn-secondary cr-btn-s" href={`/api/workspace/export?id=${encodeURIComponent(workspace.id)}`} download>{d.exportAction}</a>
        : <Button size="s" disabled>{d.exportAction}</Button>} />
  );
}

/** An export's zip brought into the open space (lib/workspace-import-client.ts) by whoever manages it, and the window
 *  says what came in. Second, as a new team on this plan, which then opens: only for whoever pays for a plan with room
 *  for another workspace. Members see why the button does nothing for them */
function ImportData({ workspace, canImport, roomForTeam }: { workspace: Workspace; canImport: boolean; roomForTeam: boolean }) {
  const { t } = useT();
  const d = t.workspaceData;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const into = useRef<ImportInto>("open");
  const [busy, setBusy] = useState<ImportInto | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const choose = (where: ImportInto) => { into.current = where; fileRef.current?.click(); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const where = into.current;
    setBusy(where); setError(""); setDone("");
    try {
      const made = await importWorkspaceZip(file, where);
      if (where === "new") {
        await setActiveWorkspace(made.id);
        router.push("/"); router.refresh();
        return;
      }
      setDone(d.imported(made.items, made.projects, made.name));
      router.refresh();
    } catch (err) {
      if (!reportPlanLimit(err)) setError(err instanceof Error && err.message ? err.message : d.importFailed);
    }
    setBusy(null);
  };

  return (
    <SettingsWindow title={d.importTitle} description={roomForTeam ? `${d.importHint(workspace.name)} ${d.importTeamHint}` : d.importHint(workspace.name)}
      note={error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : done ? <span role="status">{done}</span> : !canImport ? d.importAdmins : undefined}
      actions={<>
        <Button size="s" onClick={() => choose("open")} disabled={!canImport || !!busy}>{busy === "open" ? d.importing : d.importAction}</Button>
        {roomForTeam && <Button size="s" onClick={() => choose("new")} disabled={!!busy}>{busy === "new" ? d.importing : d.importAsTeam}</Button>}
        <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={onFile} />
      </>} />
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
    const res = await deleteTeam(w.id).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setError(res?.error ?? t.settings.deleteSpaceFailed); return; }
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
              {/* Outline at rest; the danger red waits for the confirm step, which also asks for the name typed */}
              {w.kind === "team" && (w.role === "owner"
                ? <Button variant="outline" size="s" onClick={() => remove(w)} disabled={busy}>{t.settings.deleteSpace}</Button>
                : <Button variant="outline" size="s" onClick={() => leave(w)} disabled={busy}>{t.team.leaveTeam}</Button>)}
            </li>
          );
        })}
      </ul>
    </SettingsWindow>
  );
}
