"use client";
// Cmd+K: find an inspiration, save a URL, switch workspace, jump to a settings section.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InspoItem } from "@/types/inspo";
import type { Workspace } from "@/lib/workspace-core";
import { normalizeWebUrl, mediaKindOf } from "@/lib/url";
import { proxiedSrc } from "@/lib/proxied-src";
import { authClient } from "@/lib/auth-client";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { sectionIcon } from "./section-icons";
import { enterFeedbackMode } from "./feedback-mode";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from "@/components/ui/command";

const SETTINGS = ["account", "feedback", "workspace", "members", "plan", "extension"] as const;
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

export default function CommandPalette({ open, onOpenChange, items, hasDesignMd, workspace, workspaces, isAdmin, onOpenItem, onAddUrl, onAdd, onDirectory }: {
  open: boolean; onOpenChange: (open: boolean) => void;
  items: InspoItem[]; hasDesignMd: (web: string) => boolean;
  workspace: Workspace; workspaces: Workspace[]; isAdmin: boolean;
  onOpenItem: (item: InspoItem) => void; onAddUrl: (web: string) => void; onAdd: () => void; onDirectory: () => void;
}) {
  const { t } = useT();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const url = normalizeWebUrl(search.trim());

  // Every choice closes the palette first, then acts
  const run = (fn: () => void) => () => { onOpenChange(false); setSearch(""); fn(); };
  const switchTo = async (id: string) => {
    await authClient.organization.setActive({ organizationId: id });
    router.refresh();
  };

  return (
    <CommandDialog title={t.palette.title} open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSearch(""); }}>
      <CommandInput icon={<span className="cmdk-input__icon">{Icons.search}</span>} value={search} onValueChange={setSearch} placeholder={t.palette.placeholder} />
      <CommandList>
        <CommandEmpty>{t.palette.empty}</CommandEmpty>

        <CommandGroup heading={t.palette.actions}>
          {/* A pasted URL is saved in one step; forceMount keeps it visible whatever cmdk scores */}
          {url && (
            <CommandItem value={`save ${url}`} forceMount onSelect={run(() => onAddUrl(url))}>
              <span className="cmdk-item__icon">{Icons.plus}</span>{t.palette.addUrl(host(url))}
            </CommandItem>
          )}
          <CommandItem onSelect={run(onAdd)}><span className="cmdk-item__icon">{Icons.plus}</span>{t.palette.addInspo}</CommandItem>
          <CommandItem onSelect={run(onDirectory)}><span className="cmdk-item__icon">{Icons.compass}</span>{t.palette.openDirectory}</CommandItem>
          <CommandItem value={`feedback ${t.feedback.open}`} onSelect={run(enterFeedbackMode)}><span className="cmdk-item__icon">{sectionIcon("feedback")}</span>{t.feedback.open}</CommandItem>
        </CommandGroup>

        {items.length > 0 && (
          <CommandGroup heading={t.palette.inspirations}>
            {items.map((it) => {
              // An image or a video opens its thread here, never a raw file or the provider in a new tab
              const inside = hasDesignMd(it.web) || mediaKindOf(it.web) !== "web";
              const isImage = mediaKindOf(it.web) === "image";
              return (
                <CommandItem key={it.id ?? it.web} value={`${it.name} ${it.web}`}
                  onSelect={run(() => inside ? onOpenItem(it) : window.open(it.web, "_blank", "noopener"))}>
                  <img className="cmdk-item__favicon" alt="" style={isImage ? { objectFit: "cover" } : undefined}
                    src={isImage ? proxiedSrc(it.web) : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(it.web))}&sz=32`} />
                  <span className="cmdk-item__label">{it.name}</span>
                  <CommandShortcut>{hasDesignMd(it.web) ? "DESIGN.md" : inside ? t.card.comments : t.palette.openSite}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {workspaces.length > 1 && (
          <CommandGroup heading={t.palette.workspaces}>
            {workspaces.filter((w) => w.id !== workspace.id).map((w) => (
              <CommandItem key={w.id} value={`workspace ${w.name}`} onSelect={run(() => switchTo(w.id))}>
                <span className="cmdk-item__icon">{sectionIcon("workspace")}</span>{t.palette.switchTo(w.name)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading={t.palette.settings}>
          {SETTINGS.map((s) => (
            <CommandItem key={s} value={`settings ${t.settings.sections[s]}`} onSelect={run(() => router.push(`/settings/${s}`))}>
              <span className="cmdk-item__icon">{sectionIcon(s)}</span>{t.settings.sections[s]}
            </CommandItem>
          ))}
          {isAdmin && (
            <CommandItem value={`activity ${t.admin.title}`} onSelect={run(() => router.push("/admin"))}>
              <span className="cmdk-item__icon">{sectionIcon("overview")}</span>{t.admin.title}
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
