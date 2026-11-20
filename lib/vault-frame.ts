import "server-only";
import sharp from "sharp";

// The picture a shared Vault link shows (lib/vault-og.tsx), 1200×630, and where a loop keeps its own.
// A loop given as a Screen Studio share link brings that page's thumbnail of the video, which is the card as it is;
// one sent as a file has none, and its entry's picture stands in. The server has no way to take a frame from a video.
export const CARD_W = 1200, CARD_H = 630;
const GROUND = "#F4F0E6";

/** Where the frame of a loop is kept: beside the video, under its name. Null for a key that is not a video's */
export const frameKeyOf = (videoKey: string): string | null => (/\.(mp4|webm)$/.test(videoKey) ? videoKey.replace(/\.(mp4|webm)$/, ".frame.jpg") : null);

/** A picture as the card: cut to 1200×630 from its middle, a JPEG. A loop's frame is already near that shape and
 *  loses next to nothing; a 4:3 capture loses a band above and below. `trim` takes a hair off every edge, for a
 *  capture that brings the window's own line round it */
export async function pictureCard(body: Buffer, o: { trim?: boolean } = {}): Promise<Buffer | null> {
  try {
    const whole = await sharp(body).metadata();
    const cut = o.trim && whole.width > 400 && whole.height > 400 ? 3 : 0;
    return await sharp(body).extract({ left: cut, top: cut, width: whole.width - cut * 2, height: whole.height - cut * 2 }).resize({ width: CARD_W, height: CARD_H, fit: "cover" }).flatten({ background: GROUND }).jpeg({ quality: 88 }).toBuffer();
  } catch {
    return null;
  }
}
