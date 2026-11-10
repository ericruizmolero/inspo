// The mark of the AI app something came through (`via`, the client's name over MCP: lib/mcp/auth.ts), so what an
// agent saved wears its app's logo and not the face of the person it works for (Eric, 10-11). The person stays in
// the words: "From Claude, by Eric".

const MARKS: [RegExp, string][] = [
  [/claude/i, "/agents/claude.svg"],
  [/chatgpt|openai/i, "/agents/chatgpt.svg"],
  [/gemini/i, "/agents/gemini.svg"],
];

/** The logo of a known app, else null (the avatar then shows the app's initial in the chrome tone) */
export function agentMark(via: string | null | undefined): string | null {
  if (!via) return null;
  return MARKS.find(([re]) => re.test(via))?.[1] ?? null;
}
