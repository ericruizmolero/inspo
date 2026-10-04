// criterio.md: the project's system as a file an agent reads before designing. Shared by client
// (download, copy, the Markdown view) and server (the check script). Headings are the reader's language;
// the body is whatever language the decisions were written in.
//
// It holds everything the team gathered, in order: what the project is, the eight areas (each with its
// decision, its why, what it never does, the references behind it with what the team said of each, and the
// area's conversation), and at the end every reference once: what it is, who saved it, what was said and
// what it brings to which area. An area cites a reference by its code (R1, R2…).
//
// The file is built in blocks (the head, the paragraph, one block per area, the references) so the app can show
// it as it is and let a block be edited: the system stays the one source, the file is its other face.
import { SYSTEM_AREAS, confidenceOf, type ProjectSystem, type SystemArea } from "@/types/system";

/** A reference as the file tells it: what it is, who brought it and what the team said about it */
export interface RefInfo {
  name: string; web: string;
  kind?: "web" | "image" | "video" | "post";
  by?: string;
  /** The day it was saved, YYYY-MM-DD */
  date?: string;
  /** What it is, as the AI read it: the page in a line, or the picture described */
  what?: string;
  /** Its style, sector and traits, as words */
  tags?: string[];
  /** What the team said about it, oldest first: the note it was saved with, then its thread */
  said?: { who: string; text: string; pin?: boolean }[];
}
/** A line of an area's conversation; `label` is the option it points at, `itemId` the reference */
export interface TalkLine { who: string; text: string; label?: string; itemId?: string; /** The change it proposes, and whether the team took it */ proposal?: { decision: string; state: "open" | "accepted" | "rejected" } }

export interface CriterioMdInput {
  project: string;
  system: ProjectSystem;
  /** The workspace's references by id: at least the name and URL behind each decision */
  items: Record<string, RefInfo>;
  labels: Record<SystemArea, string>;
  /** A redesign: the client's current site, whose copy, typefaces, logo and figures rule */
  client?: { name: string; web: string } | null;
  /** What the project is, in the team's words (the brief) */
  about?: string | null;
  /** The project's references in the order they were saved: each gets a code (R1, R2…) and its own entry at the end of the file */
  board?: string[];
  /** The team's conversation about each area, oldest first */
  talk?: Record<string, TalkLine[]>;
  /** Where the app lives, to make its own paths (uploaded images) whole links */
  origin?: string;
  strings: {
    intro: string; summary: string; decided: string; proposed: string; open: string; confidence: string; evidence: string; take: string; why: string; never: string; client: string;
    project: string; refs: string; refsIntro: string; kinds: Record<"web" | "image" | "video" | "post", string>; what: string; savedBy: string; said: string; pinned: string;
    brings: string; noArea: string; tags: string; talk: string; on: (what: string) => string;
    proposes: string; states: Record<"open" | "accepted" | "rejected", string>;
  };
}

export type CriterioBlock =
  /** The title, the note to the reader and the date, as lines of the file. `edited`: the team rewrote it by hand */
  | { kind: "head"; lines: string[]; edited?: boolean }
  | { kind: "summary"; heading: string; text: string }
  /** A part the app writes whole: what the project is, and the references one by one */
  | { kind: "section"; id: string; heading: string; lines: string[]; edited?: boolean }
  | {
    kind: "area"; area: SystemArea; heading: string;
    /** Empty when the area is open */
    decision: string; why: string;
    /** What the area must never do, one rule per line */
    never: string;
    whyLabel: string; neverLabel: string; openText: string;
    /** The status, the references behind the decision with what the team said of each, and the area's conversation, as lines of the file */
    meta: string[];
    /** The team rewrote the status and references by hand */
    metaEdited?: boolean;
  };

const one = (s: string) => s.replace(/\s+/g, " ").trim();
const quote = (s: string, max = 280) => { const t = one(s); return `\u00ab${t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}\u2026` : t}\u00bb`; };

export function criterioBlocks({ project, system, items, labels, strings, client, about, board = [], talk = {}, origin = "" }: CriterioMdInput): CriterioBlock[] {
  const date = (system.updatedAt ?? new Date().toISOString()).slice(0, 10);
  const abs = (u: string) => (u.startsWith("/") ? `${origin}${u}` : u);
  // Each reference of the project has a code, so an area can cite it and the reader finds it at the end
  const code = new Map(board.map((id, i) => [id, `R${i + 1}`]));
  const cite = (id: string) => {
    const it = items[id];
    if (!it) return id;
    const kind = it.kind && it.kind !== "web" ? ` (${strings.kinds[it.kind].toLowerCase()})` : "";
    return `${code.has(id) ? `**${code.get(id)}** ` : ""}[${it.name}](${abs(it.web)})${kind}`;
  };
  // What the team rewrote by hand stands instead of what the app would write (types/system.ts DOC_PARTS)
  const doc = system.doc ?? {};
  const headLines = [`# ${project}: criterio.md`, "", `> ${strings.intro}`, "", `**criterio.design** · ${date}`, ...(client ? ["", `**${strings.client}:** [${client.name}](${abs(client.web)})`] : [])];
  const blocks: CriterioBlock[] = [{ kind: "head", lines: doc.head ? doc.head.split("\n") : headLines, edited: !!doc.head }];
  if (about?.trim()) blocks.push({ kind: "section", id: "project", heading: strings.project, lines: [about.trim()] });
  if (system.summary) blocks.push({ kind: "summary", heading: strings.summary, text: system.summary });
  for (const key of SYSTEM_AREAS) {
    const a = system.areas.find((x) => x.area === key);
    const base = { kind: "area" as const, area: key, heading: labels[key], whyLabel: strings.why, neverLabel: strings.never, openText: strings.open, never: a?.never ?? "" };
    const meta: string[] = [];
    if (a?.decision) {
      const level = confidenceOf(a);
      meta.push(`- **${a.source === "team" ? strings.decided : strings.proposed}**${level === "low" ? ` · ${strings.confidence} ${a.confidence}/100` : ""}`);
    }
    if (a?.evidence.length) {
      meta.push(`- **${strings.evidence} (${a.evidence.length}):**`);
      for (const e of a.evidence) {
        meta.push(`  - ${cite(e.itemId)}${e.take ? `. ${strings.take}: ${e.take}` : ""}`);
        // The words behind it, next to what it brings: why the team saved it
        for (const w of (items[e.itemId]?.said ?? []).slice(0, 3)) meta.push(`    - ${w.who}${w.pin ? `, ${strings.pinned}` : ""}: ${quote(w.text, 220)}`);
      }
    }
    const lines = talk[key] ?? [];
    if (lines.length) {
      meta.push(`- **${strings.talk} (${lines.length}):**`);
      for (const l of lines) {
        const on = l.label ?? (l.itemId && items[l.itemId] ? `${code.get(l.itemId) ?? ""} ${items[l.itemId].name}`.trim() : "");
        if (l.proposal) {
          meta.push(`  - ${l.who} ${strings.proposes} (${strings.states[l.proposal.state]}): ${quote(l.proposal.decision, 600)}`);
          if (l.text && l.text !== l.proposal.decision) meta.push(`    - ${quote(l.text)}`);
        } else meta.push(`  - ${l.who}${on ? `, ${strings.on(on)}` : ""}: ${quote(l.text)}`);
      }
    }
    const byHand = doc[`meta:${key}`];
    blocks.push({ ...base, decision: a?.decision ?? "", why: a?.decision ? a.why : "", meta: byHand ? byHand.split("\n") : meta, metaEdited: !!byHand });
  }
  // Every reference once, with what it is, what was said of it and what it brings to each area
  if (board.length) {
    const lines: string[] = [strings.refsIntro, ""];
    for (const id of board) {
      const it = items[id];
      if (!it) continue;
      lines.push(`### ${code.get(id)} · ${it.name}`, "");
      const kind = it.kind ?? "web";
      const where = kind === "image" ? strings.kinds.image.toLowerCase() : abs(it.web).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 60);
      lines.push(`- **${strings.kinds[kind]}:** [${where}](${abs(it.web)})`);
      if (it.what) lines.push(`- **${strings.what}:** ${one(it.what)}`);
      if (it.by) lines.push(`- **${strings.savedBy}:** ${it.by}${it.date ? ` · ${it.date}` : ""}`);
      if (it.said?.length) {
        lines.push(`- **${strings.said}:**`);
        for (const w of it.said) lines.push(`  - ${w.who}${w.pin ? `, ${strings.pinned}` : ""}: ${quote(w.text, 600)}`);
      }
      const brings = system.areas.flatMap((a) => a.evidence.filter((e) => e.itemId === id).map((e) => ({ area: a.area, take: e.take })));
      if (brings.length) {
        lines.push(`- **${strings.brings}:**`);
        for (const b of brings) lines.push(`  - ${labels[b.area]}${b.take ? `: ${b.take}` : ""}`);
      } else lines.push(`- **${strings.brings}:** _${strings.noArea}_`);
      if (it.tags?.length) lines.push(`- **${strings.tags}:** ${it.tags.join(", ")}`);
      lines.push("");
    }
    while (lines[lines.length - 1] === "") lines.pop();
    blocks.push({ kind: "section", id: "refs", heading: `${strings.refs} (${board.length})`, lines: doc.refs ? doc.refs.split("\n") : lines, edited: !!doc.refs });
  }
  return blocks;
}

/** An area's never list: one rule a line under its bold label */
export const neverMd = (b: { never: string; neverLabel: string }) => [`**${b.neverLabel}:**`, ...b.never.split("\n").filter(Boolean).map((l) => `- ${l}`)].join("\n");

/** The file, from its blocks */
export function blocksToMd(blocks: CriterioBlock[]): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  for (const b of blocks) {
    if (b.kind === "head") { for (const line of b.lines) p(line); p(); continue; }
    if (b.kind === "summary") { p(`## ${b.heading}`); p(); p(b.text); p(); continue; }
    if (b.kind === "section") { p(`## ${b.heading}`); p(); for (const line of b.lines) p(line); p(); continue; }
    p(`## ${b.heading}`);
    p();
    if (!b.decision) { p(`_${b.openText}_`); p(); }
    else { p(b.decision); p(); if (b.why) { p(`**${b.whyLabel}:** ${b.why}`); p(); } }
    if (b.never) { p(neverMd(b)); p(); }
    if (b.meta.length) { for (const line of b.meta) p(line); p(); }
  }
  return L.join("\n");
}

export function renderCriterioMd(input: CriterioMdInput): string {
  return blocksToMd(criterioBlocks(input));
}
