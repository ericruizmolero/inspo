// Reads a channel on Are.na from inside it (board-collect.js talks to the import page), through
// Are.na's public API (api.are.na/v3, 30 requests a minute). A Link is its site, Media (a video or a
// song by address) is its address, an Image is its file with the block's page as where it came
// from. Text, attachments and channels inside the channel are skipped and counted.
// The API refuses a request that carries the session (no credentialed CORS), so a private channel
// reads as not found.
window.__criterioBoard(async ({ found, stopped, named, sleep }) => {
  const API = "https://api.are.na/v3/channels";
  const PAUSE_MS = 2100; // 30 a minute
  const MAX_PAGES = 100;

  const board = globalThis.CriterioBoards.boardOf(location.href);
  if (board?.source !== "arena") return "not-a-board";
  const slug = encodeURIComponent(new URL(board.url).pathname.split("/").filter(Boolean)[1]);

  /** { ok, status, data } with a wait and another try when Are.na says too many */
  const get = async (url, tries = 3) => {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 429 && tries > 1) { await sleep(15000); return get(url, tries - 1); }
      return { ok: res.ok, status: res.status, data: res.ok ? await res.json().catch(() => null) : null };
    } catch {
      if (tries > 1) { await sleep(3000); return get(url, tries - 1); }
      return { ok: false, status: 0, data: null };
    }
  };

  const channel = await get(`${API}/${slug}`);
  if (!channel.ok || !channel.data) return [401, 403, 404].includes(channel.status) ? "not-found" : "error";
  named(channel.data.title);

  const SKIP = { Text: "text", Attachment: "file", Channel: "channel" };
  const itemOf = (b) => {
    const title = typeof b.title === "string" ? b.title.trim().slice(0, 200) : "";
    const url = b.source?.url;
    if ((b.type === "Link" || b.type === "Media") && url) return { url, title };
    if (b.type === "Image") {
      const image = [b.image?.src, b.image?.large?.src].filter(Boolean);
      if (image.length) return { url: `https://www.are.na/block/${b.id}`, title, image };
    }
    return null;
  };

  let seen = 0;
  for (let n = 1; n <= MAX_PAGES && !stopped(); n++) {
    if (n > 1) await sleep(PAUSE_MS);
    const r = await get(`${API}/${slug}/contents?per=100&page=${n}`);
    if (!r.ok || !Array.isArray(r.data?.data)) return seen ? "partial" : "error";
    const items = [];
    const skipped = {};
    for (const b of r.data.data) {
      seen++;
      const it = itemOf(b);
      if (it) items.push(it);
      else { const why = SKIP[b.type] || "other"; skipped[why] = (skipped[why] || 0) + 1; }
    }
    await found({ items, skipped, total: r.data.meta?.total_count });
    if (!r.data.meta?.has_more_pages) return "end";
  }
  return "end";
});
