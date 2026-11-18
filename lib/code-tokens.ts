// A small highlighter for the code a Vault entry documents (components/Vault.tsx): HTML, CSS and JavaScript split
// into a few kinds of token, line by line, for the reader's eye and nothing else. Not a parser: one pass of a regular
// expression per language, and whatever it does not know stays plain. Every character of the source comes out once
// and in order, so what is shown is what is copied. No dependencies: shared by client and server.

/** c: a comment · s: a string · k: a keyword, a tag or an at-rule · a: an attribute, a property or a call · n: a number or a colour */
export type TokenKind = "c" | "s" | "k" | "a" | "n";
export interface Token { text: string; kind?: TokenKind }

const KINDS: TokenKind[] = ["c", "s", "k", "a", "n"];
const STRING = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/.source;
const join = (parts: Record<TokenKind, string>, flags = "g") => new RegExp(KINDS.map((k) => `(${parts[k]})`).join("|"), flags);

const HTML = join({
  c: /<!--[\s\S]*?-->/.source,
  s: STRING,
  k: /<\/?[A-Za-z][\w:-]*|\/?>/.source,
  a: /(?<=\s)[\w:@.-]+(?==)/.source,
  n: /(?!)/.source,
});
const CSS = join({
  c: /\/\*[\s\S]*?\*\//.source,
  s: STRING,
  k: /@[\w-]+|!important/.source,
  // A property: a name before a colon, right after a brace, a semicolon or a line's indent (so a top-level selector's pseudo-class is left alone)
  a: /(?<=[{;]\s*|^[ \t]+)-{0,2}[A-Za-z][\w-]*(?=\s*:)/.source,
  n: /#[0-9a-fA-F]{3,8}\b|(?<![\w-])-?\d*\.?\d+(?:[a-z]{1,4}|%)?(?![\w-])/.source,
}, "gm");
const JS = join({
  c: /\/\/[^\n]*|\/\*[\s\S]*?\*\//.source,
  s: `${STRING}|\`(?:\\\\.|[^\`\\\\])*\``,
  k: /\b(?:const|let|var|function|return|if|else|for|while|do|of|in|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|switch|case|break|continue|null|undefined|true|false|this)\b|=>/.source,
  a: /[A-Za-z_$][\w$]*(?=\()/.source,
  n: /\b\d[\d_]*(?:\.\d+)?\b/.source,
});

const BY_LANG: Record<string, RegExp> = { html: HTML, htm: HTML, svg: HTML, css: CSS, js: JS, javascript: JS, mjs: JS, ts: JS, tsx: JS, jsx: JS, json: JS };

/** The code as lines of tokens. A token never spans a line: a comment over three lines is three tokens of its kind */
export function tokenLines(lang: string, code: string): Token[][] {
  const re = BY_LANG[lang.toLowerCase()];
  const tokens: Token[] = [];
  let last = 0;
  if (re) {
    for (const m of code.matchAll(re)) {
      if (!m[0]) continue;
      if (m.index > last) tokens.push({ text: code.slice(last, m.index) });
      tokens.push({ text: m[0], kind: KINDS[m.slice(1).findIndex((g) => g !== undefined)] });
      last = m.index + m[0].length;
    }
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split("\n");
    parts.forEach((text, i) => {
      if (i) lines.push([]);
      if (text) lines[lines.length - 1].push({ text, kind: t.kind });
    });
  }
  return lines;
}
