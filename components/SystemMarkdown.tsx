"use client";
// criterio.md, in sight: the same system the bento shows, as the file an agent reads before designing,
// and looking like what it is: the raw Markdown, in a code panel, its headings, quotes and marks coloured.
// It is not a second copy. Each area's block is the area's decision and its why: pressing a block turns
// it into the text itself, and saving writes the decision as the team's, exactly as the card or the agent
// would. The file follows.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SystemArea } from "@/types/system";
import { DECISION_MAX, NEVER_MAX } from "@/types/system";
import { neverMd, type CriterioBlock } from "@/lib/criterio-md";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { loadRecipe, saveRecipe } from "@/app/actions/templates";
import { timeAgo } from "@/lib/i18n/format";
import { Avatar } from "./CommentsPanel";

type AreaBlock = Extract<CriterioBlock, { kind: "area" }>;
const IconPin = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
    <path d="M2 3.5A1.5 1.5 0 013.5 2h7A1.5 1.5 0 0112 3.5v5a1.5 1.5 0 01-1.5 1.5H6l-3 2.5V10h-.5A1.5 1.5 0 012 8.5z" />
  </svg>
);
export const WHY_MAX = 400;

/** The part of an area's block a person writes: the decision, the why under its bold label, and the never list */
const rawOf = (b: AreaBlock) => [b.decision, b.why ? `**${b.whyLabel}:** ${b.why}` : "", b.never ? neverMd(b) : ""].filter(Boolean).join("\n\n");
export const rawAreaText = rawOf;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function parseAreaText(text: string, whyLabel: string, neverLabel: string): { decision: string; why: string; never: string } { return parse(text, whyLabel, neverLabel); }
function parse(text: string, whyLabel: string, neverLabel: string): { decision: string; why: string; never: string } {
  const n = new RegExp(`^\\*\\*${esc(neverLabel)}:\\*\\*[ \\t]*`, "m").exec(text);
  const before = n ? text.slice(0, n.index) : text;
  const never = n ? text.slice(n.index + n[0].length).split("\n").map((l) => l.trim().replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n") : "";
  const w = new RegExp(`^\\*\\*${esc(whyLabel)}:\\*\\*[ \\t]*`, "m").exec(before);
  if (!w) return { decision: before.trim(), why: "", never };
  return { decision: before.slice(0, w.index).trim(), why: before.slice(w.index + w[0].length).trim(), never };
}

/** A long address, as the panel shows it: its host and its last part (the file copied or downloaded has it whole) */
function shortUrl(url: string): string {
  if (url.length <= 56) return url;
  try { const u = new URL(url); const last = u.pathname.split("/").filter(Boolean).pop() ?? ""; return `${u.host}/\u2026/${last.length > 28 ? `\u2026${last.slice(-24)}` : last}`; } catch { return `${url.slice(0, 40)}\u2026`; }
}

/** A line of the file, coloured the way an editor would: bold, links and emphasis keep their marks */
// The marks of Markdown (**, ##, >, -, [](…)) are their own spans: the file's look shows them, the document's
// hides them (components/SystemDoc.css .mdv--doc .mdv-mark) and sets what they mean. The text has them either way.
const Mark = ({ children }: { children: ReactNode }) => <span className="mdv-mark">{children}</span>;
function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={i} className="mdv-b"><Mark>**</Mark>{part.slice(2, -2)}<Mark>**</Mark></b>;
    if (/^`[^`]+`$/.test(part)) return <span key={i} className="mdv-code">{part}</span>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <span key={i}><Mark>[</Mark><a className="mdv-link" href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a><Mark>]</Mark><span className="mdv-mark mdv-url" title={link[2]}>({shortUrl(link[2])})</span></span>;
    return <span key={i}>{part}</span>;
  });
}
/** What kind of line it is, and its mark */
function lineKind(text: string): { cls: string; mark: string; rest: string; depth?: number; tail?: string } {
  const h = text.match(/^(#{1,6}) /);
  if (h) return { cls: ` mdv-h mdv-h${h[1].length}`, mark: h[0], rest: text.slice(h[0].length) };
  if (text.startsWith("> ")) return { cls: " mdv-q", mark: "> ", rest: text.slice(2) };
  if (/^_.+_$/.test(text)) return { cls: " mdv-em", mark: "_", rest: text.slice(1, -1), tail: "_" };
  const li = text.match(/^(\s*)- /);
  if (li) return { cls: " mdv-li", mark: li[0], rest: text.slice(li[0].length), depth: li[1].length / 2 };
  return { cls: "", mark: "", rest: text };
}

/** A line that names a reference (an area's "- **R3** …", or the reference's own "### R3 · …"): its code */
const refCode = (text: string) => text.match(/^\s*- \*\*(R\d+)\*\* /)?.[1] ?? text.match(/^### (R\d+) ·/)?.[1];
/** What the document look adds to a line: the reference's picture, and the lines that are someone's words */
function human(text: string, pics?: Record<string, string>, underPic = false): { cls: string; pic?: string } {
  const code = refCode(text);
  const pic = code ? pics?.[code] : undefined;
  if (pic) return { cls: text.startsWith("###") ? " mdv-refhead" : " mdv-ref", pic: `url("${pic.replace(/"/g, "%22")}")` };
  if (isSaid(text)) return { cls: underPic ? " mdv-said mdv-said--pic" : " mdv-said" };
  return { cls: "" };
}
const isSaid = (text: string) => /^\s+- [^:\u00ab]{1,40}: \u00ab/.test(text);
/** Whether line `i` is something said about a reference that shows its picture (the lines above it, up to the reference) */
function underPicture(texts: string[], i: number, pics?: Record<string, string>): boolean {
  if (!pics || !isSaid(texts[i])) return false;
  for (let j = i - 1; j >= 0; j--) {
    const code = refCode(texts[j]);
    if (code) return !texts[j].startsWith("###") && !!pics[code];
    if (!isSaid(texts[j])) return false;
  }
  return false;
}

/** What a line of the file is quoted as when a pin is left on it */
export const quoteOf = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 160);

/** A pin, where it was left: the face of who left it, in a comment's shape, with its answers counted */
function PinMark({ pin, replies, active, style, onOpen }: { pin: DocPin; replies: number; active?: boolean; style: React.CSSProperties; onOpen: (pin: DocPin, el: HTMLElement) => void }) {
  return (
    <button type="button" className={`mdv-pin${active ? " is-open" : ""}`} style={style} aria-label={pin.who}
      onClick={(e) => { e.stopPropagation(); onOpen(pin, e.currentTarget); }}>
      <Avatar name={pin.who} image={pin.image} size={22} />
      {replies > 0 && <b>{replies + 1}</b>}
    </button>
  );
}

function Line({ text, onPress, pins, repliesOf, openId, onOpen, pics, underPic }: {
  text: string;
  /** Said about a reference that shows its picture: it lines up under that reference's text */
  underPic?: boolean;
  /** The references' pictures by code (R1…), for the document look */
  pics?: Record<string, string>;
  /** Pressing the line while commenting: how far across it (0 to 1) and where on screen */
  onPress?: (x: number, at: { x: number; y: number }) => void;
  /** The pins left on it */
  pins?: DocPin[];
  repliesOf?: (id: string) => number;
  openId?: string | null;
  onOpen?: (pin: DocPin, el: HTMLElement) => void;
}) {
  if (!text) return <div className="mdv-line">&nbsp;</div>;
  const k = lineKind(text);
  // A list line that wraps keeps its indent: the second row starts under the first's words, not at the margin
  const hang = k.depth !== undefined ? `${k.mark.length}ch` : undefined;
  const hu = human(text, pics, underPic);
  const style = { ...(hang ? { paddingLeft: hang, textIndent: `-${hang}`, "--d": k.depth } : {}), ...(hu.pic ? { "--pic": hu.pic } : {}) } as React.CSSProperties;
  return (
    <div className={`mdv-line${k.cls}${hu.cls}${onPress ? " is-pressable" : ""}${pins?.length ? " has-pins" : ""}`}
      style={hang || hu.pic ? style : undefined}
      onClick={onPress ? (e) => { if ((e.target as HTMLElement).closest("a, .mdv-pin")) return; const r = e.currentTarget.getBoundingClientRect(); onPress(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), { x: e.clientX, y: e.clientY }); } : undefined}>
      {k.mark && <Mark>{k.mark}</Mark>}{k.cls.includes("mdv-h") || k.cls.includes("mdv-q") || k.cls.includes("mdv-em") ? k.rest : inline(k.rest)}{k.tail && <Mark>{k.tail}</Mark>}
      {onOpen && pins?.map((n) => <PinMark key={n.id} pin={n} replies={repliesOf?.(n.id) ?? 0} active={openId === n.id} style={{ left: `${n.x * 100}%` }} onOpen={onOpen} />)}
    </div>
  );
}

const escHtml = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** The file's text as it is typed in: a row per line, with the colours and the hanging lists of the file. The
 *  text itself is whole (a long address is only cut on screen), so what is read back is the file */
function mdHtml(raw: string, pics?: Record<string, string>): string {
  const mark = (m: string) => `<span class="mdv-mark">${escHtml(m)}</span>`;
  const all = raw.split("\n");
  return all.map((line, i) => {
    if (!line) return `<div class="mdv-eline"><br></div>`;
    const k = lineKind(line);
    const hu = human(line, pics, underPicture(all, i, pics));
    const css = `${k.depth !== undefined ? `padding-left:${k.mark.length}ch;text-indent:-${k.mark.length}ch;--d:${k.depth};` : ""}${hu.pic ? `--pic:${hu.pic}` : ""}`;
    const hang = css ? ` style="${css.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
    const plain = k.cls.includes("mdv-h") || k.cls.includes("mdv-q") || k.cls.includes("mdv-em");
    const body = plain ? escHtml(k.rest) : escHtml(k.rest)
      .replace(/\*\*([^*\n]+)\*\*/g, (_m, x: string) => `<b class="mdv-b">${mark("**")}${x}${mark("**")}</b>`)
      .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (_m, name: string, url: string) => `${mark("[")}<span class="mdv-link">${name}</span>${mark("]")}<span class="mdv-mark mdv-url${url.length > 56 ? " mdv-url--cut" : ""}">(${url})</span>`);
    return `<div class="mdv-eline${k.cls}${hu.cls}"${hang}>${k.mark ? mark(k.mark) : ""}${body}${k.tail ? mark(k.tail) : ""}</div>`;
  }).join("");
}
/** The text of a part typed in place, read back from its rows */
const readText = (el: HTMLElement) => el.innerText.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "");

/**
 * A part of the file that is written in place, like a document: pressing it puts the caret where it was pressed
 * and typing changes the text. It saves itself: a moment after the typing stops, and when the part is left.
 * While proposing (the tool in the bar), an area's change is not written: leaving the part leaves it as a
 * proposal for the team, and the text goes back to what it said.
 */
function Editable({ raw, placeholder, disabled, over, onSave, onPropose, proposing, onReset, pics }: {
  raw: string; placeholder: string; disabled?: boolean;
  pics?: Record<string, string>;
  /** The part was rewritten by hand over what the app writes: goes back to it */
  onReset?: () => Promise<void>;
  /** What is too long in the text, as a short note; empty when it fits */
  over?: (text: string) => string;
  onSave: (text: string) => Promise<void>;
  onPropose?: (text: string, reason: string) => Promise<boolean>;
  proposing?: boolean;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(raw);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<"" | "saving" | "saved" | "proposed">("");
  const [working, setWorking] = useState(false);
  // What the file holds, as far as this part knows; and whether a save is on its way (one at a time, the last text wins)
  const sent = useRef(raw);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const again = useRef(false);
  const same = (a: string, b: string) => a.replace(/\n{3,}/g, "\n\n").trimEnd() === b.replace(/\n{3,}/g, "\n\n").trimEnd();
  // What is shown follows the file, except while someone is typing here: redrawing it would move their caret
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    el.innerHTML = mdHtml(raw, pics); setText(raw); sent.current = raw;
  }, [raw, pics]);
  useEffect(() => { if (state !== "saved" && state !== "proposed") return; const id = setTimeout(() => setState(""), 1600); return () => clearTimeout(id); }, [state]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const tooLong = over?.(text) ?? "";
  const flush = async (now: string, leaving: boolean): Promise<void> => {
    if (same(now, sent.current) || (over?.(now) ?? "")) return;
    // Emptied on the way to writing something else: an empty part is only saved when it is left that way
    if (!now.trim() && !leaving) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true; setState("saving");
    try { await onSave(now.trim()); sent.current = now; setState("saved"); }
    catch { setState(""); }
    finally {
      busy.current = false;
      const el = ref.current;
      if (again.current && el) { again.current = false; void flush(readText(el), document.activeElement !== el); }
    }
  };
  const typed = () => {
    const el = ref.current;
    if (!el) return;
    const now = readText(el);
    setText(now);
    clearTimeout(timer.current);
    if (!(proposing && onPropose)) timer.current = setTimeout(() => void flush(now, false), 900);
  };
  const leave = async () => {
    setFocused(false);
    clearTimeout(timer.current);
    const el = ref.current;
    if (!el) return;
    const now = readText(el);
    if (proposing && onPropose) {
      // Not written: left for the team to say yes or no, and the part says again what it said
      if (!same(now, raw) && now.trim() && !(over?.(now) ?? "") && await onPropose(now.trim(), "")) setState("proposed");
      el.innerHTML = mdHtml(raw, pics); setText(raw);
      return;
    }
    await flush(now, true);
  };
  return (
    <>
      <div ref={ref} className="mdv-live" role="textbox" aria-multiline spellCheck={false} data-placeholder={placeholder}
        // A save in flight does not take the part away from whoever is typing in it
        contentEditable={(disabled && !focused) || working ? false : "plaintext-only"} suppressContentEditableWarning
        onInput={typed} onFocus={() => setFocused(true)} onBlur={() => void leave()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.stopPropagation(); e.currentTarget.blur(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); clearTimeout(timer.current); void flush(readText(e.currentTarget), false); }
        }} />
      {(tooLong || state) && <p className={`mdv-state${tooLong ? " is-over" : ""}`} role="status">{tooLong || (state === "saving" ? t.doc.saving : state === "proposed" ? t.doc.proposed : t.doc.saved)}</p>}
      {!focused && onReset && <p className="mdv-byhand">{t.doc.byHand} <button type="button" disabled={working} onClick={() => { setWorking(true); void onReset().finally(() => setWorking(false)); }}>{t.doc.restore}</button></p>}
    </>
  );
}

function Written({ raw, placeholder, edit, pins, repliesOf, openId, onOpen, pics }: {
  raw: string; placeholder: string; pics?: Record<string, string>;
  edit: { over?: (text: string) => string; onSave: (text: string) => Promise<void>; onPropose?: (text: string, reason: string) => Promise<boolean>; onReset?: () => Promise<void>; disabled?: boolean; proposing?: boolean };
  pins: DocPin[]; repliesOf: (id: string) => number; openId: string | null; onOpen: (pin: DocPin, el: HTMLElement) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  return (
    <div className="mdv-written" ref={host}>
      <Editable raw={raw} placeholder={placeholder} pics={pics} {...edit} />
      <PinsOver host={host} raw={raw} pins={pins} repliesOf={repliesOf} openId={openId} onOpen={onOpen} />
    </div>
  );
}

/** A comment the team pinned to a spot of the file */
export interface DocPin {
  id: string; who: string; image: string | null; at: string; mine: boolean; text: string;
  /** The line it was left on, as it read then, and how far across it (0 to 1) */
  quote: string; x: number;
  /** An answer: the pin it answers */
  to?: string;
}

/** Where the lines a region's pins sit on start, inside a text typed in place: the pins are drawn over it there */
function PinsOver({ host, raw, pins, repliesOf, openId, onOpen }: {
  host: React.RefObject<HTMLDivElement | null>; raw: string; pins: DocPin[];
  repliesOf: (id: string) => number; openId: string | null; onOpen: (pin: DocPin, el: HTMLElement) => void;
}) {
  const [tops, setTops] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const el = host.current?.querySelector<HTMLElement>(".mdv-live");
    if (!el || !pins.length) { setTops({}); return; }
    const measure = () => {
      const lines = raw.split("\n");
      const out: Record<string, number> = {};
      for (const pin of pins) {
        const idx = lines.findIndex((l) => quoteOf(l) === pin.quote);
        const row = idx < 0 ? null : el.children[idx] as HTMLElement | undefined;
        if (row) out[pin.id] = row.offsetTop - el.offsetTop;
      }
      setTops(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [host, raw, pins]);
  return <>{pins.map((n) => tops[n.id] === undefined ? null : <PinMark key={n.id} pin={n} replies={repliesOf(n.id)} active={openId === n.id} style={{ left: `${n.x * 100}%`, top: tops[n.id] }} onOpen={onOpen} />)}</>;
}

export default function SystemMarkdown({ fileTools, blocks, busy, onSave, onCopy, onDownload, copied, projectId, projectName, hasRecipe, onPropose, tools: areaTools, after, pins, onPin, onUnpin, onAbout, onSummary, onPart, onText, onTextTitle, readOnly = false, look = "md", pictures }: {
  blocks: CriterioBlock[];
  busy: Set<SystemArea>;
  /** Writes the block as the area's decision (an empty decision opens the area again) */
  onSave?: (area: SystemArea, next: { decision: string; why: string; never: string }) => Promise<void>;
  /** A template: the file is read, copied and downloaded, never written (it is cloned into a project to work on it) */
  readOnly?: boolean;
  onCopy: () => void; onDownload: () => void; copied: boolean;
  /** More controls over the file, before Copy (the skills it carries) */
  fileTools?: ReactNode;
  /** The recipe beside the file: how the work is done, kept with the project */
  projectId: string; projectName: string; hasRecipe: boolean;
  /** Leaves the block's new text as a proposal for the team instead of writing it; resolves true when it was left */
  onPropose?: (area: SystemArea, next: { decision: string; why: string; never: string }, reason: string) => Promise<boolean>;
  /** An area's tools, beside its heading (confirm what the agent proposed, open its stage) */
  tools?: (block: AreaBlock) => ReactNode;
  /** Writes what the project is (the brief), typed in place */
  onAbout?: (text: string) => Promise<void>;
  /** How the file is set: as the Markdown it is, or as a document (the same text and tools, its marks hidden) */
  look?: "md" | "doc";
  /** The references' pictures by their code (R1, R2…): the document look shows each beside where it is named */
  pictures?: Record<string, string>;
  /** Writes the project's paragraph */
  onSummary?: (text: string) => Promise<void>;
  /** Writes over a part the app writes ("head", "refs", "meta:<area>"); null goes back to what the app writes */
  onPart?: (part: string, text: string | null) => Promise<void>;
  /** Writes the words of a text reference (the Content section), typed in place: the reference itself changes */
  onText?: (itemId: string, text: string) => Promise<void>;
  /** Gives a text reference another title, typed over its heading in Content (its code stays the app's) */
  onTextTitle?: (itemId: string, title: string) => Promise<void>;
  /** What the team is doing with an area, under its block: the proposals waiting and its conversation */
  after?: (block: AreaBlock) => ReactNode;
  /** The pins the team left, by the part of the file they sit on (an area, or head, project, summary, refs) */
  pins?: Record<string, DocPin[]>;
  /** Leaves a pin at a spot of a line, or an answer to one (`to`); resolves true when it was left */
  onPin?: (part: string, quote: string, body: string, at: { x: number; to?: string }) => Promise<boolean>;
  onUnpin?: (id: string) => Promise<void>;
}) {
  const { t } = useT();
  const s = t.system.mdView;
  // Two ways of pressing the file. Writing (the default): the text is typed in place. Commenting (the tool in
  // the bar, or C): pressing a spot leaves a pin there, as on a design file. A pin opens its thread beside it
  const [commenting, setCommenting] = useState(false);
  // Proposing (the other tool): what is typed in an area is left as a proposal instead of written
  const [proposing, setProposing] = useState(false);
  // The thread in sight: an existing pin's, or the one being started at a spot
  const [pop, setPop] = useState<{ left: number; top: number; rootId?: string; draft?: { part: string; quote: string; x: number } } | null>(null);
  const [pinText, setPinText] = useState("");
  const [pinning, setPinning] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const { locale } = useT();
  useEffect(() => {
    if (!onPin) return;
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "Escape") { setCommenting(false); setPop(null); return; }
      if (el?.closest("input, textarea, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") setCommenting((c) => !c);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onPin]);
  // Pressing anywhere else closes the thread
  useEffect(() => {
    if (!pop) return;
    const close = (e: Event) => { if (!(e.target as HTMLElement | null)?.closest?.(".mdv-pop, .mdv-pin")) setPop(null); };
    const id = setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", close); };
  }, [pop]);
  const all = useMemo(() => Object.entries(pins ?? {}).flatMap(([part, list]) => list.map((n) => ({ ...n, part }))), [pins]);
  const repliesOf = (id: string) => all.filter((n) => n.to === id).length;
  /** Where the thread opens: under the spot, kept inside the page */
  const place = (at: { x: number; y: number }) => {
    const box = docRef.current?.getBoundingClientRect();
    const width = box?.width ?? 800;
    return { left: Math.max(8, Math.min(at.x - (box?.left ?? 0) - 18, width - 348)), top: at.y - (box?.top ?? 0) + 18 };
  };
  const openPin = (pin: DocPin, el: HTMLElement) => { const r = el.getBoundingClientRect(); setPinText(""); setPop({ ...place({ x: r.left, y: r.bottom - 6 }), rootId: pin.id }); };
  const startPin = (part: string, quote: string) => (x: number, at: { x: number; y: number }) => { setPinText(""); setPop({ ...place(at), draft: { part, quote, x } }); };
  const root = pop?.rootId ? all.find((n) => n.id === pop.rootId) : undefined;
  const sendPin = async () => {
    if (!pop || !onPin || pinning || !pinText.trim()) return;
    const target = pop.draft ?? (root ? { part: root.part, quote: root.quote, x: root.x, to: root.id } : null);
    if (!target) return;
    setPinning(true);
    const ok = await onPin(target.part, target.quote, pinText.trim(), { x: target.x, to: "to" in target ? target.to : undefined });
    setPinning(false);
    if (ok) { setPinText(""); if (pop.draft) setPop(null); }
  };
  /** The lines of a part as the file shows them, each with the pins left on it. While commenting, pressing a line
   *  leaves a pin at that spot. `whole`: every line of the part (it may be drawn in several goes); `head`: whether
   *  these lines start it, where a pin whose line no longer reads the same is kept */
  const lines = (part: string, texts: string[], whole: string[] = texts, head = true) => {
    const mine = (pins?.[part] ?? []).filter((n) => !n.to);
    const quotes = new Set(whole.map(quoteOf));
    const first = head ? texts.findIndex(Boolean) : -1;
    return texts.map((text, i) => {
      const q = quoteOf(text);
      const here = text ? mine.filter((n) => n.quote === q || (i === first && !quotes.has(n.quote))) : [];
      return <Line key={i} text={text} pics={pictures} underPic={underPicture(texts, i, pictures)} pins={here} repliesOf={repliesOf} openId={pop?.rootId ?? null} onOpen={openPin}
        onPress={text && onPin && commenting && !readOnly ? startPin(part, q) : undefined} />;
    });
  };
  /** A part written in place. While commenting it is shown as lines, to pin; while writing its pins sit over the text */
  const written = (part: string, raw: string, placeholder: string, whole: string[], edit: { over?: (text: string) => string; onSave: (text: string) => Promise<void>; onPropose?: (text: string, reason: string) => Promise<boolean>; onReset?: () => Promise<void>; disabled?: boolean }) => {
    if (commenting || readOnly) return lines(part, raw ? raw.split("\n") : [placeholder], whole, false);
    const quotes = new Set(raw.split("\n").map(quoteOf).filter(Boolean));
    const here = (pins?.[part] ?? []).filter((n) => !n.to && quotes.has(n.quote));
    return <Written raw={raw} placeholder={placeholder} edit={{ ...edit, proposing: proposing && !!edit.onPropose }} pins={here} repliesOf={repliesOf} openId={pop?.rootId ?? null} onOpen={openPin} pics={pictures} />;
  };
  const areaOver = (b: AreaBlock) => (text: string) => {
    const p = parse(text, b.whyLabel, b.neverLabel);
    return p.decision.length > DECISION_MAX ? `${p.decision.length}/${DECISION_MAX}` : p.why.length > WHY_MAX ? `${b.whyLabel.toLowerCase()} ${p.why.length}/${WHY_MAX}` : p.never.length > NEVER_MAX ? `${b.neverLabel.toLowerCase()} ${p.never.length}/${NEVER_MAX}` : "";
  };

  const [file, setFile] = useState<"criterio" | "recipe">("criterio");
  const [recipe, setRecipe] = useState<string | null>(null);
  const [recipeCopied, setRecipeCopied] = useState(false);
  const [hasOne, setHasOne] = useState(hasRecipe);
  const openRecipe = async () => { setFile("recipe"); if (recipe === null) { const r = await loadRecipe(projectId); setRecipe(r.ok ? r.data : ""); } };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const r = await saveRecipe(projectId, text);
    if (r.ok) { setRecipe(text); setHasOne(!!text); setFile("recipe"); }
  };
  const tabs = (
    <span className="mdv-files" role="tablist">
      <button type="button" role="tab" aria-selected={file === "criterio"} className={`mdv-file${file === "criterio" ? " is-on" : ""}`} onClick={() => setFile("criterio")}>criterio.md</button>
      {hasOne
        ? <button type="button" role="tab" aria-selected={file === "recipe"} className={`mdv-file${file === "recipe" ? " is-on" : ""}`} onClick={() => void openRecipe()}>receta.md</button>
        : !readOnly && <label className="mdv-file mdv-file--add" title={s.recipeHint}>{Icons.plus} receta.md<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>}
    </span>
  );
  if (file === "recipe") return (
    <section className="mdv" aria-label="receta.md">
      <header className="mdv-bar">
        {tabs}
        <span className="mdv-bar__hint">{s.recipeHint}</span>
        <span className="mdv-bar__tools">
          <button type="button" className="mdv-btn" onClick={() => { void navigator.clipboard.writeText(recipe ?? "").then(() => { setRecipeCopied(true); setTimeout(() => setRecipeCopied(false), 1500); }, () => {}); }}>{recipeCopied ? Icons.check : Icons.all} {recipeCopied ? t.system.copied : s.copy}</button>
          <button type="button" className="mdv-btn" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([recipe ?? ""], { type: "text/markdown" })); a.download = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-receta.md`; a.click(); URL.revokeObjectURL(a.href); }}><i className="mdv-btn__down">{Icons.arrow}</i> .md</button>
          {!readOnly && <label className="mdv-btn" title={s.replaceRecipe}>{Icons.shuffle}<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>}
        </span>
      </header>
      {recipe === null ? <div className="mdv-doc"><span className="spinner spinner--sm" /></div> : <div className="mdv-doc">{recipe.split("\n").map((line, i) => <Line key={i} text={line} />)}</div>}
    </section>
  );

  return (
    <section className={`mdv${look === "doc" ? " mdv--doc" : ""}`} aria-label="criterio.md">
      <header className="mdv-bar">
        {tabs}
        <span className="mdv-bar__hint">{readOnly ? s.readOnlyHint : onPin ? (commenting ? t.doc.hintComment : proposing ? t.doc.hintPropose : t.doc.hint) : s.hint}</span>
        <span className="mdv-bar__tools">
          {onPropose && !readOnly && <button type="button" className={`mdv-btn mdv-btn--propose${proposing ? " is-on" : ""}`} aria-pressed={proposing} title={t.doc.proposeToolHint} onClick={() => setProposing((x) => !x)}>{t.doc.proposeTool}</button>}
          {onPin && !readOnly && <button type="button" className={`mdv-btn mdv-btn--comment${commenting ? " is-on" : ""}`} aria-pressed={commenting} title={t.doc.commentHint} onClick={() => { setCommenting((c) => !c); setPop(null); }}>{IconPin} {t.doc.commentTool}</button>}
          {fileTools}
          <button type="button" className="mdv-btn" onClick={onCopy}>{copied ? Icons.check : Icons.all} {copied ? t.system.copied : s.copy}</button>
          <button type="button" className="mdv-btn" onClick={onDownload} title={t.system.download}><i className="mdv-btn__down">{Icons.arrow}</i> .md</button>
        </span>
      </header>
      <div ref={docRef} className={`mdv-doc${commenting ? " is-commenting" : ""}`}>
        {blocks.map((b) => {
          // Every part is typed in place. What the app writes (the head, an area's status and references, the list of
          // references) can be written over; `over` says how a part written by hand is saved and how it goes back
          const over = (part: string, edited?: boolean) => (onPart ? { onSave: (text: string) => onPart(part, text), onReset: edited ? () => onPart(part, null) : undefined } : null);
          if (b.kind === "head") {
            const edit = over("head", b.edited);
            return <div key="head" id="sdoc-head" className="mdv-block">{edit ? written("head", b.lines.join("\n"), "", b.lines, edit) : lines("head", b.lines)}<Line text="" /></div>;
          }
          if (b.kind === "summary") return (
            <div key="summary" id="sdoc-summary" className="mdv-block">
              {lines("summary", [`## ${b.heading}`, ""], [`## ${b.heading}`, b.text])}
              {onSummary ? written("summary", b.text, "", [`## ${b.heading}`, b.text], { onSave: onSummary }) : lines("summary", [b.text], [`## ${b.heading}`, b.text], false)}
              <Line text="" />
            </div>
          );
          if (b.kind === "section") {
            const whole = [`## ${b.heading}`, ...b.lines];
            // What the project is: the team's own words. The references: written by the app, and over it by hand
            // A skill's section is written from the system (lib/md-skills.ts): it follows the areas, it is not typed over
            // The content is the texts the team pasted, whole (lib/criterio-md.ts): each one's words are typed in place
            // and saved to the reference itself; who saved it and what was said of it stay the app's
            const edit = b.id === "project" ? (onAbout ? { onSave: onAbout } : null) : b.id.startsWith("skill:") || b.id === "content" ? null : over(b.id, b.edited);
            if (b.texts && onText) return (
              <div key={b.id} id={`sdoc-${b.id}`} className="mdv-block">
                {lines(b.id, [`## ${b.heading}`, ""], whole)}
                {lines(b.id, b.texts.intro, whole, false)}
                {b.texts.items.map((x, i) => (
                  <div key={x.itemId || i}>
                    {/* Its heading is its title: typed over, the reference is renamed (the code before it is put back) */}
                    {x.itemId && onTextTitle
                      ? <>{written(b.id, x.head[0], "", whole, { onSave: async (text) => { const title = text.split("\n")[0].replace(/^#{1,6}\s*/, "").replace(/^R\d+\s*·\s*/, "").trim(); if (title) await onTextTitle(x.itemId, title); } })}{lines(b.id, x.head.slice(1), whole, false)}</>
                      : lines(b.id, x.head, whole, false)}
                    {/* An emptied text is not saved: a reference is removed from its card, not by clearing it */}
                    {x.itemId ? written(b.id, x.body.join("\n"), "", whole, { onSave: async (text) => { if (text.trim()) await onText(x.itemId, text); } }) : lines(b.id, x.body, whole, false)}
                    <Line text="" />
                  </div>
                ))}
              </div>
            );
            return (
              <div key={b.id} id={`sdoc-${b.id}`} className="mdv-block">
                {lines(b.id, [`## ${b.heading}`, ""], whole)}
                {edit ? written(b.id, b.lines.join("\n"), "", whole, edit) : lines(b.id, b.lines, whole, false)}
                <Line text="" />
              </div>
            );
          }
          const whole = [`## ${b.heading}`, ...rawOf(b).split("\n"), ...b.meta];
          const metaEdit = over(`meta:${b.area}`, b.metaEdited);
          return (
            <div key={b.area} id={`sdoc-${b.area}`} className={`mdv-block mdv-block--area${busy.has(b.area) ? " is-busy" : ""}`} aria-busy={busy.has(b.area)}>
              <div className="mdv-headrow">
                {lines(b.area, [`## ${b.heading}`], whole)}
                {areaTools && !readOnly && <span className="mdv-tools">{areaTools(b)}</span>}
              </div>
              <Line text="" />
              {/* The words a person writes: the decision, its why and what it never does */}
              {written(b.area, rawOf(b), `${t.system.md.open}. ${t.system.placeholder}`, whole, {
                disabled: busy.has(b.area), over: areaOver(b),
                onSave: async (text) => { await onSave?.(b.area, parse(text, b.whyLabel, b.neverLabel)); },
                onPropose: onPropose ? (text, why) => onPropose(b.area, parse(text, b.whyLabel, b.neverLabel), why) : undefined,
              })}
              {/* Its status and its references: the app's, or what the team wrote over them */}
              {b.meta.length > 0 && <><Line text="" />{metaEdit ? written(b.area, b.meta.join("\n"), "", whole, metaEdit) : lines(b.area, b.meta, whole, false)}</>}
              {after && <div className="mdv-team">{after(b)}</div>}
              <Line text="" />
            </div>
          );
        })}
        {/* A pin's thread, beside it: who said what and when, and room to answer. Or the comment being started */}
        {pop && (root || pop.draft) && (
          <div className="mdv-pop" style={{ left: pop.left, top: pop.top }} role="dialog">
            {root && [root, ...all.filter((n) => n.to === root.id)].map((n) => (
              <div key={n.id} className="mdv-pop__note">
                <Avatar name={n.who} image={n.image} size={24} />
                <div>
                  <p className="mdv-pop__meta"><b>{n.who}</b><time dateTime={n.at}>{timeAgo(n.at, locale, t)}</time>
                    {n.mine && onUnpin && <button type="button" onClick={() => { if (n.id === root.id) setPop(null); void onUnpin(n.id); }}>{t.areaThread.remove}</button>}
                  </p>
                  <p>{n.text}</p>
                </div>
              </div>
            ))}
            {!readOnly && (
              <form className="mdv-pop__form" onSubmit={(e) => { e.preventDefault(); void sendPin(); }}>
                <textarea autoFocus rows={root ? 1 : 2} value={pinText} placeholder={root ? t.doc.replyPlaceholder : t.doc.pinPlaceholder} aria-label={root ? t.doc.replyPlaceholder : t.doc.pinPlaceholder} disabled={pinning}
                  onChange={(e) => setPinText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendPin(); } }} />
                <Button variant="primary" size="sm" type="submit" disabled={pinning || !pinText.trim()}>{root ? t.doc.reply : t.doc.pin}</Button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
