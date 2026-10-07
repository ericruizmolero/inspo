// Runs inside a board on Pinterest, injected by the import page (import.js) with chrome.scripting
// after the person grants pinterest.com. It asks Pinterest for the board's pins the way the board's
// own page does (the JSON behind /resource/…Resource/get/, with the person's session when there is
// one, so a secret board works too) and reports each pin's address, image and title to the
// extension. Nothing is scrolled or clicked, and nothing else on the page is read. It stops at the
// last pin, when the import page says so, or when that page is gone.
(() => {
  if (window.__criterioPins) return; // already running in this tab
  window.__criterioPins = true;
  const PAGE_SIZE = 25;
  const PAUSE_MS = 250; // between one page of pins and the next
  const MAX_PAGES = 400;
  const WIDE = 1600; // an original wider than this is asked for at 1200 px: the board shows the file itself
  const seen = new Set();
  let stopped = false;

  const finish = (reason) => {
    if (stopped) return;
    stopped = true;
    try { chrome.runtime.sendMessage({ type: "pin-done", reason, found: seen.size }, () => void chrome.runtime.lastError); } catch { /* page gone */ }
  };

  const send = (msg) => new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        // No listener: the import page was closed, so nobody is saving what we find
        if (chrome.runtime.lastError || res?.stop) finish("stopped");
        resolve();
      });
    } catch { finish("stopped"); resolve(); }
  });

  chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === "pin-stop") finish("stopped"); });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    for (let page = 0; page < MAX_PAGES && !stopped; page++) {
      const r = await call(resource, bookmark ? { ...options, bookmarks: [bookmark] } : options);
      if (!r.ok) return false;
      await each(Array.isArray(r.data) ? r.data : []);
      bookmark = r.bookmark;
      if (!bookmark || bookmark === "-end-") return true;
      await sleep(PAUSE_MS);
    }
    return true;
  };

  // A pin as the import page sends it on: its address, its title and its image. The feed mixes in
  // modules of its own ("more ideas"), which are not pins. A video or a pin of several pages is its cover.
  const itemOf = (p) => {
    if (p?.type !== "pin" || !/^\d+$/.test(String(p.id)) || seen.has(p.id)) return null;
    const orig = p.images?.orig, mid = p.images?.["736x"];
    const big = mid?.url?.replace("/736x/", "/1200x/");
    const whole = /\.gif$/i.test(orig?.url || "") || (orig?.width || 0) <= WIDE; // a GIF only moves in its original
    const image = (whole ? [orig?.url, mid?.url] : [big, mid?.url, orig?.url]).filter(Boolean);
    if (!image.length) return null;
    seen.add(p.id);
    const title = [p.title, p.grid_title, p.description, p.alt_text].find((s) => typeof s === "string" && s.trim()) || "";
    return { url: `https://www.pinterest.com/pin/${p.id}/`, title: title.trim().slice(0, 200), image };
  };

  const report = (total) => async (pins) => {
    const items = pins.map(itemOf).filter(Boolean);
    if (items.length && !stopped) await send({ type: "pin-found", items, total, found: seen.size });
  };

  (async () => {
    // /<user>/<board>/ or /<user>/<board>/<section>/; anything else is not a board
    let parts;
    try { parts = source.split("/").filter(Boolean).map(decodeURIComponent); } catch { parts = []; }
    const NOT_USERS = ["pin", "search", "ideas", "today", "settings", "business", "login", "signup", "_"];
    const NOT_BOARDS = ["_saved", "_created", "_pins", "pins", "boards", "_profile", "_shop"];
    if (parts.length < 2 || parts.length > 3 || NOT_USERS.includes(parts[0]) || NOT_BOARDS.includes(parts[1])) { finish("not-a-board"); return; }
    const [username, slug, sectionSlug] = parts;

    const b = await call("Board", { username, slug, field_set_key: "detailed" });
    if (!b.ok || !b.data?.id) { finish(b.status === 404 || b.status === 401 || b.status === 403 ? "not-found" : "error"); return; }
    const board = b.data;

    const sections = [];
    let ok = true;
    if (sectionSlug || board.section_count) ok = await walk("BoardSections", { board_id: board.id }, (list) => { sections.push(...list.filter((s) => s?.id)); });

    if (sectionSlug) {
      const section = sections.find((s) => s.slug === sectionSlug);
      if (!section) { finish(ok ? "not-found" : "error"); return; }
      ok = await walk("BoardSectionPins", { section_id: section.id, page_size: PAGE_SIZE }, report(section.pin_count));
    } else {
      // The board's own feed holds the pins outside its sections; each section holds its own
      ok = (await walk("BoardFeed", { board_id: board.id, board_url: board.url || source, page_size: PAGE_SIZE, field_set_key: "react_grid_pin" }, report(board.pin_count))) && ok;
      for (const s of sections) {
        if (stopped) break;
        ok = (await walk("BoardSectionPins", { section_id: s.id, page_size: PAGE_SIZE }, report(board.pin_count))) && ok;
      }
    }
    finish(ok ? "end" : seen.size ? "partial" : "error");
  })();
})();
