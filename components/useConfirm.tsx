"use client";
// A promise-based confirm() drawn with the app's AlertDialog:
//   const [confirm, dialog] = useConfirm();  …  if (!(await confirm({ title, action }))) return;  …  {dialog}
import { useRef, useState } from "react";
import { useT } from "./I18nProvider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Ask { title: string; description?: string; action: string; danger?: boolean }

export function useConfirm() {
  const { t } = useT();
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolveRef = useRef<(ok: boolean) => void>(() => {});

  const confirm = (a: Ask) => new Promise<boolean>((resolve) => { resolveRef.current = resolve; setAsk(a); });
  const answer = (ok: boolean) => { resolveRef.current(ok); setAsk(null); };

  const dialog = (
    <AlertDialog open={!!ask} onOpenChange={(open) => { if (!open) answer(false); }}>
      <AlertDialogContent>
        <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
        {ask?.description && <AlertDialogDescription>{ask.description}</AlertDialogDescription>}
        <div className="modal__footer">
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction className={ask?.danger ? "is-danger-solid" : undefined} onClick={() => answer(true)}>{ask?.action}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog] as const;
}
