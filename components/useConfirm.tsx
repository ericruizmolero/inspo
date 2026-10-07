"use client";
// A promise-based confirm() drawn with the app's AlertDialog:
//   const [confirm, dialog] = useConfirm();  …  if (!(await confirm({ title, action }))) return;  …  {dialog}
import { useRef, useState } from "react";
import { useT } from "./I18nProvider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface Ask {
  title: string; description?: string; action: string; danger?: boolean;
  /** For what takes other people's work with it: the action waits until this (a name) is typed */
  typed?: string;
}

export function useConfirm() {
  const { t } = useT();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [typed, setTyped] = useState("");
  const resolveRef = useRef<(ok: boolean) => void>(() => {});

  const confirm = (a: Ask) => new Promise<boolean>((resolve) => { resolveRef.current = resolve; setTyped(""); setAsk(a); });
  const answer = (ok: boolean) => { resolveRef.current(ok); setAsk(null); };
  const ready = !ask?.typed || typed.trim() === ask.typed.trim();

  const dialog = (
    <AlertDialog open={!!ask} onOpenChange={(open) => { if (!open) answer(false); }}>
      <AlertDialogContent bar={ask?.action}>
        <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
        {ask?.description && <AlertDialogDescription>{ask.description}</AlertDialogDescription>}
        {ask?.typed && (
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" spellCheck={false}
            aria-label={t.common.typeToConfirm(ask.typed)} placeholder={t.common.typeToConfirm(ask.typed)}
            onKeyDown={(e) => { if (e.key === "Enter" && ready) answer(true); }} />
        )}
        <div className="modal__footer">
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction variant={ask?.danger ? "danger" : "primary"} disabled={!ready} onClick={() => answer(true)}>{ask?.action}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog] as const;
}
