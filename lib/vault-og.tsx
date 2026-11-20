import "server-only";
import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import { getFile } from "@/lib/storage";
import { CARD_W as W, CARD_H as H, frameKeyOf, pictureCard } from "@/lib/vault-frame";
import { dictOf } from "@/lib/i18n";

// The card a link to a Vault piece shows where it is shared (WhatsApp, Slack, X, iMessage): a picture of the piece
// and nothing else, filling the card (Eric, 20-11: the video's own capture "y ya"; the name and the description are
// already in the text the chat writes beside it). The picture is the frame kept with the entry's loop
// (lib/vault-frame.ts), or else the entry's picture. Only an entry with neither gets a drawn card: its name, its
// category and Tino on its ground. 1200×630, one per entry, made when asked for.
// Served by app/api/vault/[entry]/og. In English, the default language: nobody who asks for it says which one they read.
const PAD = 48;
// The system's colors (tokens.json): Satori has no CSS variables
const INK = "#1B1B18";
const PAPER = "#EDE6D6";
const GROUND = "#F4F0E6";
// The address carries the entry's last change (?v=), so a card can be kept for long
const HEADERS = { "Cache-Control": "public, max-age=86400, s-maxage=604800", "X-Robots-Tag": "noindex" };

/** The ink that reads on a ground, as a put-together preview picks it (groundOf in lib/vault-preview.ts) */
function inkOn(ground: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? PAPER : INK;
}

const stored = (key: string | null) => (key ? getFile(key).then((f) => f?.body ?? null).catch(() => null) : null);
/** The card's picture: the loop's frame as it was kept, or the entry's picture cut to the card */
async function pictureOf(e: { imageKey: string | null; videoKey: string | null }): Promise<Buffer | null> {
  const frame = await stored(e.videoKey && frameKeyOf(e.videoKey));
  if (frame) return frame;
  const picture = await stored(e.imageKey);
  return picture ? pictureCard(picture, { trim: true }) : null;
}

export async function vaultCard(e: { title: string; category: string; ground: string | null; imageKey: string | null; videoKey: string | null }): Promise<Response> {
  const picture = await pictureOf(e);
  if (picture) return new Response(new Uint8Array(picture), { headers: { "Content-Type": "image/jpeg", ...HEADERS } });
  const [display, body, mark] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/geist/Geist-Bold.ttf")),
    readFile(join(process.cwd(), "app/fonts/geist/Geist-Regular.ttf")),
    // Tino from the app's own icon, recoloured to the card's ink
    readFile(join(process.cwd(), "app/icon.svg"), "utf8"),
  ]);
  const t = dictOf("en");
  const ground = e.ground && /^#[0-9a-f]{6}$/i.test(e.ground) ? e.ground : GROUND;
  const ink = inkOn(ground);
  const kind = (t.taxonomy.section as Record<string, string>)[e.category] ?? (t.vault.details as Record<string, string>)[e.category] ?? e.category;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: ground, color: ink, fontFamily: "Geist" }}>
        <div style={{ display: "flex" }} />
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
      headers: HEADERS,
    },
  );
}
