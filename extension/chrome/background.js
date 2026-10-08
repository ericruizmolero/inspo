// The extension's service worker. It acts as a mailbox: it gets the key from content.js
// (which picks it up at criterio.design/extension/install or /connect) and stores it in
// chrome.storage.local. Everything else (API calls) the popup does directly.

importScripts("boards.js");
const { BOARDS, boardOf, hostsOf } = globalThis.CriterioBoards;

// Only an origin this build may reach can be the base: the key and every saved page go there
const allowedBase = (base) => {
  try {
    const origin = new URL(base).origin;
    return (chrome.runtime.getManifest().host_permissions || []).some((h) => new URL(h.replace(/\*$/, "")).origin === origin.replace(/:\d+$/, "")) ? origin : null;
  } catch { return null; }
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "import-board") { openBoardImport(msg.url, sender); return false; }
  const base = sender.id === chrome.runtime.id && sender.origin ? allowedBase(sender.origin) : null;
  if (msg?.type === "ext-key" && typeof msg.key === "string" && msg.key.startsWith("crit_") && base) {
    chrome.storage.local
      .set({ key: msg.key, base, workspace: msg.workspace ?? null, connectedAt: Date.now() })
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async response
  }
  return false;
});

// Just installed: on to the guide, where the next step is connecting. The guide is usually
// already open (the zip was downloaded from it) and that tab cannot see the extension until it
// loads again, so it is reloaded and brought to the front instead of opening a second one.
const GUIDE = "https://criterio.design/extension/install";
const GUIDE_TABS = [`${GUIDE}*`, "http://localhost/extension/install*"];

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;
  // Only the hosts this build may read count: the packed one has no localhost
  const allowed = chrome.runtime.getManifest().host_permissions || [];
  const patterns = GUIDE_TABS.filter((p) => allowed.some((h) => p.startsWith(h.replace(/\*$/, ""))));
  const [open] = await chrome.tabs.query({ url: patterns }).catch(() => []);
  if (!open) { await chrome.tabs.create({ url: GUIDE }); return; }
  await chrome.tabs.reload(open.id);
  await chrome.tabs.update(open.id, { active: true });
  await chrome.windows.update(open.windowId, { focused: true });
});

// ─── Right-click: save one image or video ────────────────────────────────────
// The menu sits on images and videos. A click finds the element on the page and cuts the piece of the
// tab it covers (activeTab allows the capture, as when the popup opens), keeps both in session storage
// and opens the popup, which shows the media with the same form as a site: the note, the project, the
// areas of its system. The popup sends it to POST /api/ext/v1/media.

const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "save-image", title: t("menuSaveImage"), contexts: ["image"] });
    chrome.contextMenus.create({ id: "save-video", title: t("menuSaveVideo"), contexts: ["video"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const kind = info.menuItemId === "save-image" ? "image" : info.menuItemId === "save-video" ? "video" : null;
  if (kind && tab?.id != null) pickMedia(kind, info, tab).catch((e) => console.error("criterio: right-click", e));
});

async function pickMedia(kind, info, tab) {
  const frameId = info.frameId ?? 0;
  const spot = await locate(tab.id, frameId, info.srcUrl, kind);
  // The cut only lines up with the tab when the element is in the page itself, not in a frame inside it
  const frame = spot && frameId === 0 ? await cut(tab.windowId, spot) : undefined;
  await chrome.storage.session.set({
    pending: { kind, src: spot?.file || info.srcUrl, link: spot?.link || "", page: info.frameUrl || info.pageUrl || tab.url, title: tab.title, favicon: tab.favIconUrl, alt: spot?.alt || "", frame, at: Date.now() },
  });
  // The popup itself, anchored to the toolbar icon. Where Chrome won't open it from here, the same page in a small window
  try { await chrome.action.openPopup({ windowId: tab.windowId }); }
  catch { await chrome.windows.create({ url: chrome.runtime.getURL("popup.html?window=1"), type: "popup", width: 368, height: 680, focused: true }); }
}

/** Where the right-clicked element sits in the tab, and its alt text. null if it can't be found. */
async function locate(tabId, frameId, src, kind) {
  try {
    const [r] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      args: [src || "", kind],
      func: (src, kind) => {
        const same = (el) => el.currentSrc === src || el.src === src
          || (kind === "video" && [...el.querySelectorAll("source")].some((s) => s.src === src));
        let best = null, bestArea = 0;
        for (const el of document.querySelectorAll(kind === "video" ? "video" : "img")) {
          if (!same(el)) continue;
          const b = el.getBoundingClientRect();
          const x = Math.max(0, b.left), y = Math.max(0, b.top);
          const w = Math.min(innerWidth, b.right) - x, h = Math.min(innerHeight, b.bottom) - y;
          if (w > 0 && h > 0 && w * h > bestArea) { bestArea = w * h; best = { el, x, y, w, h }; }
        }
        if (!best) return null;
        const el = best.el;
        const alt = el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("aria-label") || "";
        if (kind !== "video") return { x: best.x, y: best.y, w: best.w, h: best.h, vw: innerWidth, alt };
        // A video played from a blob: has no address to copy. Its real file, when the page loaded one
        // whole: a <source> of its own, or the biggest video file in what the page has fetched
        const isFile = (u) => /^https?:/.test(u) && /\.(mp4|m4v|webm|mov)(\?|#|$)/i.test(u);
        let file = [el.currentSrc, el.src, ...[...el.querySelectorAll("source")].map((x) => x.src)].find(isFile) || "";
        if (!file && !/^https?:/.test(el.currentSrc || src)) {
          const loaded = performance.getEntriesByType("resource").filter((r) => isFile(r.name) && !/[?&](range|bytestart)=/i.test(r.name));
          file = loaded.sort((a, b) => (b.encodedBodySize || b.transferSize || 0) - (a.encodedBodySize || a.transferSize || 0))[0]?.name || "";
        }
        // The post it sits in (on X, the link that holds the post's time), else the closest link to a video page
        const box = el.closest("article, [data-testid='tweet']");
        const link = box?.querySelector("a[href*='/status/'] time")?.closest("a")?.href || el.closest("a[href]")?.href || "";
        return { x: best.x, y: best.y, w: best.w, h: best.h, vw: innerWidth, alt, file, link };
      },
    });
    return r?.result ?? null;
  } catch { return null; } // a page the extension may not touch
}

/** The piece of the visible tab the element covers, as a JPEG data URL */
async function cut(windowId, spot) {
  try {
    const shot = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    const bmp = await createImageBitmap(await (await fetch(shot)).blob());
    const k = bmp.width / spot.vw; // device pixels per CSS pixel, zoom included
    const sx = Math.round(spot.x * k), sy = Math.round(spot.y * k);
    const sw = Math.min(bmp.width - sx, Math.round(spot.w * k)), sh = Math.min(bmp.height - sy, Math.round(spot.h * k));
    if (sw < 24 || sh < 24) return undefined;
    const fit = Math.min(1, 2000 / Math.max(sw, sh));
    const c = new OffscreenCanvas(Math.round(sw * fit), Math.round(sh * fit));
    c.getContext("2d").drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.86 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:image/jpeg;base64,${btoa(bin)}`;
  } catch { return undefined; } // protected pages: the server fetches the image on its own
}

// ─── The import button on a board ────────────────────────────────────────────
// Once the person grants a platform (on the import page or from the popup), board-button.js is
// registered on its pages: a board there shows "Import to Criterio". Never at install, and gone
// again when the permission is taken back. The click opens the import page on that board.

const scriptId = (source) => `board-button-${source}`;

/** Each platform's button registered exactly when its hosts are granted, whatever was there before */
async function syncBoardButtons() {
  const registered = new Set((await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id));
  for (const source of Object.keys(BOARDS)) {
    const id = scriptId(source);
    const granted = await chrome.permissions.contains({ origins: hostsOf(source) });
    if (granted && !registered.has(id)) {
      await chrome.scripting.registerContentScripts([{ id, matches: BOARDS[source].pages, js: ["boards.js", "board-button.js"], runAt: "document_idle" }])
        .catch((e) => console.error("criterio: button", source, e));
    } else if (!granted && registered.has(id)) {
      await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {});
    }
  }
}

// One sync at a time: two grants in a row would otherwise register the same id twice
let syncing = Promise.resolve();
const sync = () => { syncing = syncing.then(syncBoardButtons).catch((e) => console.error("criterio: buttons", e)); };
chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.permissions.onAdded.addListener(sync);
chrome.permissions.onRemoved.addListener(sync);

/** The button's click: the import page, next to the board's tab, importing that board */
function openBoardImport(url, sender) {
  if (sender.id !== chrome.runtime.id || !sender.tab) return;
  const board = boardOf(url);
  if (!board) return;
  const page = chrome.runtime.getURL(`import.html?source=${board.source}&url=${encodeURIComponent(board.url)}`);
  chrome.tabs.create({ url: page, index: sender.tab.index + 1, openerTabId: sender.tab.id });
}
