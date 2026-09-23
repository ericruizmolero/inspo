import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// Card shown when sharing a link (WhatsApp, Slack, X, iMessage…). 1200×630.
// Inter, fetched as TTF from Google Fonts (Satori does not read woff2).
//
// Always in English, the default language: the image is static and whoever requests it
// (WhatsApp, Slack, a search engine) does not send the language cookie.
export const alt = "criterio.design, your team's inspiration library";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Silhouette of the app's collage: three columns of ghost cards
const COLS: { offset: number; tiles: number[] }[] = [
  { offset: 0, tiles: [150, 110, 190, 130] },
  { offset: 70, tiles: [120, 170, 100, 160] },
  { offset: 30, tiles: [180, 120, 140, 110] },
];

// Without a browser User-Agent, Google Fonts answers with TTF URLs
async function inter(weight: number): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`)).text();
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error("Inter: no font URL in the Google Fonts CSS");
  return (await fetch(url)).arrayBuffer();
}

export default async function Image() {
  const [display, body, mark] = await Promise.all([
    inter(600),
    inter(400),
    readFile(join(process.cwd(), "app/icon.png")),
  ]);
  const logo = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0d0d0d", color: "#f2f2f2", position: "relative", overflow: "hidden", fontFamily: "Inter" }}>
        {/* Ghost collage on the right */}
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

        {/* Text */}
        <div style={{ position: "absolute", left: 72, top: 72, bottom: 72, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <img src={logo} width={176} height={176} style={{ borderRadius: 40 }} />
          <div style={{ display: "flex", flexDirection: "column", fontWeight: 600, fontSize: 72, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#f2f2f2" }}>
            <span>What inspires your team,</span>
            <span>all in one place.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#7a7a7a" }}>
            <span>criterio.design</span>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: "#4a4a4a" }} />
            <span>by Savvia</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: display, weight: 600, style: "normal" },
        { name: "Inter", data: body, weight: 400, style: "normal" },
      ],
    },
  );
}
