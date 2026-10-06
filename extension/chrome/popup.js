// The extension popup. Two views: "connect" (no key) and "tab" (save something). What gets saved is
// the current tab, or the image or video right-clicked in it (background.js leaves it in session
// storage and opens the popup). Either way the form is the board's add dialog: what caught the eye,
// the project, the areas of its system. All the name, collection and tag logic lives on the server:
// this only sends the address, the title, a screenshot and that form
// (see app/api/ext/v1/items/route.ts and media/route.ts).

const DEFAULT_BASE = "https://criterio.design";
const API = "/api/ext/v1";

// Texts come from _locales/<lang>/messages.json (browser language; English if there is no translation)
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const ws = () => state.workspace?.name || t("yourLibrary");

const $ = (id) => document.getElementById(id);
const app = $("app");
const setView = (v) => { app.dataset.view = v; };
const note = (el, text, kind) => { el.textContent = text || ""; el.className = "hint" + (kind ? ` is-${kind}` : ""); };

let state = { key: null, base: DEFAULT_BASE, workspace: null, workspaces: [], user: null };
let tab = null;
/** The image or video right-clicked, while it is what this popup saves; null for the tab itself */
let media = null;
/** Opened as a window of its own (where Chrome would not open the popup from the right-click) */
const inWindow = new URLSearchParams(location.search).has("window");

const api = async (path, init = {}) => {
  const res = await fetch(state.base + API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${state.key}`, "Content-Type": "application/json",
      ...(state.workspace?.id ? { "X-Workspace": state.workspace.id } : {}), // where this popup saves
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { await disconnect(false); throw new Error(data.error || t("keyInvalid")); }
  if (!res.ok) throw new Error(data.error || t("errorStatus", [String(res.status)]));
  return data;
};

async function load() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  if (inWindow) document.body.classList.add("is-window");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  // A right-click from the last two minutes: read once, so the next click on the icon shows the tab again
  const { pending } = await chrome.storage.session.get("pending").catch(() => ({}));
  if (pending) { await chrome.storage.session.remove("pending"); if (Date.now() - pending.at < 120_000) media = pending; }
  const s = await chrome.storage.local.get(["key", "base", "workspace", "workspaces", "user"]);
  state = { key: s.key || null, base: s.base || DEFAULT_BASE, workspace: s.workspace || null, workspaces: s.workspaces || [], user: s.user || null };
  if (!state.key) { setView("connect"); return; }
  setChip();
  showFoot();
  setView("tab");
  await (media ? showMedia() : loadTab());
  loadProjects();
  // Checks the key in the background and refreshes the workspace and person names
  api("/me").then((me) => {
    state.workspace = me.workspace; state.workspaces = me.workspaces || []; state.user = me.user;
    chrome.storage.local.set({ workspace: me.workspace, workspaces: state.workspaces, user: me.user });
    setChip(); showFoot();
  }).catch((e) => note($("tab-msg"), e.message, "error"));
}

// Top right: the workspace this popup saves to, switchable among all the person's workspaces
function setChip() {
  const sel = $("ws-select");
  const list = state.workspaces.length ? state.workspaces : state.workspace ? [state.workspace] : [];
  sel.replaceChildren(...list.map((w) => { const o = document.createElement("option"); o.value = w.id; o.textContent = w.name; return o; }));
  if (state.workspace) sel.value = state.workspace.id;
  $("ws-chip").hidden = list.length === 0;
}

$("ws-select").addEventListener("change", async () => {
  const w = state.workspaces.find((x) => x.id === $("ws-select").value);
  if (!w || w.id === state.workspace?.id) return;
  state.workspace = w;
  await chrome.storage.local.set({ workspace: w });
  loadProjects(); // each workspace has its own projects
  if (!media) await loadTab(); // the same site may or may not be in this workspace
});

function showFoot() {
  $("foot").hidden = false;
  $("who").textContent = state.user?.email || state.workspace?.name || "";
}

// ─── Where it lands: the project and the areas of its system ─────────────────
// The same eight areas, in the same order and with the same drawings, as the board's add dialog
const AREAS = {
  typography: '<path d="M3.5 5V3.5h9V5M8 3.5v9M6.5 12.5h3"/>',
  color: '<path d="M8 2.3c2.5 2.7 4 4.8 4 6.9a4 4 0 01-8 0c0-2.1 1.5-4.2 4-6.9z"/>',
  layout: '<rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M2.5 6.5h11M6.5 6.5v7"/>',
  motion: '<circle cx="10.5" cy="8" r="3.5"/><path d="M2.5 5.5H5M1.5 8h2.8M2.5 10.5H5"/>',
  iconography: '<path d="M8 2.3l2.8 4.7H5.2z"/><rect x="2.5" y="9.2" width="4.6" height="4.6" rx="1"/><circle cx="11.3" cy="11.5" r="2.4"/>',
  logo: '<circle cx="8" cy="8" r="5.75"/><path d="M6.5 10.6V5.4h1.8a1.5 1.5 0 010 3H6.5M8.5 8.5l1.4 2.1"/>',
  imagery: '<rect x="2.5" y="3" width="11" height="10" rx="2"/><circle cx="6" cy="6.4" r="1"/><path d="M2.8 11.2l3-2.8 2.5 2.3 1.8-1.6 3.1 2.8"/>',
  voice: '<path d="M6.4 7.9H2.8V4.5h3.6v4.6c0 1.4-.8 2.3-2.2 2.6"/><path d="M13 7.9H9.4V4.5H13v4.6c0 1.4-.8 2.3-2.2 2.6"/>',
};
const picked = new Set();

function drawAreas() {
  $("areas").replaceChildren(...Object.entries(AREAS).map(([area, paths]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pill"; b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    b.append(t(`area_${area}`));
    b.addEventListener("click", () => {
      if (picked.has(area)) picked.delete(area); else picked.add(area);
      b.setAttribute("aria-pressed", String(picked.has(area)));
    });
    return b;
  }));
}

async function loadProjects() {
  try {
    const r = await api("/projects");
    const sel = $("project-select");
    sel.replaceChildren(...r.projects.map((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; return o; }));
    if (r.active) sel.value = r.active;
    $("dest").hidden = r.projects.length === 0;
  } catch { $("dest").hidden = true; } // it still saves, to the project the server picks
}

// ─── What is saved ───────────────────────────────────────────────────────────

/** The address as it will be shown: host and path, without the scheme or a trailing slash */
const shortUrl = (url) => { try { const u = new URL(url); return (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, ""); } catch { return ""; } };

function setFavicon(src) {
  if (src && !/^chrome/.test(src)) { $("tab-fav").src = src; $("tab-fav").hidden = false; $("tab-fav-fallback").setAttribute("hidden", ""); }
}

async function loadTab() {
  const [cur] = await chrome.tabs.query({ active: true, currentWindow: true });
  tab = cur;
  const url = cur?.url || "";
  const ok = /^https?:\/\//.test(url);
  $("tab-title").textContent = cur?.title || url;
  $("tab-host").textContent = ok ? shortUrl(url) : t("notWebsite");
  setFavicon(cur?.favIconUrl);
  resetSave(!ok);
  $("form").hidden = !ok;
  if (!ok) { note($("tab-msg"), t("onlyHttp"), null); return; }
  note($("tab-msg"), "");
  showShot(await capture());
  try {
    const r = await api(`/items/lookup?url=${encodeURIComponent(url)}`);
    if (r.exists) already(r.item);
  } catch (e) { note($("tab-msg"), e.message, "error"); }
}

/** The right-clicked image or video in place of the tab: its picture, its alt text, where it was */
async function showMedia() {
  app.dataset.mode = "media";
  $("extras").hidden = true;
  const img = $("shot-img");
  // The image itself when it can be shown from here; the cut piece of the tab otherwise (and for a video, its frame)
  const src = media.kind === "image" && /^(https?|data):/.test(media.src || "") ? media.src : media.frame;
  if (src) {
    img.onerror = () => { if (media.frame && img.src !== media.frame) img.src = media.frame; else $("shot").hidden = true; };
    showShot(src);
  }
  $("tab-title").textContent = media.alt || media.title || shortUrl(media.page);
  $("tab-host").textContent = `${t(media.kind === "video" ? "kindVideo" : "kindImage")} · ${shortUrl(media.page)}`;
  setFavicon(media.favicon);
  resetSave(false);
  $("form").hidden = false;
  note($("tab-msg"), "");
  setTimeout(() => $("tab-note").focus(), 0);
}

// The shot is taken when the popup opens (activeTab allows it) and reused when saving
let shot;
function showShot(dataUrl) {
  if (!media) shot = dataUrl;
  const img = $("shot-img");
  if (dataUrl) { img.src = dataUrl; img.hidden = false; $("shot").hidden = false; }
}

async function capture() {
  try { return await chrome.tabs.captureVisibleTab(undefined, { format: "jpeg", quality: 72 }); }
  catch { return undefined; } // protected pages: saved without a screenshot
}

// ─── Save, and the button that says how it went ─────────────────────────────

function resetSave(disabled) {
  const btn = $("btn-save");
  btn.hidden = false; btn.disabled = disabled; btn.classList.remove("is-busy", "is-done");
  $("btn-save-label").textContent = t("save");
  $("btn-open").hidden = true;
}

/** "Saved", with a check: the button stays where it was and says it, the form folds away */
function done(item, label) {
  const btn = $("btn-save");
  btn.disabled = true; btn.classList.remove("is-busy"); btn.classList.add("is-done");
  $("btn-save-label").textContent = label;
  $("form").hidden = true;
  showOpen(item);
  // As a window of its own it closes itself once it has said so; the popup closes when the page gets the focus back
  if (inWindow) setTimeout(() => window.close(), 1600);
}

function already(item) {
  note($("tab-msg"), item?.addedBy ? t("alreadySavedBy", [ws(), item.addedBy]) : t("alreadySaved", [ws()]), null);
  done(item, t("savedShort"));
}

// "View on criterio.design": the item itself when we know it, the library otherwise
function showOpen(item) {
  const open = $("btn-open"); open.href = state.base + (item?.id ? `/i/${item.id}` : "/"); open.hidden = false;
}

async function save() {
  if (!media && !tab?.url) return;
  const btn = $("btn-save");
  btn.disabled = true; btn.classList.add("is-busy"); $("btn-save-label").textContent = t("saving");
  note($("tab-msg"), "");
  // "why": not "note", which is the helper that paints the messages below
  const form = { note: $("tab-note").value.trim(), projectId: $("dest").hidden ? undefined : $("project-select").value || undefined, areas: [...picked] };
  try {
    const r = media
      ? await api("/media", { method: "POST", body: JSON.stringify({ kind: media.kind, src: media.src, page: media.page, link: media.link, title: media.title, alt: media.alt, frame: media.frame, ...form }) })
      : await api("/items", { method: "POST", body: JSON.stringify({ url: tab.url, title: tab.title, screenshot: shot || (await capture()), ...form }) });
    if (r.existed) { already(r.item); return; }
    // A video with no file to copy: say what was kept instead of the video itself
    if (r.saved === "page") note($("tab-msg"), t("videoPageSaved"), null);
    done(r.item, t("savedShort"));
  } catch (e) {
    note($("tab-msg"), e.message, "error");
    resetSave(false);
  }
}

async function disconnect(tellServer = true) {
  if (tellServer && state.key) { try { await api("/me", { method: "DELETE" }); } catch { /* already revoked or offline */ } }
  await chrome.storage.local.remove(["key", "workspace", "workspaces", "user", "connectedAt"]);
  state.key = null; state.workspace = null; state.workspaces = []; state.user = null;
  $("foot").hidden = true; setChip();
  resetSave(false);
  note($("connect-msg"), tellServer ? t("disconnected") : t("keyInvalid"), null);
  setView("connect");
}

$("btn-connect").addEventListener("click", async () => {
  const base = state.base || DEFAULT_BASE;
  await chrome.tabs.create({ url: `${base}/extension/connect` });
  window.close();
});

$("btn-paste").addEventListener("click", async () => {
  const key = $("paste-key").value.trim();
  const base = ($("paste-base").value.trim() || DEFAULT_BASE).replace(/\/+$/, "");
  if (!key.startsWith("crit_")) { note($("connect-msg"), t("keyBadFormat"), "error"); return; }
  state = { ...state, key, base };
  try {
    const me = await api("/me");
    await chrome.storage.local.set({ key, base, workspace: me.workspace, workspaces: me.workspaces || [], user: me.user, connectedAt: Date.now() });
    await load();
  } catch (e) { state.key = null; note($("connect-msg"), e.message, "error"); }
});

$("btn-save").addEventListener("click", save);
// ⌘/Ctrl+Enter in the note saves, as in the app's comment box
$("tab-note").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !$("btn-save").disabled) save(); });
$("btn-disconnect").addEventListener("click", () => disconnect(true));
// Importing takes a while and the popup closes on its own: it happens in a tab of its own (import.html),
// opened on the source that was tapped
const openImport = (source) => async () => { await chrome.tabs.create({ url: chrome.runtime.getURL(`import.html?source=${source}`) }); window.close(); };
$("btn-import-x").addEventListener("click", openImport("x"));
$("btn-import-browser").addEventListener("click", openImport("browser"));
// On Pinterest already: the board in this tab is the one the import page offers
$("btn-import-pinterest").addEventListener("click", () => {
  let on = false;
  try { on = /(^|\.)pinterest\.[a-z.]+$/.test(new URL(tab?.url || "").hostname); } catch { /* not a page */ }
  return openImport(on ? `pinterest&url=${encodeURIComponent(tab.url)}` : "pinterest")();
});

// If the key arrives while the popup is open (connect tab), it refreshes itself
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

drawAreas();
load().catch((e) => { setView("connect"); note($("connect-msg"), e.message, "error"); });
