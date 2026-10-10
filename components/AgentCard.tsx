"use client";

import { Button as CrButton, Busy, Icon, IconButton } from "@/components/criterio";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import type { AgentAction, AgentDone } from "@/lib/agent";
import type { Project } from "@/types/inspo";

/** What the agent said and did, above the box; the pending steps wait here for a yes */
export default function AgentCard({ agent, projects, onConfirm, onCancel, onClose, onUndo, onAsk }: {
  agent: { text: string; busy: boolean; say?: string; done: (AgentDone & { undone?: boolean })[]; pending: AgentAction[]; error?: string };
  projects: Project[];
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onUndo: (i: number) => void;
  /** An answer to the agent's question: its order, asked as a new request */
  onAsk: (order: string) => void;
}) {
  const { t } = useT();
  const areas = t.system.areas as Record<string, string>;
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const line = (d: AgentDone): string => {
    const did = t.agent.did;
    const area = d.area ? areas[d.area] ?? d.area : "";
    switch (d.kind) {
      case "search": return did.search(d.text ?? "");
      case "go": return did.go(d.go?.area ? `${areas[d.go.area] ?? d.go.area}${d.project ? ` (${d.project})` : ""}` : d.project ?? (d.go?.space === "inbox" ? "Inbox" : d.go?.space === "library" ? t.sidebar.all : ""));
      case "file": return did.file(d.n ?? 0, d.project ?? "", d.on !== false);
      case "assign": return did.assign(d.n ?? 0, area, d.on !== false);
      case "decide": return did.decide(area);
      case "never": return d.on ? did.neverAdd(area, d.text ?? "") : did.neverRemove(area, d.text ?? "");
      case "clear": return did.clear(area);
      case "release": return did.release(area);
      case "undo": return did.undo(area);
      case "read_board": return did.read_board(d.project ?? "");
      case "curate": return did.curate(area);
      case "organize": return did.organize(d.n ?? 0);
      case "create_project": return did.create_project(d.project ?? "");
      case "rename_project": return did.rename_project(d.project ?? "");
      case "delete_project": return did.delete_project(d.project ?? "");
      case "brief": return did.brief(d.project ?? "");
      case "client": return d.on ? did.client(d.project ?? "") : did.clientOff(d.project ?? "");
      case "add_url": return did.add_url(d.name ?? "");
      case "note": return did.note(d.name ?? "");
      case "comment": return did.comment(d.name ?? "");
      case "tag": return did.tag(d.name ?? "");
      case "delete_items": return did.delete_items(d.n ?? 0);
      case "guide": return did.guide;
      case "ask": return d.text ?? "";
    }
  };
  const will = (a: AgentAction): string => {
    if (a.kind === "delete_items") return t.agent.will.delete_items(a.items.length);
    if (a.kind === "delete_project") return t.agent.will.delete_project(projectName(a.project));
    if (a.kind === "clear") return t.agent.will.clear(areas[a.area] ?? a.area);
    return a.kind;
  };
  const guides = agent.done.filter((d) => d.kind === "guide" && d.ok);
  const asks = agent.done.filter((d) => d.kind === "ask" && d.ok && d.options?.length);
  return (
    // The system's TipWindow: a paper window with the moss bar ("Agent") and the strong close; the request, what it
    // said, what it did and the steps that wait for a yes in its body
    <section className="cr-window dock__agent" aria-label={t.agent.title}>
      <header className="cr-window-bar">
        <span className="cr-window-title"><Icon name="sparkle" size={16} />{t.agent.title}</span>
        <IconButton icon="close" variant="strong" size="xs" className="dock__agent-x" label={t.agent.dismiss} onClick={onClose} />
      </header>
      <div className="cr-window-body dock__agent-body" role="status" aria-live="polite">
      <p className="dock__agent-q">{agent.text}</p>
      {agent.busy && !agent.say ? <p className="dock__agent-say"><Busy label={t.agent.thinking} /> {t.agent.thinking}</p> : null}
      {agent.error && <p className="dock__agent-say dock__agent-say--error">{t.agent.failed}: {agent.error}</p>}
      {agent.say && <p className="dock__agent-say">{agent.say}</p>}
      {agent.done.filter((d) => d.kind !== "guide" && d.kind !== "ask").length > 0 && (
        <ul className="dock__agent-did">
          {agent.done.map((d, i) => d.kind === "guide" || d.kind === "ask" ? null : (
            <li key={i} className={`${d.ok ? "" : "is-failed"}${d.undone ? " is-undone" : ""}`}>{d.ok ? Icons.check : Icons.x}
              <span>{d.ok ? line(d) : d.error}{d.ok && (d.kind === "decide" || d.kind === "organize") && d.text ? <small className="dock__agent-sub">{d.text}</small> : null}</span>
              {d.undone ? <small className="dock__agent-undone">{t.agent.undone}</small> : d.undo?.length ? <CrButton variant="quiet" size="s" className="dock__agent-undo" disabled={agent.busy} onClick={() => onUndo(i)}>{t.agent.undo}</CrButton> : null}
            </li>
          ))}
        </ul>
      )}
      {asks.map((q, i) => (
        <div key={`q${i}`} className="dock__agent-ask">
          <p>{q.text}</p>
          <div className="dock__agent-options">
            {q.options!.map((o) => <CrButton key={o.label} size="s" disabled={agent.busy} data-tip={o.order} onClick={() => onAsk(o.order)}>{o.label}</CrButton>)}
          </div>
        </div>
      ))}
      {guides.map((g, i) => (
        <div key={`g${i}`} className="dock__agent-guide">
          <p>{g.text}</p>
          {g.topic && g.topic !== "other" && g.topic !== "export_md" && <a className="cr-btn cr-btn-primary cr-btn-s" href="/extension/connect" target="_blank" rel="noreferrer">{t.agent.guides[g.topic]} <Icon name="arrow-right" size={16} /></a>}
        </div>
      ))}
      {agent.pending.length > 0 && (
        <div className="dock__agent-pending">
          <span className="dock__agent-pending-title">{t.agent.pendingTitle(agent.pending.length)}</span>
          <ul>{agent.pending.map((a, i) => <li key={i}>{will(a)}</li>)}</ul>
          <div className="dock__agent-actions">
            <CrButton variant="primary" size="s" disabled={agent.busy} onClick={onConfirm}>{agent.busy ? <Busy label={t.agent.thinking} /> : <Icon name="check" size={16} />} {t.agent.confirm}</CrButton>
            <CrButton size="s" disabled={agent.busy} onClick={onCancel}>{t.agent.cancel}</CrButton>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
