"use client";
// Creating a team is a workspace-switcher action, so it lives in a dialog, not in a settings page.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useT } from "./I18nProvider";
import { Busy, Button, TextField } from "@/components/criterio";
import { Dialog, DialogClose, DialogDescription, DialogWindow } from "@/components/ui/dialog";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    setBusy(true); setError("");
    const slug = `${slugify(value) || "team"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: err } = await authClient.organization.create({ name: value, slug });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.createFailed); return; }
    setName(""); onOpenChange(false);
    // The new team is the active workspace now: its members page is the next step
    router.push("/settings/members"); router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogWindow initialFocus={() => document.getElementById("new-team-name")} bar={t.team.title} heading={t.team.newTeam} closeLabel={t.common.close}
        footer={
          <div className="modal__footer">
            <DialogClose render={<Button />}>{t.common.cancel}</DialogClose>
            <Button variant="primary" type="submit" form="new-team" disabled={busy || !name.trim()}>{busy ? <Busy label={t.team.create} /> : t.team.create}</Button>
          </div>
        }>
        <form id="new-team" onSubmit={submit} className="new-team">
          <DialogDescription className="modal__hint">{t.team.newTeamHint}</DialogDescription>
          <TextField id="new-team-name" label={t.settings.teamName} value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder={t.team.teamNamePlaceholder} maxLength={60} required />
          {error && <p className="modal__error">{error}</p>}
        </form>
      </DialogWindow>
    </Dialog>
  );
}
