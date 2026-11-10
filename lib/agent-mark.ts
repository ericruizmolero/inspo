// The mark of the AI app something came through (`via`, the client's name over MCP: lib/mcp/auth.ts). It goes small
// on the corner of the person's avatar (AgentBadge), with no circle behind: the shape alone, painted as a CSS mask
// in the app's colour, so ChatGPT's knot follows the text colour of each theme (Eric, 10-11).

export interface AgentMark {
  /** The shape, a one-colour SVG in public/agents/ */
  src: string;
  /** What paints it: a colour, a gradient or a token */
  paint: string;
}

const MARKS: [RegExp, AgentMark][] = [
  [/claude/i, { src: "/agents/claude.svg", paint: "#D97757" }],
  [/chatgpt|openai/i, { src: "/agents/chatgpt.svg", paint: "var(--text)" }],
  [/gemini/i, { src: "/agents/gemini.svg", paint: "linear-gradient(135deg, #4796E3, #9177C7 55%, #CA6673)" }],
];

/** The mark of a known app, else null (the avatar then shows the app's initial in the chrome tone) */
export function agentMark(via: string | null | undefined): AgentMark | null {
  if (!via) return null;
  return MARKS.find(([re]) => re.test(via))?.[1] ?? null;
}
