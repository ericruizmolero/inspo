import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// Card shown when sharing a link (WhatsApp, Slack, X, iMessage…). 1200×630.
// The Criterio system: board ground, paper text, Bricolage Grotesque 800 for the title, Archivo for the
// rest, and one ember thing (one card in the collage). Fonts are fetched as TTF from Google Fonts (Satori
// does not read woff2).
//
// Always in English, the default language: the image is static and whoever requests it
// (WhatsApp, Slack, a search engine) does not send the language cookie.
export const alt = "criterio.design, your team's inspiration library";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The system's colors (tokens.json): Satori has no CSS variables
const BOARD = "#0F0F0F";
const CARD = "#1A1A1A";
const CARD_BORDER = "#262626";
const PAPER = "#EDE6D6";
const MUTED = "#B8B1A3";
const EMBER = "#E8892B";

// Silhouette of the app's collage: three columns of flat cards. One of them is the ember card
const COLS: { offset: number; tiles: number[] }[] = [
  { offset: 0, tiles: [150, 110, 190, 130] },
  { offset: 70, tiles: [120, 170, 100, 160] },
  { offset: 30, tiles: [180, 120, 140, 110] },
];
const EMBER_TILE = "2-1";

// Without a browser User-Agent, Google Fonts answers with TTF URLs
async function googleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error(`${family}: no font URL in the Google Fonts CSS`);
  return (await fetch(url)).arrayBuffer();
}

export default async function Image() {
  const [display, body, mark] = await Promise.all([
    googleFont("Bricolage Grotesque", 800),
    googleFont("Archivo", 400),
    readFile(join(process.cwd(), "app/icon.png")),
  ]);
  const logo = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BOARD, color: PAPER, position: "relative", overflow: "hidden", fontFamily: "Archivo" }}>
        {/* The collage on the right: flat cards with a hairline, no shadow */}
        <div style={{ position: "absolute", left: 640, top: -40, display: "flex", gap: 18 }}>
          {COLS.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: c.offset }}>
              {c.tiles.map((h, j) => (
                <div key={j} style={{ width: 200, height: h, borderRadius: 14, background: `${i}-${j}` === EMBER_TILE ? EMBER : CARD, border: `1px solid ${`${i}-${j}` === EMBER_TILE ? EMBER : CARD_BORDER}` }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 560, top: 0, width: 640, height: 630, background: `linear-gradient(90deg, ${BOARD} 0%, rgba(15,15,15,0) 55%)` }} />
        <div style={{ position: "absolute", left: 560, top: 0, width: 640, height: 630, background: `linear-gradient(180deg, rgba(15,15,15,0) 55%, ${BOARD} 100%)` }} />

        {/* Text */}
        <div style={{ position: "absolute", left: 72, top: 72, bottom: 72, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <img src={logo} width={160} height={160} />
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 64, lineHeight: 1, letterSpacing: "-2px", color: PAPER }}>
            <span>What inspires your team,</span>
            <span>all in one place.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 24, color: MUTED }}>
            <span>criterio.design</span>
            <span>by Savvia</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: display, weight: 800, style: "normal" },
        { name: "Archivo", data: body, weight: 400, style: "normal" },
      ],
    },
  );
}
