// What an AI sees when somebody pastes a reference's link (/i/<code>) into Claude, ChatGPT, Perplexity…: the
// reference whole, as a plain page, instead of the login it used to land on (where it said "I can't see the image").
// proxy.ts sends the AI fetchers (lib/preview-bots.ts AI_READER) here; a person still signs in.
//
// It carries what the link's holder would see on the card: the picture (a signed link to our copy, readable with no
// session for 30 days, lib/file-links.ts), what the AI read in it (visual description, colours, fonts, tags), the
// note under the card, a text's words, a post's text and media, a site's DESIGN.md. Same limits as the preview
// card (lib/share-card.ts): no reply from the thread, no workspace, and what we copied from X, Pinterest, Are.na or
// Cosmos stays inside (a post gives X's own media; a pin, its page).
import "server-only";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { keyOf } from "./storage";
import { signedFilePath } from "./file-links";
import { getDesignMd } from "./design-store";
import { readPost } from "./posts";
import { readText } from "./text-refs";
import { pageShotsFor } from "./page-shots";
import { tagsOfRow } from "./items";
import { mediaKindOf, postOf, staysInside, videoEmbedOf } from "./url";
import { sharedItem } from "./share-card";

const T = schema.inspoItem;
const DESIGN_MD_MAX = 60_000;
const TEXT_MAX = 100_000;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** One of our stored files as an address anyone can open (signed), absolute; any other address as it is */
function openUrl(path: string | null | undefined, origin: string): string | null {
  if (!path) return null;
  const key = keyOf(path);
  if (key) return origin + signedFilePath(key);
  if (path.startsWith("/")) return origin + path;
  return /^https?:\/\//.test(path) ? path : null;
}

/** The reference as an HTML page for an AI, or null when the id leads nowhere */
export async function readerPage(id: string, origin: string): Promise<string | null> {
  const item = await sharedItem(id);
  if (!item) return null;
  const [row] = await db.select({ subNote: T.subNote, date: T.date, tagsJson: T.tagsJson, tagsUser: T.tagsUser }).from(T).where(eq(T.id, item.id)).limit(1);
  const tags = row ? tagsOfRow(row) : null;
  const kind = mediaKindOf(item.web);
  const inside = staysInside(item);

  const pictures: { url: string; alt: string }[] = [];
  const videos: string[] = [];
  const blocks: string[] = [];
  const pic = (u: string | null | undefined, alt: string) => { if (u && !pictures.some((p) => p.url === u)) pictures.push({ url: u, alt }); };

  if (kind === "post") {
    const post = await readPost(item.web).catch(() => null);
    if (post) {
      blocks.push(`<h2>Post by ${esc(post.author)} (@${esc(post.handle)})</h2><blockquote>${esc(post.text).replace(/\n/g, "<br>")}</blockquote>`);
      for (const m of post.media) {
        pic(m.image, `${m.kind} in the post`);
        if (m.video) videos.push(m.video.play);
      }
    }
  } else if (kind === "text") {
    const text = await readText(item.web);
    if (text) blocks.push(`<h2>Text</h2><pre>${esc(text.slice(0, TEXT_MAX))}</pre>`);
  } else if (!inside && kind === "image") {
    pic(openUrl(item.web, origin), item.name);
    if (item.thumbnailUrl) pic(openUrl(item.thumbnailUrl, origin), "Thumbnail chosen by the team");
  } else if (!inside && kind === "video") {
    const embed = videoEmbedOf(item.web);
    const file = embed?.provider === "file" ? openUrl(item.web, origin) : null;
    videos.push(file ?? item.web);
    pic(openUrl(item.thumbnailUrl, origin) ?? openUrl(embed?.poster, origin), "Frame of the video");
  } else if (!inside && kind === "web") {
    const [doc, shots] = await Promise.all([
      getDesignMd(item.web).catch(() => null),
      item.thumbnailUrl ? Promise.resolve(null) : pageShotsFor([item.web]).catch(() => null),
    ]);
    pic(openUrl(item.thumbnailUrl, origin), "Picture chosen by the team");
    pic(openUrl(doc?.topUrl ?? shots?.[item.web]?.topUrl, origin), "Top of the page");
    pic(openUrl(doc?.screenshotUrl, origin), "Whole page, 1440 px wide");
    if (doc?.markdown) blocks.push(`<h2>DESIGN.md of the site</h2><pre>${esc(doc.markdown.slice(0, DESIGN_MD_MAX))}</pre>`);
  }

  const facts: [string, string][] = [];
  facts.push(["Kind", kind]);
  const page = item.source || (kind === "image" || kind === "text" || kind === "video" && item.web.startsWith("/") ? null : item.web);
  if (page) facts.push(["Address", `<a href="${esc(page)}">${esc(page)}</a>`]);
  if (row?.date) facts.push(["Saved", esc(row.date)]);
  if (item.author && item.author !== "Both") facts.push(["Saved by", esc(item.author)]);
  if (tags?.summary) facts.push(["What it is", esc(tags.summary)]);
  if (tags?.visual) facts.push(["What it shows", esc(tags.visual)]);
  if (tags?.colors?.length) facts.push(["Colours", tags.colors.slice(0, 8).map((c) => `${esc(c.hex)} (${Math.round(c.share * 100)}%)`).join(", ")]);
  if (tags?.theme) facts.push(["Theme", tags.theme]);
  if (tags?.fonts?.length) facts.push(["Fonts", esc(tags.fonts.join(", "))]);
  const words = [tags?.style, ...(tags?.sections ?? []), ...(tags?.elements ?? []), ...(tags?.type ?? []), ...(tags?.layout ?? []), ...(tags?.keywords ?? [])].filter(Boolean);
  if (words.length) facts.push(["Tags", esc([...new Set(words)].join(", "))]);
  for (const [area, a] of Object.entries(tags?.areas ?? {})) if (a?.evidence) facts.push([`Seen (${area})`, esc(a.evidence)]);

  const said = [item.note.trim(), row?.subNote?.trim()].filter((s): s is string => !!s);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>${esc(item.name)} · criterio.design</title></head>
<body>
<h1>${esc(item.name)}</h1>
<p>A reference shared from criterio.design, a library of design references.${pictures.length ? " Its pictures are below, each with its own address: open them to see the reference." : ""}</p>
<dl>${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
${said.length ? `<h2>What was said about it</h2>${said.map((s) => `<blockquote>${item.author && item.author !== "Both" ? `${esc(item.author)}: ` : ""}${esc(s)}</blockquote>`).join("")}` : ""}
${pictures.length ? `<h2>Pictures</h2>${pictures.map((p) => `<figure><img src="${esc(p.url)}" alt="${esc(p.alt)}"><figcaption>${esc(p.alt)}: <a href="${esc(p.url)}">${esc(p.url)}</a></figcaption></figure>`).join("")}` : ""}
${videos.length ? `<h2>Video</h2>${videos.map((v) => `<p><a href="${esc(v)}">${esc(v)}</a></p>`).join("")}` : ""}
${blocks.join("\n")}
${inside && !pictures.length ? `<p>The picture stays inside criterio: see it on its page${page ? ` (${esc(page)})` : ""}.</p>` : ""}
</body></html>`;
  return html;
}
