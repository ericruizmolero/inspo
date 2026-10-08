"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { SessionUser, Workspace } from "@/lib/workspace-core";
import ThemeSwitch from "@/components/ThemeSwitch";
import LangSwitch from "@/components/LangSwitch";
import OutputLanguageSwitch from "@/components/OutputLanguageSwitch";
import { setUiSounds, useUiSounds } from "@/lib/ui-sounds";
import { setEmailPreference } from "@/app/actions/notifications";
import { useT, messageOf } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { Avatar, FieldRow, SettingsWindow, Switch, toneFor } from "@/components/criterio";

export default function AccountPanel({ user, personal, emails }: { user: SessionUser; personal: Workspace | null; emails: { digest: boolean; replies: boolean } }) {
  const personalId = personal?.id ?? null;
  const { t } = useT();
  const sounds = useUiSounds();
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  // Each error sits under the control it is about
  const [nameError, setNameError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [outError, setOutError] = useState("");
  const [saved, setSaved] = useState(false);
  // The team emails: switched at once on screen, put back if the save fails
  const [mail, setMail] = useState(emails);
  const [mailError, setMailError] = useState("");
  const setKind = async (kind: "digest" | "replies", on: boolean) => {
    const before = mail;
    setMail({ ...mail, [kind]: on }); setMailError("");
    const res = await setEmailPreference(kind, on);
    if (!res.ok) { setMail(before); setMailError(res.error); }
  };

  // The name goes on the user and on the personal workspace, which carries the same name
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value || value === user.name) return;
    setBusy(true); setNameError(""); setSaved(false);
    const { error: err } = await authClient.updateUser({ name: value });
    if (!err && personalId) await authClient.organization.update({ organizationId: personalId, data: { name: value } });
    setBusy(false);
    if (err) { setNameError(err.message ?? t.ws.renameFailed); return; }
    setSaved(true);
    router.refresh();
  };

  // The photo is a 96px data URL on user.image (Better Auth), like the workspace logo
  const setPhoto = async (image: string | null) => {
    setBusy(true); setPhotoError("");
    const { error: err } = await authClient.updateUser({ image });
    setBusy(false);
    if (err) { setPhotoError(err.message ?? t.ws.photoFailed); return; }
    router.refresh();
  };
  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { await setPhoto(await fileToSquareDataURL(file, 96)); }
    catch (err) { setPhotoError(messageOf(err, t, t.ws.imageFailed)); }
  };

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="page__body">
      <SettingsWindow title={t.settings.profile} description={t.settings.profileHint}>
        <FieldRow label={t.settings.photo} error={photoError}>
          <span className="setting-photo">
            <Avatar initials={user.name.slice(0, 1).toUpperCase()} name={user.name} tone={toneFor(user.name)} src={user.image} size={44} />
            <Button size="sm" onClick={() => photoRef.current?.click()} disabled={busy}>
              {user.image ? t.ws.changePhoto : t.ws.addPhoto}
            </Button>
            {user.image && <Button variant="quiet" size="sm" onClick={() => setPhoto(null)} disabled={busy}>{t.ws.removePhoto}</Button>}
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhotoFile} />
          </span>
        </FieldRow>
        <form onSubmit={saveName}>
          <FieldRow label={t.settings.name} htmlFor="account-name" error={nameError}
            action={
              <Button variant="primary" size="sm" type="submit" disabled={busy || !name.trim() || name.trim() === user.name}>
                {saved ? t.settings.saved : t.settings.save}
              </Button>
            }>
            <input id="account-name" className="cr-input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
              placeholder={t.ws.yourName} maxLength={60} required aria-invalid={nameError ? true : undefined} />
          </FieldRow>
        </form>
        <FieldRow label={t.settings.email} hint={t.settings.emailHint} htmlFor="account-email">
          <input id="account-email" className="cr-input" value={user.email} readOnly />
        </FieldRow>
      </SettingsWindow>

      <SettingsWindow title={t.settings.appearance} description={t.settings.appearanceHint}>
        <FieldRow label={t.settings.theme}><ThemeSwitch /></FieldRow>
        <FieldRow label={t.settings.language}><LangSwitch /></FieldRow>
        <FieldRow label={t.settings.uiSounds} hint={t.settings.uiSoundsHint}>
          <Switch checked={sounds} onChange={setUiSounds} label={t.settings.uiSounds} />
        </FieldRow>
      </SettingsWindow>

      <SettingsWindow title={t.settings.emails} description={t.settings.emailsHint}>
        <FieldRow label={t.settings.digestEmails} hint={t.settings.digestEmailsHint} error={mailError}>
          <Switch checked={mail.digest} onChange={(on) => void setKind("digest", on)} label={t.settings.digestEmails} />
        </FieldRow>
        <FieldRow label={t.settings.replyEmails} hint={t.settings.replyEmailsHint}>
          <Switch checked={mail.replies} onChange={(on) => void setKind("replies", on)} label={t.settings.replyEmails} />
        </FieldRow>
      </SettingsWindow>

      {personal && (
        <SettingsWindow title={t.settings.outputLanguage} description={t.settings.outputLanguagePersonalHint}>
          <FieldRow label={t.settings.language} error={outError}>
            <OutputLanguageSwitch workspaceId={personal.id} value={personal.outputLanguage} onError={setOutError} />
          </FieldRow>
        </SettingsWindow>
      )}

      <SettingsWindow title={t.settings.session} note={t.settings.sessionHint}
        actions={<Button size="sm" onClick={signOut}>{t.ws.signOut}</Button>} />
    </div>
  );
}
