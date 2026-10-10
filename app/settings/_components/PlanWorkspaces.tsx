"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { Button, FieldRow, SettingsWindow } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";
import PersonAvatar from "@/components/PersonAvatar";
import { setActiveWorkspace } from "@/components/workspace-switch";
import { createWorkspaceInAccount, moveWorkspaceToAccount } from "@/app/actions/billing";

interface Row { id: string; name: string; logo: string | null; people: number }

/**
 * The workspaces one plan pays for, and, for the person who pays, a field to open a new one in it and the teams of
 * theirs another plan pays for, to move here. A plan of one workspace says so instead of offering either.
 */
export default function PlanWorkspaces({ currentId, accountName, planName, limit, used, agency, rows, movable, owner }: {
  currentId: string; accountName: string; planName: string;
  /** The plan's workspaces, null for no limit */
  limit: number | null;
  used: number;
  /** The plan that holds several, to name it when this one holds one */
  agency: { name: string; workspaces: number | null };
  rows: Row[]; movable: Row[];
  /** The person pays for this plan: only they add to it */
  owner: boolean;
}) {
  const { t } = useT();
  const a = t.plans.account;
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const single = limit === 1;
  const full = limit !== null && used >= limit;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError("");
    const r = await createWorkspaceInAccount(name);
    if (!r.ok) { setBusy(false); setError(r.error); return; }
    // The new workspace is the active one now, and inviting its people is the next step
    await setActiveWorkspace(r.data.id);
    setBusy(false); setName("");
    router.push("/settings/members"); router.refresh();
  };

  const move = async (w: Row) => {
    if (!(await confirm({ title: a.moveConfirm(w.name), description: a.moveHint, action: a.moveHere }))) return;
    setBusy(true); setError("");
    const r = await moveWorkspaceToAccount(w.id);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    router.refresh();
  };

  const note = error
    ? <span className="cr-field-hint is-error" role="alert">{error}</span>
    : owner && single ? a.oneOnly(planName, agency.name, agency.workspaces ?? 0)
    : owner && full ? a.full(limit!)
    : undefined;

  return (
    <>
      {confirmDialog}
      <SettingsWindow title={a.title} figure={owner ? (limit === null ? used : t.plans.usedOf(used, limit)) : undefined}
        description={owner ? a.lead(accountName) : a.leadMember} note={note}>
        <ul className="list">
          {rows.map((w) => (
            <li key={w.id} className="list__row">
              <PersonAvatar name={w.name} image={w.logo} size={32} square />
              <span className="list__main">
                <span className="list__name t-ui"><span className="list__text">{w.name}{w.id === currentId && t.settings.spaceOpen}</span></span>
                <span className="list__sub t-small">{t.quota.people(w.people)}</span>
              </span>
            </li>
          ))}
        </ul>
        {owner && !single && (
          <form onSubmit={create}>
            <FieldRow label={a.newLabel} hint={a.newHint} htmlFor="new-workspace-name"
              action={<Button size="s" type="submit" disabled={busy || full || !name.trim()}>{a.create}</Button>}>
              <input id="new-workspace-name" className="cr-input" placeholder={a.newPlaceholder} maxLength={60} disabled={full}
                value={name} onChange={(e) => { setName(e.target.value); setError(""); }} />
            </FieldRow>
          </form>
        )}
      </SettingsWindow>

      {owner && !single && movable.length > 0 && (
        <SettingsWindow title={a.moveTitle} description={a.moveLead}>
          <ul className="list">
            {movable.map((w) => (
              <li key={w.id} className="list__row">
                <PersonAvatar name={w.name} image={w.logo} size={32} square />
                <span className="list__main">
                  <span className="list__name t-ui"><span className="list__text">{w.name}</span></span>
                  <span className="list__sub t-small">{t.quota.people(w.people)}</span>
                </span>
                <Button variant="quiet" size="s" onClick={() => move(w)} disabled={busy || full}>{a.moveHere}</Button>
              </li>
            ))}
          </ul>
        </SettingsWindow>
      )}
    </>
  );
}
