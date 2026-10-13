// A text reference's Markdown, coloured the way Bear writes it: every mark stays where it was typed, dimmed, and
// what it means is set on the words. Every character of the source is in the HTML once and in order, so the
// editor (components/TextPage.tsx) can put the caret back by counting characters after each redraw.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mark = (s: string) => (s ? `<span class="mde-mark">${esc(s)}</span>` : "");
const safeHref = (url: string) => (/^(https?:|mailto:)/i.test(url) ? url : null);

type Opts = { links: boolean };

const INLINE = new RegExp([
  /(`+)([^`]|[^`][\s\S]*?[^`])\1/.source,
  /\*\*(?=\S)([^*]*?\S)\*\*/.source,
  /__(?=\S)([^_]*?\S)__/.source,
  /\*(?=[^\s*])([^*]*?[^\s*])\*/.source,
  /(?<![\p{L}\p{N}_])_(?=[^\s_])([^_]*?[^\s_])_(?![\p{L}\p{N}_])/u.source,
  /~~(?=\S)([^~]*?\S)~~/.source,
  /\[([^\]\n]+)\]\(([^)\s]+)\)/.source,
].join("|"), "gu");

function inline(text: string, o: Opts): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += esc(text.slice(last, m.index));
    last = m.index + m[0].length;
    const [all, ticks, code, bold, bold2, em, em2, strike, label, url] = m;
    if (ticks) out += `<span class="mde-code">${mark(ticks)}${esc(code)}${mark(ticks)}</span>`;
    else if (bold ?? bold2) out += `<b class="mde-b">${mark(all.slice(0, 2))}${inline(bold ?? bold2, o)}${mark(all.slice(0, 2))}</b>`;
    else if (em ?? em2) out += `<i class="mde-i">${mark(all[0])}${inline(em ?? em2, o)}${mark(all[0])}</i>`;
    else if (strike) out += `<s class="mde-s">${mark("~~")}${inline(strike, o)}${mark("~~")}</s>`;
    else {
      const href = o.links ? safeHref(url) : null;
      const words = href ? `<a class="mde-link" href="${esc(href)}" target="_blank" rel="noreferrer">${inline(label, o)}</a>` : `<span class="mde-link">${inline(label, o)}</span>`;
      out += `${mark("[")}${words}${mark("](")}<span class="mde-mark mde-url">${esc(url)}</span>${mark(")")}`;
    }
  }
  return out + esc(text.slice(last));
}

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6}[ \t]+)(.*)$/;
const RULE = /^\s*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^(\s*>[ \t]?)(.*)$/;
const TASK = /^(\s*(?:[-*+]|\d+[.)])[ \t]+)\[([ xX])\]([ \t]+|$)(.*)$/;
const ITEM = /^(\s*(?:[-*+]|\d+[.)])[ \t]+)(.*)$/;

function line(text: string, o: Opts): string {
  let m: RegExpMatchArray | null;
  if ((m = text.match(HEADING))) return `<span class="mde-h mde-h${m[1].trim().length}">${mark(m[1])}${inline(m[2], o)}</span>`;
  if (RULE.test(text)) return `<span class="mde-mark mde-rule">${esc(text)}</span>`;
  if ((m = text.match(QUOTE))) return `<span class="mde-q">${mark(m[1])}${inline(m[2], o)}</span>`;
  if ((m = text.match(TASK))) {
    const done = m[2] !== " ";
    return `<span class="mde-li mde-task${done ? " is-done" : ""}">${mark(`${m[1]}[`)}<span class="mde-check">${esc(m[2])}</span>${mark(`]${m[3]}`)}${inline(m[4], o)}</span>`;
  }
  if ((m = text.match(ITEM))) return `<span class="mde-li">${mark(m[1])}${inline(m[2], o)}</span>`;
  return inline(text, o);
}

/** The Markdown as HTML spans, its text unchanged. `links`: a link is an anchor that opens (only where it is read, not typed) */
export function highlightMarkdown(src: string, { links = false }: Partial<Opts> = {}): string {
  const o = { links };
  let fenced = false;
  return src.split("\n").map((text) => {
    if (FENCE.test(text)) { fenced = !fenced; return `<span class="mde-mark mde-fence">${esc(text)}</span>`; }
    return fenced ? `<span class="mde-pre">${esc(text)}</span>` : line(text, o);
  }).join("\n");
}

/** What Enter writes after a list line: the next marker, or "" to end the list when the line was only its marker */
export function continueList(lineText: string): { next: string } | { end: true } | null {
  const task = lineText.match(TASK);
  const item = task ?? lineText.match(ITEM);
  if (!item) return null;
  const rest = task ? task[4] : item[2];
  if (!rest.trim()) return { end: true };
  const marker = item[1].replace(/\d+(?=[.)])/, (n) => String(Number(n) + 1));
  return { next: task ? `${marker}[ ] ` : marker };
}
