// Tino's faces, as the copy sheet names them (watching, skeptic, suspect, smug…), each one a pose of the engine
// (ears, eyes and how they move: POSES in engine.js) and what runs inside the visor while he rests. A line of
// his names its face; this table is the only place that says what the face looks like. No face turns his head.
import type { TinoShow, TinoState } from "./engine";

export type TinoMood =
  | "watching" | "following" | "thinking" | "searching"
  | "skeptic" | "suspect" | "smug" | "admirer"
  | "judge" | "accomplice" | "asleep" | "sad";

export const MOODS: Record<TinoMood, { state: TinoState; show?: TinoShow }> = {
  watching: { state: "reposo", show: "barrido" },
  following: { state: "siguiendo", show: "mirada" },
  thinking: { state: "pensando" },
  searching: { state: "buscando", show: "ecualizador" },
  skeptic: { state: "esceptica" },
  suspect: { state: "sospechosa" },
  smug: { state: "satisfecha" },
  admirer: { state: "admirada" },
  judge: { state: "descarta" },
  accomplice: { state: "complice" },
  asleep: { state: "dormida" },
  sad: { state: "error" },
};

/** The Tino props a face sets: its pose and its visor. He looks at the screen unless a page turns him (look) */
export function moodProps(mood: TinoMood, look?: [number, number]) {
  const m = MOODS[mood];
  return { state: m.state, show: m.show ?? "barrido", look };
}
