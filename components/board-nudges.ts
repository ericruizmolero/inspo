// What Tino brings up on his own, from the bottom-right corner, when nobody is asking him anything. He looks at what
// is happening in the project and pushes towards the next useful thing there, most pressing first: on the board
// (SearchTino) what it has and what it lacks; on the System page (TinoDock) how the file works and what is waiting in
// it. Never somewhere else (the Inbox, another project): inside a project he talks about this one (Eric, 04-11). The
// copy is the copy sheet's (docs/design-system/componentes.md, Tino en el tablón / Tino en el sistema).
import type { TinoNudge } from "./HomeTino";
import type { SystemArea, SystemAreaState } from "@/types/system";
import type { CommentMap, InspoItem, TagMap } from "@/types/inspo";
import { viewOf } from "@/lib/taxonomy";
import type { MediaKind } from "@/lib/url";
import type { Dict } from "@/lib/i18n/en";

/** Under this, the board is still too thin for a reading worth having */
export const FEW_REFS = 8;
/** Over this, some of it surely says nothing any more: time to polish */
export const MANY_REFS = 12;
/** A reference this old that nobody has talked about is worth a second look */
const OLD_MS = 14 * 24 * 3600 * 1000;
/** What a teammate added this recently is news */
const RECENT_MS = 7 * 24 * 3600 * 1000;

/** A list said as a sentence: "a, b and c" */
function said(names: string[], and: string): string {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}` : names[0] ?? "";
}

export function boardNudges({ t, count, read, stale, empty, others, talk, vote, quietRef, kinds, oldRef, seed, noReason, twins, unused = 0, shared, missing = [], pace, onAdd, onStart, onSystem, onPolish, onPerson, onOpen, onKind, onSearch }: {
  t: Dict;
  /** References on the board */
  count: number;
  /** The system has read the board at least once */
  read: boolean;
  /** References on the board the system has not read yet */
  stale: number;
  /** Areas of the system no reference on the board backs (after the first reading) */
  empty: SystemArea[];
  /** What teammates added to this board this week, by who added it, most first */
  others: { who: string; n: number }[];
  /** A teammate's comment on a reference here that this person has not answered (unansweredTalk) */
  talk?: Talk | null;
  /** The team's polish: references this person has still to vote while others are voting, and votes waiting for
   *  whoever manages to close them */
  vote?: { left: number; toClose: boolean } | null;
  /** A teammate's recent reference nobody has said anything about (quietReference) */
  quietRef?: { item: InspoItem; who: string } | null;
  /** How many of each kind the board holds (videos, posts on X, texts), for what is worth a look */
  kinds?: Partial<Record<MediaKind, number>>;
  /** The oldest reference nobody has talked about (oldReference), to go over again */
  oldRef?: { item: InspoItem; days: number } | null;
  /** Changes with each visit: which of the non-urgent things he leads with */
  seed?: number;
  /** What this person added without saying why (no note): how many, and the newest */
  noReason?: { n: number; item: InspoItem } | null;
  /** The site with the most references on the board, when it has more than one (sameSite) */
  twins?: { host: string; n: number } | null;
  /** References the last pass read and no area uses (unusedByAreas) */
  unused?: number;
  /** The tag most of the board shares (sharedTag), already put in words */
  shared?: { label: string; n: number; total: number; go: () => void } | null;
  /** Teammates who have added nothing to this board (only with a team) */
  missing?: string[];
  /** This week's additions against the week before, when they doubled (only with a team) */
  pace?: { week: string; now: number; before: number } | null;
  onAdd: () => void;
  onStart: () => void;
  onSystem: () => void;
  onPolish: () => void;
  /** Shows the board narrowed to what that person saved */
  onPerson: (who: string) => void;
  /** Opens a reference's sheet, with its conversation */
  onOpen: (item: InspoItem) => void;
  /** Shows the board narrowed to one kind (videos, posts, texts) */
  onKind?: (kind: MediaKind) => void;
  /** Shows the board searched by those words (a site's name) */
  onSearch?: (words: string) => void;
}): TinoNudge[] {
  const b = t.tino.board;
  // A teammate talking to you goes first, always; the rest takes turns from one visit to the next (`seed`), so he
  // does not open with the same thing every time
  const urgent: TinoNudge[] = [];
  const list: TinoNudge[] = [];
  if (talk) urgent.push({ key: `talk:${talk.id}`, title: b.talkTitle, text: b.talkText(talk.who, refName(t, talk.item.name), talk.body), act: b.talkAct, mood: "accomplice", go: () => onOpen(talk.item) });
  // The key does not carry the count: "Later" holds for the visit even as votes come in
  if (vote?.toClose) list.push({ key: "vote:close", title: b.closeTitle, text: b.closeText, act: b.closeAct, mood: "judge", go: onPolish });
  else if (vote && vote.left > 0) list.push({ key: "vote", title: b.voteTitle, text: b.voteText(vote.left), act: b.voteAct, mood: "skeptic", go: onPolish });
  // Before the first reading: more references, or the reading itself once there are enough
  if (!read && count < FEW_REFS) list.push({ key: "few", title: b.fewTitle, text: b.fewText(count, FEW_REFS - count), act: b.fewAct, mood: "watching", go: onAdd });
  if (!read && count >= FEW_REFS) list.push({ key: "first", title: b.firstTitle, text: b.firstText(count), act: b.firstAct, mood: "accomplice", go: onStart });
  // After it: what came in since, and what the board says nothing about
  if (read && stale > 0) list.push({ key: "stale", title: b.staleTitle, text: b.staleText(stale), act: b.staleAct, mood: "skeptic", go: onSystem });
  if (read && empty.length) list.push({ key: `gaps:${empty.join("+")}`, title: b.gapsTitle, text: b.gapsText(said(empty.slice(0, 3).map((a) => t.system.areas[a].toLowerCase()), b.and)), act: b.gapsAct, mood: "suspect", go: onAdd });
  const top = others[0];
  if (top) list.push({ key: `others:${top.who}:${top.n}`, title: b.othersTitle, text: b.othersText(top.who, top.n), act: b.othersAct, mood: "smug", go: () => onPerson(top.who) });
  if (quietRef) list.push({ key: `quiet:${quietRef.item.id}`, title: b.quietTitle, text: b.quietText(quietRef.who, refName(t, quietRef.item.name)), act: b.quietAct, mood: "suspect", go: () => onOpen(quietRef.item) });
  if (count >= MANY_REFS && !vote) list.push({ key: "polish", title: b.polishTitle, text: b.polishText(count), act: b.polishAct, mood: "judge", go: onPolish });
  if (oldRef) list.push({ key: `old:${oldRef.item.id}`, title: b.oldTitle, text: cap(b.oldText(refName(t, oldRef.item.name), b.howLong(oldRef.days))), act: b.oldAct, mood: "skeptic", go: () => onOpen(oldRef.item) });
  // What the board holds that is worth a look of its own: one kind per visit, never all of them in a row
  if (onKind && kinds) {
    const worth = (["video", "post", "text"] as const).filter((k) => (kinds[k] ?? 0) >= (k === "text" ? 1 : 2));
    const k = worth.length ? worth[(seed ?? 0) % worth.length] : null;
    if (k) list.push({ key: `kind:${k}`, title: b.kindTitle, text: b.kindText[k](kinds[k]!), act: b.kindAct[k], mood: "accomplice", go: () => onKind(k) });
  }
  // What makes the file better: why each one was saved, one of each site, what the system does not use
  if (noReason) list.push({ key: "why", title: b.whyTitle, text: b.whyText(noReason.n), act: b.whyAct, mood: "skeptic", go: () => onOpen(noReason.item) });
  if (twins && onSearch) list.push({ key: `twins:${twins.host}`, title: b.twinsTitle, text: b.twinsText(twins.n, twins.host), act: b.twinsAct, mood: "judge", go: () => onSearch(twins.host) });
  if (read && unused > 0) list.push({ key: "unused", title: b.unusedTitle, text: b.unusedText(unused), act: b.unusedAct, mood: "suspect", go: onPolish });
  // And what the board says about the taste itself
  if (shared) list.push({ key: `shared:${shared.label}`, title: b.sharedTitle, text: b.sharedText(shared.n, shared.total, shared.label), act: b.sharedAct, mood: "smug", go: shared.go });
  // The team: who is missing here, and a good week said once
  if (missing.length) list.push({ key: `missing:${missing.join("+")}`, title: b.missingTitle, text: b.missingText(said(missing.slice(0, 3), b.and), missing.length), mood: "suspect" });
  if (pace) list.push({ key: `pace:${pace.week}`, once: true, title: b.paceTitle, text: b.paceText(pace.now, pace.before), mood: "admirer" });
  const turn = list.length ? (seed ?? 0) % list.length : 0;
  return [...urgent, ...list.slice(turn), ...list.slice(0, turn)];
}

/** What this person added without a note (texts carry their own words): how many, and the newest to start with */
export function withoutReason(items: InspoItem[], me: string, kindOf: (web: string) => MediaKind, parse: (d: string) => number): { n: number; item: InspoItem } | null {
  const mine = items.filter((i) => i.id && i.addedBy === me && !i.note.trim() && kindOf(i.web) !== "text");
  if (mine.length < 3) return null;
  return { n: mine.length, item: [...mine].sort((a, b) => parse(b.date) - parse(a.date))[0] };
}

/** The site with the most references on the board (sites only: posts, images and texts are not "the same site") */
export function sameSite(items: InspoItem[], kindOf: (web: string) => MediaKind, host: (web: string) => string): { host: string; n: number } | null {
  const by = new Map<string, number>();
  for (const i of items) if (kindOf(i.web) === "web") { const h = host(i.web); by.set(h, (by.get(h) ?? 0) + 1); }
  const [top] = [...by].sort((a, b) => b[1] - a[1]);
  return top && top[1] > 1 ? { host: top[0], n: top[1] } : null;
}

/** References on the board the last pass read that no area uses as evidence */
export function unusedByAreas(boardIds: string[], read: string[], evidence: string[]): number {
  const used = new Set(evidence), seen = new Set(read);
  return boardIds.filter((id) => seen.has(id) && !used.has(id)).length;
}

/** The tag a good part of the board shares (a trait, a colour, a type, a layout, a keyword): at least 4 references
 *  and a third of the board. As a selector for the search ("dark", "c:blue", "y:serif", "k:…") */
export function sharedTag(items: InspoItem[], tags: TagMap): { sel: string; n: number } | null {
  const by = new Map<string, number>();
  for (const i of items) {
    const v = viewOf(tags[i.web]);
    if (!v) continue;
    const sels = [...v.traits, ...v.palette.map((x) => `c:${x}`), ...v.type.map((x) => `y:${x}`), ...v.layout.map((x) => `l:${x}`), ...v.keywords.map((x) => `k:${x}`)];
    for (const sel of new Set(sels)) by.set(sel, (by.get(sel) ?? 0) + 1);
  }
  const [top] = [...by].sort((a, b) => b[1] - a[1]);
  return top && top[1] >= 4 && top[1] * 3 >= items.length ? { sel: top[0], n: top[1] } : null;
}

/** Teammates with nothing on this board yet, by first name, other than me */
export function missingFrom(items: InspoItem[], members: string[], me: string): string[] {
  const here = new Set(items.map((i) => i.addedBy));
  return members.filter((m) => m && m !== me && !here.has(m)).map((m) => m.split(" ")[0]);
}

/** This week's additions to the board against the week before, when at least 5 came in and it doubled. `week`
 *  names the week, so a good one is said once */
export function paceOf(items: InspoItem[], parse: (d: string) => number, now: number): { week: string; now: number; before: number } | null {
  const WEEK = 7 * 24 * 3600 * 1000;
  let a = 0, b = 0;
  for (const i of items) {
    const ago = now - parse(i.date);
    if (!(ago >= 0)) continue;
    if (ago < WEEK) a++; else if (ago < 2 * WEEK) b++;
  }
  if (a < 5 || a < 2 * Math.max(b, 1)) return null;
  return { week: String(Math.floor(now / WEEK)), now: a, before: b };
}

/** How many of each kind the board holds */
export function kindsOf(items: InspoItem[], kindOf: (web: string) => MediaKind): Partial<Record<MediaKind, number>> {
  const out: Partial<Record<MediaKind, number>> = {};
  for (const i of items) { const k = kindOf(i.web); out[k] = (out[k] ?? 0) + 1; }
  return out;
}

/** The oldest reference on the board, two weeks or more, with no note and no comment: worth going over again */
export function oldReference(items: InspoItem[], comments: CommentMap, parse: (d: string) => number, now: number): { item: InspoItem; days: number } | null {
  const found = items
    .filter((i) => i.id && !i.note.trim() && !comments[i.id]?.some((c) => c.body.trim()))
    .map((i) => ({ i, when: parse(i.date) }))
    .filter(({ when }) => when > 0 && now - when > OLD_MS)
    .sort((a, b) => a.when - b.when)[0];
  return found ? { item: found.i, days: Math.floor((now - found.when) / (24 * 3600 * 1000)) } : null;
}

export type Talk = { id: string; who: string; item: InspoItem; body: string };

/** A comment's first words, for his balloon */
/** A reference's name as Tino says it. An X post is kept as "Author · post"; read out with its dot or a colon it is AI
 *  slop (Eric, 06-11), so Tino says it like a person: "el post de Author" */
function refName(t: Dict, name: string): string {
  const m = name.match(/^(.+?)\s+[·•|]\s+.+$/);
  return m ? t.tino.postOf(m[1].trim()) : name;
}
/** A sentence that opens with a name Tino made lower-case ("el post de…") starts upper-case */
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

function excerpt(body: string, max = 90): string {
  const one = body.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max).replace(/\s+\S*$/, "")}…` : one;
}

/** The newest comment of the last week, by someone else, on a reference of this board, that this person has not
 *  answered: nothing of theirs on that reference after it */
export function unansweredTalk(items: InspoItem[], comments: CommentMap, meId: string, now: number): Talk | null {
  let best: (Talk & { at: number }) | null = null;
  for (const item of items) {
    const list = item.id ? comments[item.id] : undefined;
    if (!list?.length) continue;
    const mine = Math.max(0, ...list.filter((c) => c.authorId === meId).map((c) => Date.parse(c.createdAt) || 0));
    for (const c of list) {
      const at = Date.parse(c.createdAt) || 0;
      if (c.authorId === meId || !c.body.trim() || at <= mine || now - at > RECENT_MS) continue;
      if (!best || at > best.at) best = { id: c.id, who: c.authorName.split(" ")[0], item, body: excerpt(c.body), at };
    }
  }
  return best && { id: best.id, who: best.who, item: best.item, body: best.body };
}

/** The newest reference of the last week a teammate added that has no note and no comment: nobody has said a word */
export function quietReference(items: InspoItem[], comments: CommentMap, me: string, parse: (d: string) => number, now: number): { item: InspoItem; who: string } | null {
  const found = items
    .filter((i) => i.id && i.addedBy && i.addedBy !== me && i.addedBy !== "Both" && !i.note.trim() && !comments[i.id]?.some((c) => c.body.trim()))
    .map((i) => ({ i, when: parse(i.date) }))
    .filter(({ when }) => when > 0 && now - when < RECENT_MS)
    .sort((a, b) => b.when - a.when)[0];
  return found ? { item: found.i, who: found.i.addedBy.split(" ")[0] } : null;
}

/** What he says when asked with nothing pending: how the board stands, and its newest reference */
export function boardIdle(t: Dict, items: InspoItem[], parse: (d: string) => number, onOpen: (item: InspoItem) => void): TinoNudge {
  const b = t.tino.board;
  const last = [...items].filter((i) => i.id).sort((a, c) => parse(c.date) - parse(a.date))[0];
  if (!last) return { key: "idle", title: b.idleTitle, text: b.idleText, mood: "watching" };
  return { key: "idle", title: b.idleTitle, text: b.idleBoard(items.length, refName(t, last.name), last.addedBy && last.addedBy !== "Both" ? last.addedBy.split(" ")[0] : ""), act: b.idleAct, mood: "watching", go: () => onOpen(last) };
}

/** Who added what to the board this week, other than me, most first */
export function othersThisWeek(items: { addedBy: string; date: string }[], me: string, parse: (d: string) => number, now: number): { who: string; n: number }[] {
  const by = new Map<string, number>();
  for (const i of items) {
    const when = parse(i.date);
    if (!i.addedBy || i.addedBy === me || i.addedBy === "Both" || !(when > 0 && now - when < RECENT_MS)) continue;
    by.set(i.addedBy, (by.get(i.addedBy) ?? 0) + 1);
  }
  return [...by].map(([who, n]) => ({ who, n })).sort((a, b) => b.n - a.n);
}

/** On the System page: how the file works and what can be done with it, each said once ever, then what is waiting
 *  in it (open proposals, areas still undecided, references not read yet) */
export function systemNudges({ t, project, proposals, undecided, stale, onConnect, onFirstProposal, areas = [], boardIds = [], readIds = [], kept = [], seed = 0, now = 0, onGo }: {
  t: Dict;
  project: string;
  /** Proposals waiting for a yes or a no */
  proposals: number;
  /** Areas with no decision yet */
  undecided: SystemArea[];
  /** References on the board the file has not read yet */
  stale: number;
  /** The handoff: connects the person's agent, which carries on with the landing (ConnectDialog) */
  onConnect: () => void;
  /** Takes the page to the first area with a proposal waiting */
  onFirstProposal: () => void;
  /** The eight areas as they stand: what to read, what to go over */
  areas?: SystemAreaState[];
  /** The board's references, in order */
  boardIds?: string[];
  /** What the last run read */
  readIds?: string[];
  /** What the polish kept (closed with "keep") */
  kept?: string[];
  /** Changes with each visit: which of the non-urgent things he leads with */
  seed?: number;
  now?: number;
  /** Takes the page to an area, or to the references ("refs") */
  onGo?: (part: SystemArea | "refs") => void;
}): TinoNudge[] {
  const s = t.tino.system;
  const list: TinoNudge[] = [];
  const name = (a: SystemArea) => t.system.areas[a].toLowerCase();
  // How it works first, while it is new: each said once ever, so the second visit goes straight to what is waiting
  list.push({ key: "how:file", once: true, title: s.fileTitle, text: s.fileText(project), mood: "watching" });
  list.push({ key: "how:take", once: true, title: s.takeTitle, text: s.takeText, act: s.takeAct, mood: "smug", go: onConnect });
  if (proposals > 0) list.push({ key: `proposals:${proposals}`, title: s.proposalsTitle, text: s.proposalsText(proposals), act: s.proposalsAct, mood: "accomplice", go: onFirstProposal });
  if (undecided.length) {
    list.push({ key: `undecided:${undecided.join("+")}`, title: s.undecidedTitle, text: s.undecidedText(said(undecided.slice(0, 3).map((a) => t.system.areas[a].toLowerCase()), s.and), undecided.length), mood: "skeptic" });
  }
  if (stale > 0) list.push({ key: `stale:${stale}`, title: t.tino.board.staleTitle, text: s.staleText(stale), mood: "skeptic" });
  // What the file holds, to read and go over: these take turns from one visit to the next
  const more: TinoNudge[] = [];
  if (onGo) {
    const pick = <T,>(xs: T[]) => xs[seed % xs.length];
    // Proposed by the model and never confirmed by a person: read it and say yes
    const unconfirmed = areas.filter((a) => a.decision && a.source === "model");
    if (unconfirmed.length) { const a = pick(unconfirmed); more.push({ key: `read:${a.area}`, title: s.readTitle, text: s.readText(name(a.area), unconfirmed.length), act: s.readAct(name(a.area)), mood: "watching", go: () => onGo(a.area) }); }
    // Decided on very little
    const thin = areas.filter((a) => a.decision && a.evidence.length > 0 && a.evidence.length <= 2);
    if (thin.length) { const a = pick(thin); more.push({ key: `thin:${a.area}`, title: s.thinTitle, text: s.thinText(name(a.area), a.evidence.length), act: s.goOver(name(a.area)), mood: "skeptic", go: () => onGo(a.area) }); }
    // Still citing what the polish (or anyone) took off the board
    const board = new Set(boardIds);
    const ghosts = areas.map((a) => ({ a, n: a.evidence.filter((e) => !board.has(e.itemId)).length })).filter((x) => x.n > 0);
    if (ghosts.length) { const { a, n } = pick(ghosts); more.push({ key: `ghost:${a.area}:${n}`, title: s.ghostTitle, text: s.ghostText(name(a.area), n), act: s.goOver(name(a.area)), mood: "suspect", go: () => onGo(a.area) }); }
    // Untouched for weeks
    const DAY = 24 * 3600 * 1000;
    const old = areas.filter((a) => a.decision && now - Date.parse(a.updatedAt) > 21 * DAY).sort((x, y) => Date.parse(x.updatedAt) - Date.parse(y.updatedAt));
    if (old.length) { const a = old[0]; more.push({ key: `old:${a.area}`, title: s.oldTitle, text: s.oldText(name(a.area), t.tino.board.howLong(Math.floor((now - Date.parse(a.updatedAt)) / DAY))), act: s.goOver(name(a.area)), mood: "skeptic", go: () => onGo(a.area) }); }
    // What the polish kept: how it reads in the file, and what the file has not read yet
    const keptHere = kept.filter((id) => board.has(id));
    if (keptHere.length) {
      const seen = new Set(readIds);
      const unread = keptHere.filter((id) => !seen.has(id)).length;
      more.push({ key: `kept:${keptHere.length}:${unread}`, title: s.keptTitle, text: s.keptText(keptHere.length, unread), act: s.keptAct, mood: "smug", go: () => onGo("refs") });
    }
  }
  const turn = more.length ? seed % more.length : 0;
  return [...list, ...more.slice(turn), ...more.slice(0, turn)];
}

/** What he says on the System page when asked with nothing pending: how the file stands, and the area touched last */
export function systemIdle(t: Dict, areas: SystemAreaState[], now: number, onGo: (area: SystemArea) => void): TinoNudge {
  const s = t.tino.system;
  const decided = areas.filter((a) => a.decision);
  // Nothing decided yet: the first area, never a shrug
  if (!decided.length) {
    const first = areas[0];
    if (!first) return { key: "idle", title: s.idleTitle, text: s.idleText, mood: "watching" };
    const area = t.system.areas[first.area];
    return { key: "idle", title: s.idleTitle, text: s.idleEmpty(area.toLowerCase()), act: s.idleAct(area.toLowerCase()), mood: "accomplice", go: () => onGo(first.area) };
  }
  const last = [...decided].sort((x, y) => Date.parse(y.updatedAt) - Date.parse(x.updatedAt))[0];
  const days = Math.floor((now - Date.parse(last.updatedAt)) / (24 * 3600 * 1000));
  const area = t.system.areas[last.area];
  return { key: "idle", title: s.idleTitle, text: s.idleFile(decided.length, areas.length, decided.filter((a) => a.source === "team").length, area, days < 1 ? "" : t.tino.board.howLong(days)), act: s.idleAct(area.toLowerCase()), mood: "watching", go: () => onGo(last.area) };
}

/** In the Inbox, when nobody searches: what is loose here pushes towards a project, or out. A teammate talking to
 *  you first; the rest takes turns from one visit to the next (`seed`). Never "nothing to say" (Eric, 06-11: "tiene
 *  que ser proactivo y decirte cosas que te inciten a hacer otras siempre") */
export function inboxNudges({ t, items, comments, meId, me, now, seed = 0, tags, kindOf, host, parse, onOpen, onKind, onSearch, onFilter, onProject, label }: {
  t: Dict;
  /** What is in the Inbox */
  items: InspoItem[];
  comments: CommentMap;
  meId: string;
  /** This person's name, as `addedBy` carries it */
  me: string;
  now: number;
  seed?: number;
  tags: TagMap;
  kindOf: (web: string) => MediaKind;
  host: (web: string) => string;
  parse: (d: string) => number;
  onOpen: (item: InspoItem) => void;
  onKind: (kind: MediaKind) => void;
  onSearch: (words: string) => void;
  /** Narrows the Inbox to one tag selector; `label` is how it is said */
  onFilter: (sel: string) => void;
  /** Takes the person to where a project is named */
  onProject: () => void;
  label: (sel: string) => string;
}): TinoNudge[] {
  const b = t.tino.board, x = t.tino.inbox;
  const urgent: TinoNudge[] = [];
  const list: TinoNudge[] = [];
  const talk = unansweredTalk(items, comments, meId, now);
  if (talk) urgent.push({ key: `talk:${talk.id}`, title: b.talkTitle, text: b.talkText(talk.who, refName(t, talk.item.name), talk.body), act: b.talkAct, mood: "accomplice", go: () => onOpen(talk.item) });
  // The one that has been loose the longest: to a project or out
  const dated = items.filter((i) => i.id).map((i) => ({ i, when: parse(i.date) })).filter(({ when }) => when > 0);
  const oldest = [...dated].sort((a, c) => a.when - c.when)[0];
  const DAY = 24 * 3600 * 1000;
  if (oldest && now - oldest.when > 3 * DAY) list.push({ key: `loose:${oldest.i.id}`, title: x.looseTitle, text: cap(x.looseText(refName(t, oldest.i.name), b.howLong(Math.floor((now - oldest.when) / DAY)))), act: x.looseAct, mood: "skeptic", go: () => onOpen(oldest.i) });
  // Enough loose for a project of their own
  if (items.length >= FEW_REFS) list.push({ key: "project", title: x.projectTitle, text: x.projectText(items.length), act: x.projectAct, mood: "accomplice", go: onProject });
  // What a good part of them share: that is a project asking to be named
  const top = sharedTag(items, tags);
  if (top) list.push({ key: `shared:${top.sel}`, title: b.sharedTitle, text: x.sharedText(top.n, items.length, label(top.sel)), act: b.sharedAct, mood: "smug", go: () => onFilter(top.sel) });
  const kinds = kindsOf(items, kindOf);
  const worth = (["video", "post", "text"] as const).filter((k) => (kinds[k] ?? 0) >= (k === "text" ? 1 : 2));
  const k = worth.length ? worth[seed % worth.length] : null;
  if (k) list.push({ key: `kind:${k}`, title: b.kindTitle, text: b.kindText[k](kinds[k]!), act: b.kindAct[k], mood: "accomplice", go: () => onKind(k) });
  const noReason = withoutReason(items, me, kindOf, parse);
  if (noReason) list.push({ key: "why", title: b.whyTitle, text: b.whyText(noReason.n), act: b.whyAct, mood: "skeptic", go: () => onOpen(noReason.item) });
  const twins = sameSite(items, kindOf, host);
  if (twins) list.push({ key: `twins:${twins.host}`, title: b.twinsTitle, text: b.twinsText(twins.n, twins.host), act: b.twinsAct, mood: "judge", go: () => onSearch(twins.host) });
  const turn = list.length ? seed % list.length : 0;
  return [...urgent, ...list.slice(turn), ...list.slice(0, turn)];
}

/** What he says in the Inbox when asked with nothing pending: the newest loose one, and where it goes */
export function inboxIdle(t: Dict, items: InspoItem[], parse: (d: string) => number, onOpen: (item: InspoItem) => void): TinoNudge {
  const x = t.tino.inbox;
  const last = [...items].filter((i) => i.id).sort((a, c) => parse(c.date) - parse(a.date))[0];
  if (!last) return { key: "idle", title: t.tino.board.idleTitle, text: t.tino.board.idleText, mood: "watching" };
  return { key: "idle", title: t.tino.board.idleTitle, text: x.idleText(items.length, refName(t, last.name)), act: x.looseAct, mood: "watching", go: () => onOpen(last) };
}
