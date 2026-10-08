// The boards the extension can import, in one place: which pages are a board on Are.na, Pinterest
// or Cosmos, the hosts Chrome is asked for, and the collector that reads one. Loaded by the import
// page, the popup, the service worker (importScripts) and the in-page button, so all four agree.
// Platform names are only said to tell where something comes from: no logos.
(() => {
  const parts = (u) => u.pathname.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });

  const BOARDS = {
    arena: {
      name: "Are.na",
      pages: ["https://www.are.na/*", "https://are.na/*"],
      api: ["https://api.are.na/*"],
      collector: "arena-collect.js",
      /** are.na/<user>/<channel> or are.na/channel/<channel> */
      board(u) {
        if (!/^(www\.)?are\.na$/.test(u.hostname)) return null;
        const [first, slug, more] = parts(u);
        if (!first || !slug || more) return null;
        if (["block", "search", "explore", "settings", "about", "feed", "notifications", "share", "pricing", "blog"].includes(first)) return null;
        if (["channels", "blocks", "followers", "following", "groups", "index", "table"].includes(slug)) return null;
        return `https://www.are.na/${first}/${slug}`;
      },
    },
    pinterest: {
      name: "Pinterest",
      pages: ["https://*.pinterest.com/*"],
      api: [],
      collector: "pinterest-collect.js",
      /** <user>/<board>/ or <user>/<board>/<section>/, on whatever Pinterest it was copied from */
      board(u) {
        if (!/(^|\.)pinterest\.[a-z]{2,3}(\.[a-z]{2})?$/.test(u.hostname)) return null;
        const p = parts(u);
        if (p.length < 2 || p.length > 3) return null;
        if (["pin", "search", "ideas", "today", "settings", "business", "login", "signup", "resource", "_"].includes(p[0])) return null;
        if (["_saved", "_created", "_pins", "pins", "boards", "_profile", "_shop"].includes(p[1])) return null;
        const host = u.hostname.endsWith(".pinterest.com") ? u.hostname : "www.pinterest.com";
        return `https://${host}/${p.join("/")}/`;
      },
    },
    cosmos: {
      name: "Cosmos",
      pages: ["https://www.cosmos.so/*", "https://cosmos.so/*"],
      api: ["https://api.cosmos.so/*"],
      collector: "cosmos-collect.js",
      /** cosmos.so/<user>/<cluster> */
      board(u) {
        if (!/^(www\.)?cosmos\.so$/.test(u.hostname)) return null;
        const p = parts(u);
        if (p.length !== 2) return null;
        if (["e", "p", "discover", "search", "settings", "explore", "login", "signup", "about", "pricing"].includes(p[0])) return null;
        if (["elements", "clusters", "likes", "followers", "following"].includes(p[1])) return null;
        return `https://www.cosmos.so/${p[0]}/${p[1]}`;
      },
    },
  };

  /** The board an address points to, as { source, url } with the board's own address; null for anything else */
  function boardOf(raw) {
    const s = String(raw || "").trim();
    if (!s || /\s/.test(s)) return null;
    let u;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    for (const [source, b] of Object.entries(BOARDS)) {
      const url = b.board(u);
      if (url) return { source, url };
    }
    return null;
  }

  /** Everything Chrome is asked for to read one platform's boards: its pages and its API */
  const hostsOf = (source) => [...BOARDS[source].pages, ...BOARDS[source].api];

  globalThis.CriterioBoards = { BOARDS, boardOf, hostsOf };
})();
