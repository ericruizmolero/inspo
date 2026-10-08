// Reads a board on Pinterest from inside it (board-collect.js talks to the import page). It asks
// Pinterest for the board's pins the way the board's own page does (the JSON behind
// /resource/…Resource/get/, with the person's session when there is one, so a secret board works
// too). A pin that links to a site is that site; an uploaded pin (no link) is its image. Nothing
// is scrolled or clicked, and nothing else on the page is read.
window.__criterioBoard(async ({ found, stopped, named, sleep }) => {
  const PAGE_SIZE = 25;
  const PAUSE_MS = 250; // between one page of pins and the next
  const MAX_PAGES = 400;
  const WIDE = 1600; // an original wider than this is asked for at 1200 px: the board shows the file itself
  const seen = new Set();
  const source = location.pathname;

  /** One of the page's own resources: { ok, status, data, bookmark } */
  const call = async (resource, options, tries = 2) => {
    const q = new URLSearchParams({ source_url: source, data: JSON.stringify({ options, context: {} }) });
    try {
      const res = await fetch(`/resource/${resource}Resource/get/?${q}`, {
        // Pinterest refuses the request without the header that names the page asking
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-Pinterest-PWS-Handler": "www/[username]/[slug].js" },
        credentials: "include",
      });
      if (res.status === 429 && tries > 1) { await sleep(4000); return call(resource, options, tries - 1); }
      const json = await res.json().catch(() => null);
      const r = json?.resource_response;
      return { ok: res.ok && !!r, status: res.status, data: r?.data, bookmark: r?.bookmark };
    } catch {
      if (tries > 1) { await sleep(1500); return call(resource, options, tries - 1); }
      return { ok: false, status: 0 };
    }
  };

  /** Every page of a list, handed to `each` as it arrives. false when Pinterest stopped answering */
  const walk = async (resource, options, each) => {
    let bookmark;
    for (let page = 0; page < MAX_PAGES && !stopped(); page++) {
      const r = await call(resource, bookmark ? { ...options, bookmarks: [bookmark] } : options);
      if (!r.ok) return false;
      await each(Array.isArray(r.data) ? r.data : []);
      bookmark = r.bookmark;
      if (!bookmark || bookmark === "-end-") return true;
      await sleep(PAUSE_MS);
    }
    return true;
  };

  const titleOf = (p) => ([p.grid_title, p.title, p.description, p.alt_text].find((s) => typeof s === "string" && s.trim()) || "").trim().slice(0, 200);

  // The feed mixes in modules of its own ("more ideas"), which are not pins and are not counted.
  // A video or a pin of several pages, uploaded, is its cover.
  const page = (total) => async (pins) => {
    const items = [];
    let other = 0;
    for (const p of pins) {
      if (p?.type !== "pin" || !/^\d+$/.test(String(p.id)) || seen.has(p.id)) continue;
      seen.add(p.id);
      if (typeof p.link === "string" && /^https?:\/\//.test(p.link)) { items.push({ url: p.link, title: titleOf(p) }); continue; }
      const orig = p.images?.orig, mid = p.images?.["736x"];
      const big = mid?.url?.replace("/736x/", "/1200x/");
      const whole = /\.gif$/i.test(orig?.url || "") || (orig?.width || 0) <= WIDE; // a GIF only moves in its original
      const image = (whole ? [orig?.url, mid?.url] : [big, mid?.url, orig?.url]).filter(Boolean);
      if (image.length) items.push({ url: `https://www.pinterest.com/pin/${p.id}/`, title: titleOf(p), image });
      else other++;
    }
    await found({ items, skipped: other ? { other } : {}, total });
  };

  // /<user>/<board>/ or /<user>/<board>/<section>/; anything else is not a board
  const board = globalThis.CriterioBoards.boardOf(location.href);
  if (board?.source !== "pinterest") return "not-a-board";
  const [username, slug, sectionSlug] = new URL(board.url).pathname.split("/").filter(Boolean).map(decodeURIComponent);

  const b = await call("Board", { username, slug, field_set_key: "detailed" });
  if (!b.ok || !b.data?.id) return b.status === 404 || b.status === 401 || b.status === 403 ? "not-found" : "error";
  const data = b.data;

  const sections = [];
  let ok = true;
  if (sectionSlug || data.section_count) ok = await walk("BoardSections", { board_id: data.id }, (list) => { sections.push(...list.filter((s) => s?.id)); });

  if (sectionSlug) {
    const section = sections.find((s) => s.slug === sectionSlug);
    if (!section) return ok ? "not-found" : "error";
    named(section.title ? `${data.name}: ${section.title}` : data.name);
    ok = await walk("BoardSectionPins", { section_id: section.id, page_size: PAGE_SIZE }, page(section.pin_count));
  } else {
    named(data.name);
    // The board's own feed holds the pins outside its sections; each section holds its own
    ok = (await walk("BoardFeed", { board_id: data.id, board_url: data.url || source, page_size: PAGE_SIZE, field_set_key: "react_grid_pin" }, page(data.pin_count))) && ok;
    for (const s of sections) {
      if (stopped()) break;
      ok = (await walk("BoardSectionPins", { section_id: s.id, page_size: PAGE_SIZE }, page(data.pin_count))) && ok;
    }
  }
  return ok ? "end" : seen.size ? "partial" : "error";
});
