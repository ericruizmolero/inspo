"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Icon, MenuItem, MenuLabel, Separator } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./SkillsMenu.css";

// The chats criterio.md opens in, at a new conversation
const CHATS = [
  { id: "claude", name: "Claude", href: "https://claude.ai/new" },
  { id: "chatgpt", name: "ChatGPT", href: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", href: "https://gemini.google.com/app" },
] as const;

/** The other ways criterio.md leaves, behind the arrow beside Copy: downloaded as a file, or taken to a frontier
 *  chat with a first message saying what the file is. Opening in a chat takes two steps: the first click copies
 *  the whole message (the page still has the focus, so the copy goes through) and turns the row into a link to
 *  the chat; the second one opens it. Opening in the same click as the copy lost it to the new tab's focus. */
export default function FileMenu({ markdown, projectName, onDownload }: { markdown?: string; projectName: string; onDownload: () => void }) {
  const { t } = useT();
  const s = t.system.mdView;
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const copy = async (id: string) => {
    try { await navigator.clipboard.writeText(`${s.openInPrompt(projectName)}\n\n${markdown}`); setFailed(false); setReady(id); } catch { setFailed(true); }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setReady(null); setFailed(false); } }}>
      <PopoverTrigger className="cr-btn cr-btn-quiet cr-btn-s mdv-btn mdv-btn--more" aria-label={s.more} data-tip={open ? undefined : s.more}><Icon name="chevron-down" size={16} /></PopoverTrigger>
      {/* The system's Menu: a paper window; the chats are a second group under an engraved line */}
      <PopoverContent align="end" className="cr-menu sys-skills">
        <MenuItem onClick={() => { setOpen(false); onDownload(); }}>{s.download}</MenuItem>
        {markdown && <>
          <Separator />
          <MenuLabel>{s.openIn}</MenuLabel>
          <p className="sys-skills__hint">{failed ? s.openInFailed : s.openInHint}</p>
          {CHATS.map((c) => ready === c.id
            ? (
              <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" role="menuitem" className="cr-menu-item sys-skills__row is-on">
                <span className="sys-skills__text"><span className="sys-skills__name">{s.openInGo(c.name)}</span><span className="sys-skills__what">{s.openInPaste}</span></span>
              </a>
            ) : (
              <MenuItem key={c.id} onClick={() => void copy(c.id)}>{c.name}</MenuItem>
            ))}
        </>}
      </PopoverContent>
    </Popover>
  );
}
