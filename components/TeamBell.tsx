"use client";
// The bell in the Island: what the team did this week, newest first, each line with the person's face. A small
// ember count on the bell's shoulder while there is something unseen, and a soft cue when something new arrives
// (through lib/ui-sounds.ts, so it only sounds for whoever turned the sounds on). Only in a team workspace.
// Read on arrival and whenever the board's pulse says the team's newest news moved (lib/notify.ts latestTeamEvent);
// opening it marks everything seen.
import { useCallback, useEffect, useRef, useState } from "react";
import { teamActivityFeed, teamActivitySeen } from "@/app/actions/notifications";
import type { TeamActivity } from "@/lib/notify";
import { cue } from "@/lib/ui-sounds";
import { pushUrl } from "@/lib/url-history";
import { Avatar, Icon, MenuLabel, toneFor } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";

export default function TeamBell({ workspaceId, news }: { workspaceId: string; news: string }) {
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

  // The workspace changing starts over
  useEffect(() => {
    setFeed(null);
    known.current = null;
  }, [workspaceId]);
  useEffect(() => { void load(); }, [load, workspaceId, news]);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && feed?.unseen) {
      // The lines keep their "new" mark while the menu is open; the count goes now
      setFeed({ ...feed, unseen: 0 });
      known.current = 0;
      void teamActivitySeen();
    }
  };

  // "12 oct, 22:26": a comma between day and hour, never the dot some locales put after the month
  const when = (iso: string) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(/\./g, "");
    return `${day}, ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  };
  // Over the library (/ or an open reference) the line opens in place, as a card does: the URL changes with history
  // and the library reads it, so the board is not loaded again first. Elsewhere, or with a modifier key, a plain link
  const go = (e: React.MouseEvent, path: string) => {
    setOpen(false);
    const here = window.location.pathname;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || (here !== "/" && !here.startsWith("/i/"))) return;
    e.preventDefault();
    if (path.startsWith("/i/")) pushUrl(`${path}${window.location.search}`); else pushUrl(path);
  };
  const unseen = feed?.unseen ?? 0;
  const label = unseen ? `${t.teamActivity.open}, ${t.teamActivity.unseen(unseen)}` : t.teamActivity.open;
  // The person's name in bold, as in a Comment (the line starts with it), and the place the line names (it ends it)
  const words = (text: string, who: string, place?: string) => {
    const head = who && text.startsWith(who) ? who : "";
    const rest = text.slice(head.length);
    const at = place ? rest.lastIndexOf(place) : -1;
    return <>{head && <b>{head}</b>}{at < 0 ? rest : <>{rest.slice(0, at)}<b>{place}</b>{rest.slice(at + place!.length)}</>}</>;
  };

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
              <a key={`${l.at}-${i}`} href={l.path} className={`island__event${l.fresh ? " is-fresh" : ""}`} onClick={(e) => go(e, l.path)}>
                <Avatar initials={(l.who || "?").slice(0, 1).toUpperCase()} name={l.who} tone={toneFor(l.who)} src={l.image} size={20} className="island__event-face" />
                <span className="island__event-body">
                  <span className="island__event-text">{words(l.text, l.who, l.place)}</span>
                  {l.quote && <span className="island__event-quote">{l.said ? `\u201c${l.quote}\u201d` : l.quote}</span>}
                  <span className="island__event-meta"><span className="island__event-where">{l.project ?? t.teamActivity.library}</span><time dateTime={l.at}>{when(l.at)}</time></span>
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
