// Skills inside criterio.md. A team switches one on and the file gains a section that tells an agent how to
// build part of the system with a given tool. The point is that the file alone is enough: whoever pastes it
// into any AI gets the craft (what the tool's own skills would teach) and the project's own numbers, with
// nothing to install. Each skill has two halves:
//   - the craft, written here, the same for every project;
//   - the project, read from the system: the area's decision and never list, the curves the team kept, the
//     durations named. Two projects with the same skill on get different sections.
// Shared by client (the Markdown view) and server (scripts). Plain data in, lines out: no model call.
import type { ProjectSystem, SystemAreaState } from "@/types/system";

export const MD_SKILLS = ["gsap"] as const;
export type MdSkill = (typeof MD_SKILLS)[number];

type Lang = "en" | "es";

/** A curve the project uses, ready for GSAP */
interface Curve { name: string; points: string | null; gsap: string; ms: number | null; source: string }

// CSS keywords as bezier points, so they can become a CustomEase like any other curve
const CSS_KEYWORDS: Record<string, string | null> = {
  ease: "0.25,0.1,0.25,1", "ease-in": "0.42,0,1,1", "ease-out": "0,0,0.58,1", "ease-in-out": "0.42,0,0.58,1", linear: null,
};
const BEZIER_RE = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/gi;
const GSAP_EASE_RE = /\b(?:power[0-4]|sine|expo|circ|quad|cubic|quart|quint|strong)\.(?:in|out|inOut)\b/g;
const DURATION_RE = /(\d+(?:[.,]\d+)?)\s*(ms|s)\b/g;

const num = (s: string) => String(Number(parseFloat(s).toFixed(3)));

/** The curves and durations the project has chosen: what the team kept in the area's curation, and what its decision names */
function motionFacts(a: SystemAreaState | undefined) {
  const curves: Curve[] = [];
  const seen = new Set<string>();
  const add = (c: Omit<Curve, "name">) => {
    const key = c.points ?? c.gsap;
    if (seen.has(key)) return;
    seen.add(key);
    curves.push({ ...c, name: c.points ? `criterio-${curves.filter((x) => x.points).length + 1}` : c.gsap });
  };
  const kept = new Set((a?.curation?.verdicts ?? []).filter((v) => v.keep).map((v) => v.id));
  for (const cand of a?.curation?.candidates ?? []) {
    const easing = cand.visual.easing?.trim();
    if (!kept.has(cand.id) || !easing) continue;
    const m = [...easing.matchAll(BEZIER_RE)][0];
    const points = m ? m.slice(1, 5).map(num).join(",") : CSS_KEYWORDS[easing.toLowerCase()];
    if (points === undefined) continue;
    add({ points, gsap: points ? "" : "none", ms: cand.visual.durationMs ?? null, source: easing });
  }
  const text = a?.decision ?? "";
  for (const m of text.matchAll(BEZIER_RE)) add({ points: m.slice(1, 5).map(num).join(","), gsap: "", ms: null, source: m[0] });
  for (const m of text.matchAll(GSAP_EASE_RE)) add({ points: null, gsap: m[0], ms: null, source: m[0] });
  const durations = [...new Set([...text.matchAll(DURATION_RE)].map((m) => Math.round(parseFloat(m[1].replace(",", ".")) * (m[2] === "s" ? 1000 : 1))))]
    .filter((ms) => ms > 0 && ms <= 10000);
  return { curves, durations };
}

const T = {
  en: {
    heading: "Build it: motion with GSAP",
    lead: "Switched on in criterio.design. How to build the Motion area above with GSAP. The Motion area rules: where it and this section disagree, the area wins.",
    project: "This project",
    decision: "Motion, as decided",
    open: "The Motion area is still open. Use the defaults below and keep motion to feedback on what can be pressed until the team decides.",
    curves: "Curves",
    curvesHint: "Register the custom ones once and use every curve by name. A duration is what the reference measured.",
    durations: "Durations the decision names",
    never: "Never (from the Motion area)",
    defaults: "Defaults, while the area names no numbers",
    defaultsRows: [
      "Hover, focus, press: 0.15 to 0.25 s, `power2.out`. A press is `scale: 0.97` and back.",
      "Things entering: 0.4 to 0.6 s, `power3.out`, from `y: 16` and `autoAlpha: 0`.",
      "Things leaving: shorter than they entered, `power2.in`.",
      "Lists: `stagger: 0.04` to `0.08`. More than 12 items: batch them.",
      "Nothing overshoots unless the area asks for it.",
    ],
    craft: "The craft",
    setup: "`npm i gsap` (and `@gsap/react` in React). Every plugin is free since 2025: register what you use with `gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip)`. An agent that takes skills can also install GreenSock's own: `npx skills add https://github.com/greensock/gsap-skills`.",
    rules: [
      "Animate `x`, `y`, `scale`, `rotation` and `autoAlpha`, never `top`, `left`, `width`, `height` or `box-shadow`: transforms do not move the layout. `autoAlpha` also hides what reaches 0, so it stops taking clicks.",
      "Sequence with `gsap.timeline()` and the position parameter (`\"<\"`, `\"-=0.2\"`, labels), not with chained `delay`s.",
      "Wrap everything in `gsap.matchMedia()`: one branch for `(prefers-reduced-motion: no-preference)`, and with reduced motion only opacity, short, or nothing.",
      "Micro-animations: absolute values on enter and leave (`y: -2`, then `y: 0`), never relative ones (`\"-=2\"`) that pile up. `overwrite: \"auto\"` so a quick in and out does not fight itself. Anything that follows the pointer goes through `gsap.quickTo()`.",
      "Start states belong to GSAP: use `gsap.from()` or `gsap.set()`, not `opacity: 0` in the CSS, and never `clearProps: \"all\"` over an element the CSS hides.",
      "Scroll reveals: `ScrollTrigger` with `once: true`; long lists with `ScrollTrigger.batch()`. `scrub` only where the scroll tells a story.",
      "Anything that loops pauses off screen (a `ScrollTrigger` with `toggleActions: \"play pause resume pause\"`).",
      "Layout changes (filter, sort, expand) with `Flip`: `Flip.getState()`, change the DOM, `Flip.from()`.",
      "Text with `SplitText`: `type: \"lines\"` or `\"words\"`, `tag: \"span\"`, `mask: \"lines\"` for reveals, `autoSplit: true` so it splits again once the fonts load.",
      "Toggles (expand, open, close): one paused timeline and `tl.reversed() ? tl.play() : tl.reverse()`.",
      "React: `useGSAP(() => {…}, { scope: ref, dependencies })` instead of `useEffect`, and event handlers inside `contextSafe`. It cleans up on unmount.",
      "Elsewhere: create inside `gsap.context()` and call `ctx.revert()` on teardown. Kill every ScrollTrigger you made.",
    ],
  },
  es: {
    heading: "Construirlo: movimiento con GSAP",
    lead: "Activado en criterio.design. Cómo construir con GSAP el área de Movimiento de arriba. Manda el área: si esta sección y ella no coinciden, gana el área.",
    project: "Este proyecto",
    decision: "El movimiento, tal como se ha decidido",
    open: "El área de Movimiento sigue abierta. Usa los valores por defecto de abajo y limita el movimiento a responder a lo que se puede pulsar hasta que el equipo decida.",
    curves: "Curvas",
    curvesHint: "Registra una vez las propias y usa cada curva por su nombre. La duración es la que midió la referencia.",
    durations: "Duraciones que nombra la decisión",
    never: "Nunca (del área de Movimiento)",
    defaults: "Valores por defecto, mientras el área no dé números",
    defaultsRows: [
      "Hover, foco y pulsación: de 0,15 a 0,25 s, `power2.out`. Pulsar es `scale: 0.97` y volver.",
      "Lo que entra: de 0,4 a 0,6 s, `power3.out`, desde `y: 16` y `autoAlpha: 0`.",
      "Lo que sale: más corto de lo que entró, `power2.in`.",
      "Listas: `stagger: 0.04` a `0.08`. Más de 12 elementos: por lotes.",
      "Nada se pasa de largo salvo que el área lo pida.",
    ],
    craft: "El oficio",
    setup: "`npm i gsap` (y `@gsap/react` en React). Todos los plugins son gratis desde 2025: registra los que uses con `gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip)`. Un agente que acepte skills puede instalar además las de GreenSock: `npx skills add https://github.com/greensock/gsap-skills`.",
    rules: [
      "Anima `x`, `y`, `scale`, `rotation` y `autoAlpha`, nunca `top`, `left`, `width`, `height` ni `box-shadow`: las transformaciones no mueven el layout. `autoAlpha` además oculta lo que llega a 0, y deja de recibir clics.",
      "Encadena con `gsap.timeline()` y el parámetro de posición (`\"<\"`, `\"-=0.2\"`, etiquetas), no con `delay` encadenados.",
      "Todo dentro de `gsap.matchMedia()`: una rama para `(prefers-reduced-motion: no-preference)` y, con movimiento reducido, solo opacidad, corta, o nada.",
      "Microanimaciones: valores absolutos al entrar y al salir (`y: -2` y luego `y: 0`), nunca relativos (`\"-=2\"`), que se acumulan. `overwrite: \"auto\"` para que un entrar y salir rápido no se pelee consigo mismo. Lo que sigue al cursor va con `gsap.quickTo()`.",
      "Los estados iniciales son de GSAP: usa `gsap.from()` o `gsap.set()`, no `opacity: 0` en el CSS, y nunca `clearProps: \"all\"` sobre algo que el CSS oculta.",
      "Apariciones al hacer scroll: `ScrollTrigger` con `once: true`; listas largas con `ScrollTrigger.batch()`. `scrub` solo donde el scroll cuenta una historia.",
      "Todo lo que se repite se pausa fuera de pantalla (un `ScrollTrigger` con `toggleActions: \"play pause resume pause\"`).",
      "Cambios de layout (filtrar, ordenar, desplegar) con `Flip`: `Flip.getState()`, cambiar el DOM, `Flip.from()`.",
      "Texto con `SplitText`: `type: \"lines\"` o `\"words\"`, `tag: \"span\"`, `mask: \"lines\"` para revelar y `autoSplit: true` para que vuelva a partir cuando carguen las fuentes.",
      "Interruptores (desplegar, abrir, cerrar): una timeline en pausa y `tl.reversed() ? tl.play() : tl.reverse()`.",
      "React: `useGSAP(() => {…}, { scope: ref, dependencies })` en vez de `useEffect`, y los manejadores de eventos dentro de `contextSafe`. Se limpia sola al desmontar.",
      "Fuera de React: crea dentro de `gsap.context()` y llama a `ctx.revert()` al desmontar. Mata cada ScrollTrigger que crees.",
    ],
  },
} satisfies Record<Lang, unknown>;

const secs = (ms: number, lang: Lang) => `${String(Number((ms / 1000).toFixed(3))).replace(".", lang === "es" ? "," : ".")} s`;

function gsapLines(system: ProjectSystem, lang: Lang): string[] {
  const s = T[lang];
  const a = system.areas.find((x) => x.area === "motion");
  const { curves, durations } = motionFacts(a);
  const L: string[] = [`> ${s.lead}`, "", `### ${s.project}`, ""];
  if (a?.decision) L.push(`**${s.decision}:** ${a.decision.replace(/\s+/g, " ").trim()}`, "");
  else L.push(`_${s.open}_`, "");
  if (curves.length) {
    L.push(`**${s.curves}.** ${s.curvesHint}`, "");
    // GSAP's own eases need no registering: the code block only appears for the project's own curves
    if (curves.some((c) => c.points)) {
      L.push("```js", "gsap.registerPlugin(CustomEase);");
      for (const c of curves) if (c.points) L.push(`CustomEase.create("${c.name}", "${c.points}"); // ${c.source}${c.ms ? `, ${c.ms} ms` : ""}`);
      L.push("```", "");
    }
    for (const c of curves) L.push(`- \`ease: "${c.name}"\`${c.ms ? `, \`duration: ${Number((c.ms / 1000).toFixed(3))}\`` : ""}${c.points || c.source === c.name ? "" : ` (${c.source})`}`);
    L.push("");
  }
  // A duration already given with its curve is not repeated
  const loose = durations.filter((ms) => !curves.some((c) => c.ms === ms));
  if (loose.length) L.push(`**${s.durations}:** ${loose.map((ms) => secs(ms, lang)).join(", ")}`, "");
  const never = (a?.never ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (never.length) L.push(`**${s.never}:**`, ...never.map((l) => `- ${l}`), "");
  if (!curves.length && !durations.length) L.push(`**${s.defaults}:**`, ...s.defaultsRows.map((r) => `- ${r}`), "");
  L.push(`### ${s.craft}`, "", s.setup, "", ...s.rules.map((r) => `- ${r}`));
  return L;
}

/** The sections the switched-on skills add to criterio.md, as blocks of the file */
export function skillSections(system: ProjectSystem, skills: readonly string[], locale: string = "en"): { id: string; heading: string; lines: string[] }[] {
  const lang: Lang = locale === "es" ? "es" : "en";
  const out: { id: string; heading: string; lines: string[] }[] = [];
  if (skills.includes("gsap")) out.push({ id: "skill:gsap", heading: T[lang].heading, lines: gsapLines(system, lang) });
  return out;
}
