// A stored picture told in words, for a fetcher that reads only text. claude.ai's reader (Claude-User) takes text,
// HTML and PDF and passes the model only their text: an image, or a PDF of one, reaches it empty. So a file link
// handed out of the app (lib/file-links.ts) answers it with what criterio knows of the picture
// (app/api/files/[...key]/route.ts); every other reader gets the picture itself.
import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db, schema } from "./db";
import { fileUrl } from "./storage";
import { dictOf } from "./i18n";
import type { InspoTags } from "@/types/inspo";

const T = schema.inspoItem;
const label = (kind: "style" | "sector", key: string | undefined) => key && ((dictOf("en").taxonomy[kind] as Record<string, string>)[key] ?? key);

/** Anthropic's user-initiated fetcher, as it names itself */
export const readsOnlyText = (userAgent: string | null) => !!userAgent && /Claude-User/i.test(userAgent);

/** The picture at `key` as Markdown: its name, what the AI saw in it, the colours of its pixels and its tags */
export async function describeStoredImage(key: string, size: { width?: number; height?: number }): Promise<string> {
  const path = fileUrl(key);
  const ws = key.split("/")[1] ?? "";
  const [row] = await db.select({ name: T.name, tags: T.tagsJson }).from(T)
    .where(and(eq(T.organizationId, ws), or(eq(T.web, path), eq(T.thumbnailUrl, path)))).limit(1);
  const tags = row?.tags as InspoTags | null | undefined;
  const dims = size.width && size.height ? ` (${size.width} × ${size.height} px)` : "";
  return [
    `# ${row?.name || key.split("/").pop()}`,
    "",
    `An image stored in criterio.design${dims}. A reader that takes only text gets this description of it; a browser or a download gets the picture.`,
    ...(tags?.visual || tags?.summary ? ["", `**What it shows:** ${tags.visual || tags.summary}`] : []),
    ...(tags?.colors?.length ? ["", `**Colours measured in its pixels:** ${tags.colors.map((c) => `${c.hex} ${Math.round(c.share * 100)}%`).join(", ")}`] : []),
    ...(tags?.style || tags?.sector ? ["", `**Tags:** ${[label("style", tags.style), label("sector", tags.sector)].filter(Boolean).join(", ")}`] : []),
    ...(row ? [] : ["", "criterio holds no description of it yet."]),
    "",
  ].join("\n");
}
