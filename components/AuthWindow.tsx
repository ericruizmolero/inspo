import type { ReactNode } from "react";
import { StatusBar, StatusCell } from "@/components/criterio";

/** A step outside the library (an invitation, the MCP consent, connecting the extension) as the system's paper
 *  window: a moss bar with the page's short title, the question, the answers in the footer, and who is signed in
 *  on a StatusBar along the foot. Paper and ink in both themes, like every window (.cr-window). */
export default function AuthWindow({ title, heading, children, footer, status, live, as: Tag = "section", onSubmit }: {
  title: string; heading?: ReactNode; children?: ReactNode; footer?: ReactNode; status?: ReactNode;
  /** the result of an answer: read out when it appears */
  live?: boolean;
  as?: "section" | "form"; onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Tag className="cr-window auth-window" aria-label={title} role={live ? "status" : undefined} onSubmit={onSubmit}>
      <header className="cr-window-bar"><span className="cr-window-title">{title}</span></header>
      <div className="cr-window-body auth-window__body">
        {heading ? <h1 className="auth__lead t-title-l">{heading}</h1> : null}
        {children}
        {footer ? <div className="cr-window-footer auth-window__footer">{footer}</div> : null}
      </div>
      {status ? <StatusBar className="auth-window__status"><StatusCell grow>{status}</StatusCell></StatusBar> : null}
    </Tag>
  );
}
