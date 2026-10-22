/** Tipos del motor de Tino (engine.js). Lo usa <Tino />; no hace falta importarlo directamente. */

export type TinoState = "reposo" | "dormida" | "esceptica" | "sospechosa" | "satisfecha" | "admirada" | "curiosa" | "leyendo" | "aprueba" | "pensando" | "descarta" | "senala" | "error" | "pulsa" | "caricia";
export type TinoEars = "capsula" | "hoja" | "punta" | "corta" | "caida" | "antena";
export type TinoBottom = "redonda" | "media" | "plana";
export type TinoMaterial = "flocado" | "arcilla" | "cromo" | "irisado" | "perla" | "cristal" | "plastico" | "casco";
export type TinoVisor = "banda" | "lentes" | "ojo" | "ranura" | "pantalla" | "pixeles";
export type TinoVisorStyle = "cristal" | "crt" | "lcd" | "led" | "oro" | "holo";
export type TinoShow = "barrido" | "mirada" | "ecualizador" | "texto" | "lluvia" | "latido" | "onda";
export type TinoPet = "felices" | "corazones" | "chispas" | "sorpresa";

export interface TinoOptions {
  /** Carpeta de los modelos. Por defecto "/tino/" (public/tino/). */
  base?: string;
  /** "center": Tino entero y centrado en el lienzo, quepa como quepa. Sin él, el encuadre de la landing (arriba fija). */
  frame?: "center";
  state?: TinoState;
  ears?: TinoEars;
  bottom?: TinoBottom;
  material?: TinoMaterial;
  /** Color del peluche o del material, en hex. Por defecto blanco de peluche (#F7F5F0). */
  tint?: string;
  visor?: TinoVisor;
  visorStyle?: TinoVisorStyle;
  show?: TinoShow;
  pet?: TinoPet;
  dark?: boolean;
  /** 1 = encuadre entero; >1 acerca, <1 aleja (solo con frame "center"). */
  zoom?: number;
  /** Giro y cabeceo en grados (36 = tres cuartos, 90 = de frente). */
  look?: [number, number];
  /** Una sola imagen, sin animar (miniaturas). */
  still?: boolean;
  /** false: sin parpadeos ni orejas sueltas en reposo. */
  idle?: boolean;
}

export interface TinoApi {
  readonly state: TinoState;
  readonly zoomLevel: number;
  readonly kinds: { bottom: TinoBottom; visor: TinoVisor; ears: TinoEars; style: TinoVisorStyle; show: TinoShow; pet: TinoPet };
  readonly diag: { estado: "cargando" | "ok" | "fallo"; fallos: string[]; webgl2?: boolean; gpu?: string };
  /** Cambia de gesto. aprueba y descarta duran un momento y vuelven al anterior. */
  set(state: TinoState): void;
  /** Mira hacia un giro y cabeceo (grados); null vuelve a su postura. */
  look(yaw: number | null, pitch?: number): void;
  /** Un salto (n = fuerza) y un empujón a las orejas. */
  jump(n?: number): void;
  kick(n: number): void;
  /** Mantiene el gesto de pulsar mientras on. */
  press(on: boolean): void;
  /** Peina el pelo hacia el puntero (coordenadas de pantalla). */
  stroke(x: number, y: number): void;
  mirror(on: boolean): void;
  ears(kind: TinoEars): void;
  bottom(kind: TinoBottom): void;
  material(name: TinoMaterial): void;
  tint(color: string): void;
  visor(kind: TinoVisor): void;
  visorStyle(name: TinoVisorStyle): void;
  show(name: TinoShow): void;
  pet(name: TinoPet): void;
  theme(dark: boolean): void;
  zoom(z: number): void;
  draw(): void;
  /** Para todo y suelta la tarjeta gráfica. <Tino /> lo llama al desmontar. */
  destroy(): void;
}

export function create(canvas: HTMLCanvasElement, options?: TinoOptions): TinoApi | null;
export const POSES: Record<TinoState, unknown>;
export const MATS: TinoMaterial[];
export const KINDS: TinoVisor[];
export const EARS: TinoEars[];
export const BOTTOMS: TinoBottom[];
export const STYLES: TinoVisorStyle[];
export const SHOWS: TinoShow[];
export const PETS: TinoPet[];
