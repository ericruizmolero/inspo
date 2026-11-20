import "server-only";
import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { getFile } from "@/lib/storage";
import { dictOf } from "@/lib/i18n";

// The card a link to a Vault piece shows where it is shared (WhatsApp, Slack, X, iMessage): the piece's own picture on
// the ground it was taken on, which fills the card to its edges (no frame round it: inside a dark chat bubble a black
// frame read as a heavy outline), its name and its category, and Tino, in the ink that reads on that ground.
// 1200×630, one per entry, made when asked for.
// Served by app/api/vault/[entry]/og. In English, the default language: nobody who asks for it says which one they read.
const W = 1200, H = 630;
const PAD = 48;
// The picture's room: the card's whole width, above the line with the name
const STAGE_W = W, STAGE_H = 452;
// The system's colors (tokens.json): Satori has no CSS variables
const INK = "#1B1B18";
const PAPER = "#EDE6D6";
const GROUND = "#F4F0E6";

/** The ink that reads on a ground, as a put-together preview picks it (groundOf in lib/vault-preview.ts) */
function inkOn(ground: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? PAPER : INK;
}

const hex = (n: number) => n.toString(16).padStart(2, "0");

/** The entry's picture as Satori takes it (a PNG or a JPEG, never a WebP), sized for the stage, and the colour of a
 *  pixel by its corner (a few in: some pictures come with a hairline round them): the ground it was taken on, which the stage continues to its edges */
type Picture = { src: string; width: number; height: number; ground: string };
async function pictureOf(key: string | null): Promise<Picture | null> {
  if (!key) return null;
  try {
    const f = await getFile(key);
    return f ? await pictureFrom(f.body) : null;
  } catch {
    return null;
  }
}
export async function pictureFrom(body: Buffer): Promise<Picture | null> {
  try {
    // A hair off every edge: a capture often brings the window's own line round it
    const whole = await sharp(body).metadata();
    const cut = whole.width > 400 && whole.height > 400 ? 3 : 0;
    const { data, info } = await sharp(body).extract({ left: cut, top: cut, width: whole.width - cut * 2, height: whole.height - cut * 2 }).resize({ width: STAGE_W * 2, height: STAGE_H * 2, fit: "inside", withoutEnlargement: true }).flatten({ background: GROUND }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
    const px = await sharp(data).extract({ left: Math.min(12, info.width - 1), top: Math.min(12, info.height - 1), width: 1, height: 1 }).raw().toBuffer();
    const scale = Math.min(STAGE_W / info.width, STAGE_H / info.height);
    return { src: `data:image/jpeg;base64,${data.toString("base64")}`, width: Math.round(info.width * scale), height: Math.round(info.height * scale), ground: `#${hex(px[0])}${hex(px[1])}${hex(px[2])}` };
  } catch {
    return null;
  }
}

export async function vaultCard(e: { title: string; category: string; ground: string | null; imageKey: string | null; picture?: Picture | null }): Promise<Response> {
  const [display, body, mark, picture] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/geist/Geist-Bold.ttf")),
    readFile(join(process.cwd(), "app/fonts/geist/Geist-Regular.ttf")),
    // Tino from the app's own icon, recoloured to the card's ink
    readFile(join(process.cwd(), "app/icon.svg"), "utf8"),
    e.picture !== undefined ? e.picture : pictureOf(e.imageKey),
  ]);
  const t = dictOf("en");
  const ground = picture?.ground ?? (e.ground && /^#[0-9a-f]{6}$/i.test(e.ground) ? e.ground : GROUND);
  const ink = inkOn(ground);
  const kind = (t.taxonomy.section as Record<string, string>)[e.category] ?? (t.vault.details as Record<string, string>)[e.category] ?? e.category;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: ground, color: ink, fontFamily: "Geist" }}>
        <div style={{ width: STAGE_W, height: STAGE_H, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {picture && <img src={picture.src} width={picture.width} height={picture.height} alt="" />}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: `0 ${PAD}px ${PAD}px` }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 940 }}>
            <div style={{ display: "flex", fontSize: 22, opacity: 0.62 }}>{`${t.vault.name} / ${kind}`}</div>
            <div style={{ display: "flex", marginTop: 6, fontWeight: 700, fontSize: e.title.length > 34 ? 40 : 48, lineHeight: 1.1, letterSpacing: "-1.2px" }}>{e.title}</div>
          </div>
          <img src={`data:image/svg+xml;base64,${Buffer.from(mark.replace(/<style>[\s\S]*?<\/style>/, "").replace(/fill="#[0-9a-f]{6}"/i, `fill="${ink}"`)).toString("base64")}`} width={72} height={72} alt="" />
        </div>
      </div>
    ),
    {
      width: W, height: H,
      fonts: [
        { name: "Geist", data: display, weight: 700, style: "normal" },
        { name: "Geist", data: body, weight: 400, style: "normal" },
      ],
      // The address carries the entry's last change (?v=), so a card can be kept for long
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800", "X-Robots-Tag": "noindex" },
    },
  );
}
