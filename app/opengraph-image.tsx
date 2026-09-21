import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// Tarjeta que sale al compartir un enlace (WhatsApp, Slack, X, iMessage…). 1200×630.
// Las fuentes de prueba de Klim solo traen A-Z a-z 0-9 . , - así que los textos evitan tildes y signos.
export const alt = "Inspo, la biblioteca de inspiración de tu equipo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

// Silueta del collage de la app: tres columnas de tarjetas fantasma
const COLS: { offset: number; tiles: number[] }[] = [
  { offset: 0, tiles: [150, 110, 190, 130] },
  { offset: 70, tiles: [120, 170, 100, 160] },
  { offset: 30, tiles: [180, 120, 140, 110] },
];

export default async function Image() {
  const [display, body] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/test-family-bold.ttf")),
    readFile(join(process.cwd(), "app/fonts/test-soehne-buch.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0d0d0d", color: "#f2f2f2", position: "relative", overflow: "hidden", fontFamily: "Soehne" }}>
        {/* Collage fantasma a la derecha */}
        <div style={{ position: "absolute", left: 640, top: -40, display: "flex", gap: 18 }}>
          {COLS.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: c.offset }}>
              {c.tiles.map((h, j) => (
                <div key={j} style={{ width: 200, height: h, borderRadius: 20, background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 560, top: 0, width: 640, height: 630, background: "linear-gradient(90deg, #0d0d0d 0%, rgba(13,13,13,0) 55%)" }} />
        <div style={{ position: "absolute", left: 560, top: 0, width: 640, height: 630, background: "linear-gradient(180deg, rgba(13,13,13,0) 55%, #0d0d0d 100%)" }} />

        {/* Texto */}
        <div style={{ position: "absolute", left: 72, top: 72, bottom: 72, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", width: 64, height: 64, borderRadius: 14, background: "#161616", border: "1px solid rgba(255,255,255,0.14)", position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: 14, width: 16, height: 21, borderRadius: 3.5, background: "#f2f2f2" }} />
            <div style={{ position: "absolute", left: 14, top: 39, width: 16, height: 11, borderRadius: 3.5, background: "#f2f2f2" }} />
            <div style={{ position: "absolute", left: 34, top: 14, width: 16, height: 11, borderRadius: 3.5, background: "#f2f2f2" }} />
            <div style={{ position: "absolute", left: 34, top: 29, width: 16, height: 21, borderRadius: 3.5, background: "#f2f2f2" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Family", fontSize: 128, lineHeight: 0.95, letterSpacing: "-0.02em", color: "#f2f2f2" }}>Inspo</div>
            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", fontSize: 32, lineHeight: 1.3, color: "#b4b4b4" }}>
              <span>Lo que inspira a tu equipo,</span>
              <span>en un solo sitio.</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#7a7a7a" }}>
            <span>inspo.savvia.studio</span>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: "#4a4a4a" }} />
            <span>by Savvia</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Family", data: display, weight: 700, style: "normal" },
        { name: "Soehne", data: body, weight: 400, style: "normal" },
      ],
    },
  );
}
