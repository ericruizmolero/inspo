// The extension's service worker. It acts as a mailbox: it gets the key from content.js
// (which picks it up at criterio.design/extension/install or /connect) and stores it in
// chrome.storage.local. Everything else (API calls) the popup does directly.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ext-key" && typeof msg.key === "string" && msg.key.startsWith("crit_")) {
    chrome.storage.local
      .set({ key: msg.key, base: msg.base, workspace: msg.workspace ?? null, connectedAt: Date.now() })
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
    pending: { kind, src: info.srcUrl, page: info.frameUrl || info.pageUrl || tab.url, title: tab.title, favicon: tab.favIconUrl, alt: spot?.alt || "", frame, at: Date.now() },
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
        const alt = best.el.getAttribute("alt") || best.el.getAttribute("title") || best.el.getAttribute("aria-label") || "";
        return { x: best.x, y: best.y, w: best.w, h: best.h, vw: innerWidth, alt };
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
