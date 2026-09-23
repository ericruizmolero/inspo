"use client";
// Creating a team is a workspace-switcher action, so it lives in a dialog, not in a settings page.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      <DialogContent initialFocus={inputRef}>
        <div className="modal__header">
          <DialogTitle>{t.team.newTeam}</DialogTitle>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>
        <form onSubmit={submit} className="modal__body">
          <DialogDescription className="modal__hint">{t.team.newTeamHint}</DialogDescription>
          <div className="field">
            <Label htmlFor="new-team-name" className="field__label">{t.settings.teamName}</Label>
            <Input id="new-team-name" ref={inputRef} value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder={t.team.teamNamePlaceholder} maxLength={60} required />
          </div>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__footer">
            <DialogClose render={<Button variant="ghost" />}>{t.common.cancel}</DialogClose>
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>{t.team.create}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
