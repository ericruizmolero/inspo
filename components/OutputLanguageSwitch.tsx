"use client";
// The workspace's output language: what the model writes in for everyone on it.
// Same look as LangSwitch, but saved on the workspace, not on the person.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOutputLanguage } from "@/app/actions/workspace";
import { OUTPUT_LANGUAGES, OWN_NAME, type OutputLanguage } from "@/lib/output-language";
import { Icon } from "@/components/criterio";
import { useT } from "./I18nProvider";

export default function OutputLanguageSwitch({ workspaceId, value, disabled, onError }: { workspaceId: string; value: OutputLanguage; disabled?: boolean; onError?: (msg: string) => void }) {
  const { t } = useT();
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();

  const choose = (v: OutputLanguage) => {
    if (v === current) return;
    const before = current;
    setCurrent(v);
    start(async () => {
      const res = await setOutputLanguage(workspaceId, v);
      if (!res.ok) { setCurrent(before); onError?.(res.error); return; }
      router.refresh();
    });
  };

  return (
    <span className="select">
      <select
        aria-label={t.settings.outputLanguage}
        aria-busy={pending}
        disabled={disabled || pending}
        value={current}
        onChange={(e) => choose(e.target.value as OutputLanguage)}
      >
        {OUTPUT_LANGUAGES.map((l) => <option key={l} value={l}>{OWN_NAME[l]}</option>)}
      </select>
      <Icon name="chevron-down" size={16} />
    </span>
  );
}
