"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { Workspace } from "@/lib/workspace-core";
import { WorkspaceAvatar } from "@/components/WorkspaceMenu";
import { useT, messageOf } from "@/components/I18nProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/useConfirm";

export default function WorkspacePanel({ workspace, canManage }: { workspace: Workspace; canManage: boolean }) {
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

  const leave = async () => {
    if (!(await confirm({ title: t.team.leaveConfirm(workspace.name), description: t.settings.leaveHint, action: t.team.leaveTeam, danger: true }))) return;
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.leave({ organizationId: workspace.id });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.leaveFailed); return; }
    router.push("/"); router.refresh();
  };

  return (
    <div className="page__body">
      {confirmDialog}
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

      {workspace.role !== "owner" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.leave}</CardTitle>
            <CardDescription>{t.settings.leaveHint}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="ghost" size="sm" className="is-danger" onClick={leave} disabled={busy}>{t.team.leaveTeam}</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
