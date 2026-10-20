"use client";

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import type { TinoApi, TinoBottom, TinoEars, TinoMaterial, TinoPet, TinoShow, TinoState, TinoVisor, TinoVisorStyle } from "./tino/engine";
import "./Tino.css";

export type TinoProps = {
  /** Gesto: reposo (revisando), pensando, aprueba, descarta, curiosa, leyendo, senala, dormida, error. */
  state?: TinoState;
  /** Lado en px. Sin él, Tino llena su contenedor (dale ancho y alto con className o style). */
  size?: number;
  ears?: TinoEars;
  bottom?: TinoBottom;
  material?: TinoMaterial;
  /** Color del peluche o del material, en hex. */
  tint?: string;
  visor?: TinoVisor;
  visorStyle?: TinoVisorStyle;
  show?: TinoShow;
  pet?: TinoPet;
  dark?: boolean;
  zoom?: number;
  /** Giro y cabeceo en grados (36 = tres cuartos, 90 = de frente). */
  look?: [number, number];
  /** Una sola imagen, sin animar. */
  still?: boolean;
  /** Pasar el puntero por encima peina el pelo y saca los ojos del visor. */
  petting?: boolean;
  className?: string;
  style?: CSSProperties;
  /** El motor, para gestos sueltos (jump, kick, look…). */
  ref?: Ref<TinoApi>;
};

/** Tino, la mascota en 3D. Carga el motor (three.js) en un paquete aparte, solo en el navegador; si no hay WebGL2 o algo
 *  falla, enseña la marca plana. Dónde vive y qué dice: docs/design-system/componentes.md#mascota. */
export default function Tino({
  state = "reposo", size, ears = "capsula", bottom = "redonda", material = "flocado", tint, visor = "banda", visorStyle = "cristal",
  show = "barrido", pet = "felices", dark = false, zoom = 1, look, still = false, petting = true, className = "", style, ref,
}: TinoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [api, setApi] = useState<TinoApi | null>(null);
  const [flat, setFlat] = useState(false);
  useImperativeHandle(ref, () => api as TinoApi, [api]);   // null hasta que carga el motor

  // montar y desmontar: lo que se pasa al crear es solo el punto de partida; los cambios llegan por los efectos de abajo
  const first = useRef({ state, ears, bottom, material, tint, visor, visorStyle, show, pet, dark, zoom, look, still });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let made: TinoApi | null = null, gone = false;
    const onFail = () => setFlat(true), onReady = () => setFlat(false);
    canvas.addEventListener("tino:fallo", onFail);
    canvas.addEventListener("tino:listo", onReady);
    import("./tino/engine").then(({ create }) => {
      if (gone) return;
      const o = first.current;
      made = create(canvas, { frame: "center", ...o, idle: !o.still });
      if (!made) setFlat(true);
      setApi(made);
    }, () => setFlat(true));
    return () => {
      gone = true;
      canvas.removeEventListener("tino:fallo", onFail);
      canvas.removeEventListener("tino:listo", onReady);
      made?.destroy();
    };
  }, []);

  useEffect(() => { api?.set(state); }, [api, state]);
  useEffect(() => { api?.ears(ears); }, [api, ears]);
  useEffect(() => { api?.bottom(bottom); }, [api, bottom]);
  useEffect(() => { api?.material(material); }, [api, material]);
  useEffect(() => { if (tint) api?.tint(tint); }, [api, tint]);
  useEffect(() => { api?.visor(visor); }, [api, visor]);
  useEffect(() => { api?.visorStyle(visorStyle); }, [api, visorStyle]);
  useEffect(() => { api?.show(show); }, [api, show]);
  useEffect(() => { api?.pet(pet); }, [api, pet]);
  useEffect(() => { api?.theme(dark); }, [api, dark]);
  useEffect(() => { api?.zoom(zoom); }, [api, zoom]);
  const yaw = look?.[0], pitch = look?.[1];
  // Without a look of its own, the pose's: a face that turns the head must not keep the last one's
  useEffect(() => { api?.look(yaw ?? null, pitch ?? 0); }, [api, yaw, pitch]);

  const box: CSSProperties = size ? { width: size, height: size, ...style } : { ...style };
  return (
    <span
      className={`tino ${flat ? "is-flat" : ""} ${className}`}
      style={box}
      role="img"
      aria-label="Tino"
      onPointerMove={petting && api ? (event) => api.stroke(event.clientX, event.clientY) : undefined}
    >
      <canvas ref={canvasRef} className="tino-canvas" aria-hidden="true" />
      {flat && <img className="tino-flat" src="/tino/tino-plano.svg" alt="" draggable={false} />}
    </span>
  );
}
