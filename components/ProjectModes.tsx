"use client";

import { SegmentedControl } from "@/components/criterio";
import PersonAvatar from "./PersonAvatar";
import { useT } from "./I18nProvider";
import { SYSTEM_AREAS } from "@/types/system";

/** The view switcher's order: Board, Polish, System */
export const PROJECT_VIEWS = ["board", "polish", "system"] as const;

/** A project's views in the top bar, each with what it has waiting: the votes left in Polish, the system's areas filled */
export default function ProjectModes({ projectView, onChange, polishTab, solo, members, systemFilled, systemStale }: {
  projectView: (typeof PROJECT_VIEWS)[number];
  onChange: (i: number) => void;
  polishTab: { left: number; under: boolean; done: Set<string> } | null;
  solo: boolean;
  members: { id: string; name: string; image: string | null }[];
  systemFilled: number;
  systemStale: number;
}) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const { t } = useT();
  return (
    <SegmentedControl className="topbar__modes" label={t.system.button} active={PROJECT_VIEWS.indexOf(projectView)}
      onChange={onChange}
      items={[
        { icon: "grid", label: <span className="topbar__mode-label">{t.system.modeBoard}</span> },
        { icon: "sparkle", label: <>
            <span className="topbar__mode-label">{t.polish.mode}</span>
            {/* Who in the team has gone through the whole board: in Polish, or anywhere while votes wait */}
            {!solo && polishTab && (projectView === "polish" || polishTab.under) && (
              <span className="topbar__faces">
                {members.slice(0, 5).map((m) => (
                  <span key={m.id} className={`topbar__face${polishTab.done.has(m.id) ? " is-done" : ""}`}
                    data-tip={polishTab.done.has(m.id) ? t.polish.memberDone(m.name) : t.polish.memberVoting(m.name)}>
                    <PersonAvatar name={m.name} image={m.image} size={14} />
                  </span>
                ))}
              </span>
            )}
          </>,
          count: polishTab && polishTab.left > 0 ? polishTab.left : undefined,
          title: polishTab && polishTab.left > 0 ? t.polish.left(polishTab.left) : undefined },
        { icon: "gauge", label: <span className="topbar__mode-label">{t.system.modeSystem}</span>,
          count: t.system.fill(systemFilled, SYSTEM_AREAS.length), dot: systemStale > 0,
          title: systemStale ? t.system.stale(systemStale) : undefined },
      ]} />
  );
}
