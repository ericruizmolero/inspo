import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// Card shown when sharing a link (WhatsApp, Slack, X, iMessage…). 1200×630.
// The Criterio system: board ground, paper text, Satoshi 700 for the title and 400 for the rest, and one
// ember thing (one card in the collage). Satori reads TTF and not variable fonts, so it gets the two static
// files scripts/fetch-fonts.mjs downloads next to the app's variable ones.
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

export default async function Image() {
  const [display, body, mark] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/satoshi/Satoshi-Bold.ttf")),
    readFile(join(process.cwd(), "app/fonts/satoshi/Satoshi-Regular.ttf")),
    readFile(join(process.cwd(), "app/icon.png")),
  ]);
  const logo = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BOARD, color: PAPER, position: "relative", overflow: "hidden", fontFamily: "Satoshi" }}>
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
          <div style={{ display: "flex", flexDirection: "column", fontWeight: 700, fontSize: 64, lineHeight: 1.05, letterSpacing: "-1.6px", color: PAPER }}>
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
        { name: "Satoshi", data: display, weight: 700, style: "normal" },
        { name: "Satoshi", data: body, weight: 400, style: "normal" },
      ],
    },
  );
}
