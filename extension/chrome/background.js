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
// The menu sits on images and videos. A click finds the element on the page, cuts the piece of the
// tab it covers (activeTab allows the capture, as when the popup opens), and sends both to
// POST /api/ext/v1/media, which copies the image or links the video and files it on the board this
// person was working on. A small note in the page says how it went: there is no popup to say it.

const DEFAULT_BASE = "https://criterio.design";
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "save-image", title: t("menuSaveImage"), contexts: ["image"] });
    chrome.contextMenus.create({ id: "save-video", title: t("menuSaveVideo"), contexts: ["video"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const kind = info.menuItemId === "save-image" ? "image" : info.menuItemId === "save-video" ? "video" : null;
  if (kind && tab?.id != null) saveMedia(kind, info, tab).catch((e) => toast(tab.id, "error", String(e?.message || e)));
});

async function saveMedia(kind, info, tab) {
  const s = await chrome.storage.local.get(["key", "base", "workspace"]);
  const base = s.base || DEFAULT_BASE;
  if (!s.key) { await chrome.tabs.create({ url: `${base}/extension/connect` }); return; }

  // Before the note shows up, so it stays out of the cut
  const spot = await locate(tab.id, info.frameId ?? 0, info.srcUrl, kind);
  const frame = spot && (info.frameId ?? 0) === 0 ? await cut(tab.windowId, spot) : undefined;
  await toast(tab.id, "busy", t("saving"));

  const res = await fetch(`${base}/api/ext/v1/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${s.key}`, "Content-Type": "application/json",
      ...(s.workspace?.id ? { "X-Workspace": s.workspace.id } : {}),
    },
    body: JSON.stringify({ kind, src: info.srcUrl, page: info.frameUrl || info.pageUrl || tab.url, title: tab.title, alt: spot?.alt, frame }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await chrome.storage.local.remove(["key", "workspace", "workspaces", "user", "connectedAt"]);
    return toast(tab.id, "error", t("keyInvalid"));
  }
  if (!res.ok) return toast(tab.id, "error", data.error || t("errorStatus", [String(res.status)]));
  const where = s.workspace?.name || t("yourLibrary");
  const href = base + (data.item?.id ? `/i/${data.item.id}` : "/");
  return toast(tab.id, "ok", data.existed ? t("alreadySaved", [where]) : t("savedIn", [where]), href, t("open"));
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

/** A quiet note at the bottom right of the page: saving, saved (with a link), or what went wrong */
async function toast(tabId, state, text, href, linkText) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [state, text, href || "", linkText || ""],
      func: (state, text, href, linkText) => {
        const ID = "criterio-ext-toast";
        let host = document.getElementById(ID);
        if (!host) {
          host = document.createElement("div");
          host.id = ID;
          host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;";
          const root = host.attachShadow({ mode: "open" });
          root.innerHTML = `<style>
            :host { all: initial; }
            .t { --bg:#151514; --fg:#f2f2ef; --muted:#8a8a84; --line:rgba(255,255,250,.1); --ok:#5ac97a; --bad:#e5645a;
              display:flex; align-items:center; gap:10px; max-width:340px; padding:10px 14px;
              background:var(--bg); color:var(--fg); border:1px solid var(--line); border-radius:12px;
              box-shadow:0 8px 24px -8px rgba(0,0,0,.5); font:500 13px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;
              -webkit-font-smoothing:antialiased; opacity:0; transform:translateY(6px); transition:opacity .18s ease-out, transform .18s ease-out; }
            @media (prefers-color-scheme: light) { .t { --bg:#f9f9f7; --fg:#0e0e0d; --muted:#5d5d57; --line:rgba(0,0,0,.12); --ok:#267d3f; --bad:#c23a30;
              box-shadow:0 8px 24px -8px rgba(0,0,0,.18); } }
            .t.on { opacity:1; transform:none; }
            .i { width:12px; height:12px; flex-shrink:0; border-radius:50%; }
            .busy .i { border:1.5px solid color-mix(in srgb, var(--muted) 35%, transparent); border-top-color:var(--fg); animation:s .7s linear infinite; }
            .ok .i { background:var(--ok); transform:scale(.6); }
            .error .i { background:var(--bad); transform:scale(.6); }
            .m { overflow:hidden; text-overflow:ellipsis; }
            a { color:var(--fg); text-decoration:underline; text-underline-offset:2px; text-decoration-color:var(--muted); white-space:nowrap; }
            a:hover { text-decoration-color:currentColor; }
            @keyframes s { to { transform:rotate(360deg); } }
            @media (prefers-reduced-motion: reduce) { .t { transition:none; } .busy .i { animation:none; } }
          </style><div class="t" role="status" aria-live="polite"><span class="i"></span><span class="m"></span><a target="_blank" rel="noopener" hidden></a></div>`;
          document.documentElement.appendChild(host);
        }
        const box = host.shadowRoot.querySelector(".t");
        box.className = `t ${box.classList.contains("on") ? "on " : ""}${state}`; // the first time it slides in
        box.querySelector(".m").textContent = text;
        const a = box.querySelector("a");
        a.hidden = !href; a.href = href || "#"; a.textContent = linkText;
        requestAnimationFrame(() => box.classList.add("on"));
        clearTimeout(host._timer);
        if (state !== "busy") host._timer = setTimeout(() => { box.classList.remove("on"); setTimeout(() => host.remove(), 200); }, state === "error" ? 6000 : 4000);
      },
    });
  } catch { /* a page the extension may not touch: the save still happened */ }
}
