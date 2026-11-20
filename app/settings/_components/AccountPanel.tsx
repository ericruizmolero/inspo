"use client";

import { useRef, useState } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { SessionUser, Workspace } from "@/lib/workspace-core";
import ThemeSwitch from "@/components/ThemeSwitch";
import LangSwitch from "@/components/LangSwitch";
import { setUiSounds, useUiSounds } from "@/lib/ui-sounds";
import { setEmailPreference } from "@/app/actions/notifications";
import type { EmailKind } from "@/lib/notify";
import { deleteMyAccount } from "@/app/actions/account";
import { useT, messageOf } from "@/components/I18nProvider";
import { Avatar, Button, FieldRow, ReadOnlyField, SettingsWindow, Switch, toneFor } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

export default function AccountPanel({ user, personal, emails, blockedBy }: {
  user: SessionUser; personal: Workspace | null; emails: { digest: boolean; replies: boolean; vault?: boolean };
  /** The teams of theirs with other people in them, written as a list; null when the account can be deleted */
  blockedBy: string | null;
}) {
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
  const [saved, setSaved] = useState(false);
  // The team emails: switched at once on screen, put back if the save fails
  const [mail, setMail] = useState(emails);
  const [mailError, setMailError] = useState("");
  const setKind = async (kind: EmailKind, on: boolean) => {
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
            <Button size="s" onClick={() => photoRef.current?.click()} disabled={busy}>
              {user.image ? t.ws.changePhoto : t.ws.addPhoto}
            </Button>
            {user.image && <Button variant="quiet" size="s" onClick={() => setPhoto(null)} disabled={busy}>{t.ws.removePhoto}</Button>}
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhotoFile} />
          </span>
        </FieldRow>
        <form onSubmit={saveName}>
          <FieldRow label={t.settings.name} htmlFor="account-name" error={nameError}
            action={
              <Button size="s" type="submit" disabled={busy || !name.trim() || name.trim() === user.name}>
                {saved ? t.settings.saved : t.settings.save}
              </Button>
            }>
            <input id="account-name" className="cr-input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
              placeholder={t.ws.yourName} maxLength={60} required aria-invalid={nameError ? true : undefined} />
          </FieldRow>
        </form>
        <FieldRow label={t.settings.email} hint={t.settings.emailHint} htmlFor="account-email">
          <ReadOnlyField id="account-email" value={user.email} />
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
        {mail.vault !== undefined && (
          <FieldRow label={t.settings.vaultEmails} hint={t.settings.vaultEmailsHint}>
            <Switch checked={mail.vault} onChange={(on) => void setKind("vault", on)} label={t.settings.vaultEmails} />
          </FieldRow>
        )}
      </SettingsWindow>

      <SettingsWindow title={t.settings.session}>
        <FieldRow label={t.settings.thisBrowser}>
          <span><Button size="s" onClick={signOut}>{t.ws.signOut}</Button></span>
        </FieldRow>
      </SettingsWindow>

      <DeleteAccount email={user.email} personal={personal} blockedBy={blockedBy} />
    </div>
  );
}

/**
 * The last section: the personal space's export first, then the delete, which asks for the email typed. While a team
 * of theirs has other people the delete waits, and the note says which and what to do (lib/account-delete.ts)
 */
function DeleteAccount({ email, personal, blockedBy }: { email: string; personal: Workspace | null; blockedBy: string | null }) {
  const { t } = useT();
  const d = t.deleteAccount;
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    if (!(await confirm({ title: d.confirm, description: d.confirmHint, action: d.confirmAction, danger: true, typed: email }))) return;
    setBusy(true); setError("");
    try {
      // Done, the action sends the browser to /login: its redirect comes back here as a rejection, passed on
      const res = await deleteMyAccount();
      setError(res.ok ? "" : res.error);
    } catch (err) {
      unstable_rethrow(err);
      setError(d.failed);
    }
    setBusy(false);
  };

  const note = error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : blockedBy ? d.blocked(blockedBy) : undefined;
  return (
    <SettingsWindow title={d.title} description={d.hint} note={note}
      actions={<>
        {personal && <a className="cr-btn cr-btn-secondary cr-btn-s" href={`/api/workspace/export?id=${encodeURIComponent(personal.id)}`} download>{d.download}</a>}
        {/* Outline at rest; the danger red waits for the confirm step, which also asks for the email typed */}
        <Button variant="outline" size="s" onClick={remove} disabled={busy || !!blockedBy}>{d.action}</Button>
      </>}>
      {confirmDialog}
    </SettingsWindow>
  );
}
