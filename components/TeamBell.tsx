"use client";
// The bell in the Island: what the team did this week, newest first, each line with the person's face. A small
// ember count on the bell's shoulder while there is something unseen, and a soft cue when something new arrives
// (through lib/ui-sounds.ts, so it only sounds for whoever turned the sounds on). Only in a team workspace.
// Asked for once a minute while the tab is visible (lib/notify.ts teamActivity); opening it marks everything seen.
import { useCallback, useEffect, useRef, useState } from "react";
import { teamActivityFeed, teamActivitySeen } from "@/app/actions/notifications";
import type { TeamActivity } from "@/lib/notify";
import { cue } from "@/lib/ui-sounds";
import { Avatar, Icon, MenuLabel, toneFor } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";

const EVERY_MS = 60_000;

export default function TeamBell({ workspaceId }: { workspaceId: string }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<TeamActivity | null>(null);
  // What the last answer said was unseen: more than that is news, and news sounds
  const known = useRef<number | null>(null);

  const load = useCallback(async () => {
    const res = await teamActivityFeed();
    if (!res.ok) return;
    if (known.current !== null && res.data.unseen > known.current) cue("attention", { emphasis: "subtle" });
    known.current = res.data.unseen;
    setFeed(res.data);
  }, []);

  // Once on arrival and then every minute, only while the tab is visible; the workspace changing starts over
  useEffect(() => {
    setFeed(null);
    known.current = null;
    void load();
    const tick = () => { if (document.visibilityState === "visible") void load(); };
    const id = setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [load, workspaceId]);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && feed?.unseen) {
      // The lines keep their "new" mark while the menu is open; the count goes now
      setFeed({ ...feed, unseen: 0 });
      known.current = 0;
      void teamActivitySeen();
    }
  };

  const when = (iso: string) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const unseen = feed?.unseen ?? 0;
  const label = unseen ? `${t.teamActivity.open}, ${t.teamActivity.unseen(unseen)}` : t.teamActivity.open;
  // The person's name in bold, as in a Comment: the line starts with it
  const words = (text: string, who: string) => who && text.startsWith(who) ? <><b>{who}</b>{text.slice(who.length)}</> : text;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className="cr-iconbtn cr-iconbtn-quiet cr-iconbtn-s island__bell" aria-label={label} data-tip={open ? undefined : label} data-fixed>
        <Icon name="bell" size={16} />
        {unseen > 0 && <span className="island__bell-count" aria-hidden>{unseen > 99 ? "99+" : unseen}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="cr-menu island__activity">
        <MenuLabel>{t.teamActivity.title}</MenuLabel>
        {feed && feed.lines.length === 0 && <p className="island__activity-empty t-small">{t.teamActivity.empty}</p>}
        {feed && feed.lines.length > 0 && (
          <div className="island__activity-list">
            {feed.lines.map((l, i) => (
              <a key={`${l.at}-${i}`} href={l.path} className={`island__event${l.fresh ? " is-fresh" : ""}`} onClick={() => setOpen(false)}>
                <Avatar initials={(l.who || "?").slice(0, 1).toUpperCase()} name={l.who} tone={toneFor(l.who)} src={l.image} size={24} className="island__event-face" />
                <span className="island__event-body">
                  <span className="island__event-text">{words(l.text, l.who)}</span>
                  {l.quote && <span className="island__event-quote">{l.quote}</span>}
                  <span className="island__event-meta">{l.project ?? t.teamActivity.library}, {when(l.at)}</span>
                </span>
                {l.fresh && <span className="cr-ring cr-ring-new island__event-new" aria-hidden />}
              </a>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
