import type { ReactNode } from "react";

/** Title and one line of context at the top of each section; `aside` holds controls such as a period switch */
export default function SettingsHeading({ title, lead, aside }: { title: string; lead: string; aside?: ReactNode }) {
  return (
    <header className="settings__heading">
      <div className="page__heading">
        <h1 className="display page__title">{title}</h1>
        <p className="page__lead">{lead}</p>
      </div>
      {aside && <div className="settings__aside">{aside}</div>}
    </header>
  );
}
