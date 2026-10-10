// Screen Studio share links (screen.studio/share/<id>) saved as inspos. The share page hands out its video
// and its frame as og:video and og:image, but signed to expire in hours: so the first time anyone asks for
// one, both are copied to our storage and the card loops the copy. Shared across workspaces, like posts
// from X (it is public). Files: lib/storage.ts, under inspo/screen-studio/<id>/.
import "server-only";
import { putFile, fileExists } from "./storage";
import { recordFailure } from "./log";

export const SCREEN_STUDIO_PREFIX = "inspo/screen-studio/";
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const SCREEN_STUDIO_FILES = { "video.mp4": "video/mp4", "poster.jpg": "image/jpeg" } as const;
export type ScreenStudioFile = keyof typeof SCREEN_STUDIO_FILES;

export const screenStudioKey = (id: string, file: ScreenStudioFile) => `${SCREEN_STUDIO_PREFIX}${id}/${file}`;

const meta = (html: string, prop: string) =>
  html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`, "i"))?.[1].replace(/&amp;/g, "&") ?? null;

async function copy(remote: string, key: string, type: string, maxBytes: number): Promise<boolean> {
  const res = await fetch(remote, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok || !res.body) return false;
  if (Number(res.headers.get("content-length") ?? 0) > maxBytes) { await res.body.cancel(); return false; }
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > maxBytes) return false;
  await putFile(key, body, type);
  return true;
}

const inflight = new Map<string, Promise<boolean>>();

/** Whether we have the share's video and frame, copying them the first time. False if the page gives neither */
export function ensureScreenStudio(id: string): Promise<boolean> {
  const running = inflight.get(id);
  if (running) return running;
  const job = (async () => {
    if (await fileExists(screenStudioKey(id, "video.mp4"))) return true;
    const page = await fetch(`https://screen.studio/share/${id}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) });
    if (!page.ok) return false;
    const html = await page.text();
    const video = meta(html, "og:video:secure_url") ?? meta(html, "og:video");
    const image = meta(html, "og:image:secure_url") ?? meta(html, "og:image");
    if (image) await copy(image, screenStudioKey(id, "poster.jpg"), "image/jpeg", 10 * 1024 * 1024).catch(() => false); // the video plays without its poster
    return video ? await copy(video, screenStudioKey(id, "video.mp4"), "video/mp4", MAX_VIDEO_BYTES) : false;
  })().catch((e) => { void recordFailure("job", "screen studio copy", e, { ref: id }); return false; })
    .finally(() => inflight.delete(id));
  inflight.set(id, job);
  return job;
}
