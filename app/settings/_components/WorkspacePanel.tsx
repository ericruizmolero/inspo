"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { WorkspaceAvatar, WorkspaceFace } from "@/components/WorkspaceMenu";
import { useT, messageOf } from "@/components/I18nProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/useConfirm";
import OutputLanguageSwitch from "@/components/OutputLanguageSwitch";

export default function WorkspacePanel({ workspace, workspaces, me, canManage }: { workspace: Workspace; workspaces: Workspace[]; me: SessionUser; canManage: boolean }) {
  const { t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(workspace.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (workspace.kind === "personal") {
    return (
      <div className="page__body">
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.personalSpace}</CardTitle>
            <CardDescription>{t.settings.personalSpaceHint}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/settings/account">{t.settings.goToAccount}</Link>
          </CardFooter>
        </Card>
        <Spaces workspace={workspace} workspaces={workspaces} me={me} />
      </div>
    );
  }

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value || value === workspace.name) return;
    setBusy(true); setError(""); setSaved(false);
    const { error: err } = await authClient.organization.update({ organizationId: workspace.id, data: { name: value } });
    setBusy(false);
    if (err) { setError(err.message ?? t.ws.renameFailed); return; }
    setSaved(true);
    router.refresh();
  };

  const setLogo = async (logo: string | null) => {
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.update({ organizationId: workspace.id, data: { logo } });
    setBusy(false);
    if (err) { setError(err.message ?? t.ws.logoFailed); return; }
    router.refresh();
  };
  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { await setLogo(await fileToSquareDataURL(file, 128)); }
    catch (err) { setError(messageOf(err, t, t.ws.imageFailed)); }
  };

  return (
    <div className="page__body">
      {error && <p className="modal__error">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle><Label htmlFor="ws-name" className="text-base leading-snug">{t.settings.teamName}</Label></CardTitle>
          <CardDescription>{t.settings.teamNameHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={rename} className="invite">
            <Input id="ws-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
              placeholder={t.ws.teamName} maxLength={60} required disabled={!canManage} />
            {canManage && (
              <Button variant="primary" type="submit" disabled={busy || !name.trim() || name.trim() === workspace.name}>
                {saved ? t.settings.saved : t.settings.save}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.ws.logo}</CardTitle>
          <CardDescription>{t.settings.logoHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="setting-row">
            <WorkspaceAvatar workspace={workspace} />
            {canManage && (
              <div className="setting-row__actions">
                <Button size="sm" onClick={() => logoRef.current?.click()} disabled={busy}>{workspace.logo ? t.ws.change : t.ws.add}</Button>
                {workspace.logo && <Button variant="ghost" size="sm" onClick={() => setLogo(null)} disabled={busy}>{t.ws.remove}</Button>}
              </div>
            )}
            <input ref={logoRef} type="file" accept="image/*" hidden onChange={onLogoFile} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.outputLanguage}</CardTitle>
          <CardDescription>{t.settings.outputLanguageHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="setting-line">
            <span>{t.settings.language}</span>
            <OutputLanguageSwitch workspaceId={workspace.id} value={workspace.outputLanguage} disabled={!canManage} onError={setError} />
          </div>
          {/* A switch that does nothing needs a reason: members can see the language, not change it */}
          {!canManage && <p className="card-note">{t.settings.outputLanguageAdmins}</p>}
        </CardContent>
      </Card>

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

  return (
    <Card>
      {confirmDialog}
      <CardHeader>
        <CardTitle>{t.settings.spaces}</CardTitle>
        <CardDescription>{t.settings.spacesHint}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="modal__error">{error}</p>}
        <ul className="list">
          {workspaces.map((w) => (
            <li key={w.id} className="list__row">
              <WorkspaceFace workspace={w} user={me} />
              <span className="list__main">
                <span className="list__name">{w.name}{w.id === workspace.id && <span className="list__you">{t.settings.spaceOpen}</span>}</span>
                <span className="list__sub">{w.kind === "personal" ? t.ws.personal : t.team.roles[w.role]}</span>
              </span>
              {w.kind === "team" && (w.role === "owner"
                ? <Button variant="ghost" size="sm" className="is-danger" onClick={() => remove(w)} disabled={busy}>{t.settings.deleteSpace}</Button>
                : <Button variant="ghost" size="sm" onClick={() => leave(w)} disabled={busy}>{t.team.leaveTeam}</Button>)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
