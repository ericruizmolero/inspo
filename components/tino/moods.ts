// Tino's faces, as the copy sheet names them (watching, skeptic, suspect, smug…), each one a pose of the engine
// (ears, eyes, the turn of the head: POSES in engine.js) and what runs inside the visor while he rests. A line of
// his names its face; this table is the only place that says what the face looks like. `front`: the poses with no
// turn of their own look nearly at the screen; the rest bring their own turn and must not be overridden.
import type { TinoShow, TinoState } from "./engine";

export type TinoMood =
  | "watching" | "following" | "thinking" | "searching"
  | "skeptic" | "suspect" | "smug" | "admirer"
  | "judge" | "accomplice" | "asleep" | "sad";

export const MOODS: Record<TinoMood, { state: TinoState; show?: TinoShow; front?: boolean }> = {
  watching: { state: "reposo", show: "barrido", front: true },
  following: { state: "siguiendo", show: "mirada", front: true },
  thinking: { state: "pensando", front: true },
  searching: { state: "buscando", show: "ecualizador", front: true },
  skeptic: { state: "esceptica", front: true },
  suspect: { state: "sospechosa", front: true },
  smug: { state: "satisfecha", front: true },
  admirer: { state: "admirada", front: true },
  judge: { state: "descarta", front: true },
  accomplice: { state: "complice", front: true },
  asleep: { state: "dormida", front: true },
  sad: { state: "error", front: true },
};

/** Nearly at the screen, a little to the side: where a face with no turn of its own looks */
export const FRONT: [number, number] = [110, 0];

/** The Tino props a face sets: its pose, its visor, and where it looks (nowhere of its own when the pose turns) */
export function moodProps(mood: TinoMood, look?: [number, number]) {
  const m = MOODS[mood];
  return { state: m.state, show: m.show ?? "barrido", look: look ?? (m.front ? FRONT : undefined) };
}
