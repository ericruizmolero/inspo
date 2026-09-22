"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { SessionUser } from "@/lib/workspace-core";
import { UserAvatar } from "@/components/WorkspaceMenu";
import ThemeSwitch from "@/components/ThemeSwitch";
import LangSwitch from "@/components/LangSwitch";
import { useT, messageOf } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPanel({ user, personalId }: { user: SessionUser; personalId: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // The name goes on the user and on the personal workspace, which carries the same name
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value || value === user.name) return;
    setBusy(true); setError(""); setSaved(false);
    const { error: err } = await authClient.updateUser({ name: value });
    if (!err && personalId) await authClient.organization.update({ organizationId: personalId, data: { name: value } });
    setBusy(false);
    if (err) { setError(err.message ?? t.ws.renameFailed); return; }
    setSaved(true);
    router.refresh();
  };

  // The photo is a 96px data URL on user.image (Better Auth), like the workspace logo
  const setPhoto = async (image: string | null) => {
    setBusy(true); setError("");
    const { error: err } = await authClient.updateUser({ image });
    setBusy(false);
    if (err) { setError(err.message ?? t.ws.photoFailed); return; }
    router.refresh();
  };
  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { await setPhoto(await fileToSquareDataURL(file, 96)); }
    catch (err) { setError(messageOf(err, t, t.ws.imageFailed)); }
  };

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="page__body">
      {error && <p className="modal__error">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profile}</CardTitle>
          <CardDescription>{t.settings.profileHint}</CardDescription>
        </CardHeader>
        <CardContent className="card-stack">
          <div className="setting-row">
            <UserAvatar name={user.name} image={user.image} className="setting-row__avatar" />
            <div className="setting-row__actions">
              <Button size="sm" onClick={() => photoRef.current?.click()} disabled={busy}>
                {user.image ? t.ws.changePhoto : t.ws.addPhoto}
              </Button>
              {user.image && <Button variant="ghost" size="sm" onClick={() => setPhoto(null)} disabled={busy}>{t.ws.removePhoto}</Button>}
            </div>
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhotoFile} />
          </div>
          <Separator />
          <form onSubmit={saveName} className="field">
            <Label htmlFor="account-name" className="field__label">{t.settings.name}</Label>
            <div className="invite">
              <Input id="account-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
                placeholder={t.ws.yourName} maxLength={60} required />
              <Button variant="primary" type="submit" disabled={busy || !name.trim() || name.trim() === user.name}>
                {saved ? t.settings.saved : t.settings.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.email}</CardTitle>
          <CardDescription>{t.settings.emailHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={user.email} readOnly aria-label={t.settings.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.appearance}</CardTitle>
          <CardDescription>{t.settings.appearanceHint}</CardDescription>
        </CardHeader>
        <CardContent className="card-stack">
          <div className="setting-line"><span>{t.settings.theme}</span><ThemeSwitch /></div>
          <Separator />
          <div className="setting-line"><span>{t.settings.language}</span><LangSwitch /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.session}</CardTitle>
          <CardDescription>{t.settings.sessionHint}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="ghost" size="sm" onClick={signOut}>{t.ws.signOut}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
