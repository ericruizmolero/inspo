import type { ReactNode } from "react";

/** Title and one line of context at the top of each section; `aside` holds controls such as a period switch.
 *  The h1 carries the display step on its own; the lead is body in muted */
export default function SettingsHeading({ title, lead, aside }: { title: string; lead: string; aside?: ReactNode }) {
  return (
    <header className="settings__heading">
      <div className="settings__titles">
        <h1>{title}</h1>
        <p className="settings__lead t-body">{lead}</p>
      </div>
      {aside && <div className="settings__aside">{aside}</div>}
    </header>
  );
}
