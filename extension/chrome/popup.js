// The extension popup. Two views: "connect" (no key) and "tab" (save something). What gets saved is
// the current tab, or the image or video right-clicked in it (background.js leaves it in session
// storage and opens the popup). Either way the form is the board's add dialog: what caught the eye,
// the project, the areas of its system. All the name, collection and tag logic lives on the server:
// this only sends the address, the title, a screenshot and that form
// (see app/api/ext/v1/items/route.ts and media/route.ts).

const DEFAULT_BASE = "https://app.criterio.design";
// Where the app used to live: an extension connected before the move (11 Oct 2026) still has it stored,
// and there criterio.design is the marketing site, which answers every call with an error
const MOVED = { "https://criterio.design": DEFAULT_BASE, "https://www.criterio.design": DEFAULT_BASE };
const baseOf = (stored) => MOVED[stored] || stored || DEFAULT_BASE;
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

// A comment on the running page: localhost, a preview or the live site. The picker runs in the tab only after this click
// (activeTab). The key never reaches the page: background.js sends the comment.
async function startComment() {
  const projectId = $("project-select").value;
  if (!tab?.id || !projectId) return;
  await chrome.storage.session.set({ commentProject: projectId });
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["comment-pick.js"] });
    window.close();
  } catch { note($("tab-msg"), t("commentBlocked"), "error"); }
}

// The toolbar icon is Tino alone, in white for Chrome's dark bar. On a light bar white would vanish, so the popup,
// which can tell, swaps it for ink; it stays until Chrome restarts
if (matchMedia("(prefers-color-scheme: light)").matches) {
  chrome.action?.setIcon({ path: { 16: "icons/tino-ink-16.png", 32: "icons/tino-ink-32.png" } }).catch(() => {});
}

async function load() {
  $("btn-comment")?.addEventListener("click", () => void startComment());
  document.documentElement.lang = chrome.i18n.getUILanguage();
  if (inWindow) document.body.classList.add("is-window");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  // A right-click from the last two minutes: read once, so the next click on the icon shows the tab again
  const { pending } = await chrome.storage.session.get("pending").catch(() => ({}));
  if (pending) { await chrome.storage.session.remove("pending"); if (Date.now() - pending.at < 120_000) media = pending; }
  const s = await chrome.storage.local.get(["key", "base", "workspace", "workspaces", "user"]);
  if (MOVED[s.base]) await chrome.storage.local.set({ base: MOVED[s.base] });
  state = { key: s.key || null, base: baseOf(s.base), workspace: s.workspace || null, workspaces: s.workspaces || [], user: s.user || null };
  if (!state.key) { setView("connect"); showSignupMode(); return; }
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
  typography: '<path d="M87.24,52.59a8,8,0,0,0-14.48,0l-64,136a8,8,0,1,0,14.48,6.81L39.9,160h80.2l16.66,35.4a8,8,0,1,0,14.48-6.81ZM47.43,144,80,74.79,112.57,144ZM200,96c-12.76,0-22.73,3.47-29.63,10.32a8,8,0,0,0,11.26,11.36c3.8-3.77,10-5.68,18.37-5.68,13.23,0,24,9,24,20v3.22A42.76,42.76,0,0,0,200,128c-22.06,0-40,16.15-40,36s17.94,36,40,36a42.73,42.73,0,0,0,24-7.25,8,8,0,0,0,16-.75V132C240,112.15,222.06,96,200,96Zm0,88c-13.23,0-24-9-24-20s10.77-20,24-20,24,9,24,20S213.23,184,200,184Z"></path>',
  color: '<path d="M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z"></path>',
  layout: '<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V96H40V56ZM40,112H96v88H40Zm176,88H112V112H216v88Z"></path>',
  motion: '<path d="M200,168a32.06,32.06,0,0,0-31,24H72a32,32,0,0,1,0-64h96a40,40,0,0,0,0-80H72a8,8,0,0,0,0,16h96a24,24,0,0,1,0,48H72a48,48,0,0,0,0,96h97a32,32,0,1,0,31-40Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,200,216Z"></path>',
  iconography: '<path d="M71.59,61.47a8,8,0,0,0-15.18,0l-40,120A8,8,0,0,0,24,192h80a8,8,0,0,0,7.59-10.53ZM35.1,176,64,89.3,92.9,176ZM208,76a52,52,0,1,0-52,52A52.06,52.06,0,0,0,208,76Zm-88,0a36,36,0,1,1,36,36A36,36,0,0,1,120,76Zm104,68H136a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h88a8,8,0,0,0,8-8V152A8,8,0,0,0,224,144Zm-8,56H144V160h72Z"></path>',
  logo: '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm23.09-75.79A32,32,0,0,0,136,80H104a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V144h22.39l19,28.44a8,8,0,0,0,13.32-8.88ZM112,96h24a16,16,0,0,1,0,32H112Z"></path>',
  imagery: '<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"></path>',
  voice: '<path d="M100,56H40A16,16,0,0,0,24,72v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,100,56Zm0,80H40V72h60ZM216,56H156a16,16,0,0,0-16,16v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,216,56Zm0,80H156V72h60Z"></path>',
};
const picked = new Set();

function drawAreas() {
  $("areas").replaceChildren(...Object.entries(AREAS).map(([area, paths]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pill"; b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${paths}</svg>`;
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
  showBoardOffer();
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
  $("tabs").hidden = true;
  const img = $("shot-img");
  // The image itself when it can be shown from here; the cut piece of the tab otherwise (and for a video, its frame)
  const src = media.kind === "image" && /^(https?|data):/.test(media.src || "") ? media.src : media.frame;
  if (src) {
    img.onerror = () => { if (media.frame && img.src !== media.frame) img.src = media.frame; else $("shot").hidden = true; };
    showShot(src);
  }
  $("tab-title").textContent = media.alt || media.title || shortUrl(media.page);
  $("tab-host").textContent = `${t(media.kind === "video" ? "kindVideo" : "kindImage")}, ${shortUrl(media.page)}`;
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

// Signed out: whether a new account needs an invitation right now (/api/access/mode, the flag set in /admin)
async function showSignupMode() {
  if ($("connect-msg").textContent) return;
  const r = await fetch(`${state.base}/api/access/mode`).then((res) => res.json()).catch(() => null);
  if (r?.mode && !$("connect-msg").textContent) note($("connect-msg"), t(r.mode === "invite" ? "signupInviteOnly" : "signupOpen"), null);
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
// The two tabs: Save (what is open) and Import (what is saved elsewhere)
function showPane(pane) {
  for (const b of document.querySelectorAll(".seg__item")) {
    const on = b.dataset.pane === pane;
    b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
  }
  $("pane-save").hidden = pane !== "save";
  $("pane-import").hidden = pane !== "import";
}
for (const b of document.querySelectorAll(".seg__item")) b.addEventListener("click", () => showPane(b.dataset.pane));
$("tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const next = $("tab-save").classList.contains("is-active") ? "import" : "save";
  showPane(next); $(`tab-${next}`).focus();
});

// Every place to import from, named in words and drawn with a plain icon (never the platform's logo). A board
// opens the import page on its address field; X and the browser on their own section
const ICON = (d) => `<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${d}"></path></svg>`;
const SOURCES = [
  { id: "x", name: "importRowX", what: "importRowXWhat", icon: "M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z" },
  { id: "pinterest", name: "importRowPinterest", what: "importRowPinterestWhat", icon: "M235.32,81.37,174.63,20.69a16,16,0,0,0-22.63,0L98.37,74.49c-10.66-3.34-35-7.37-60.4,13.14a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33c19.64-26.1,17.75-47.32,13.19-60L235.33,104A16,16,0,0,0,235.32,81.37ZM224,92.69h0l-57.27,57.46a8,8,0,0,0-1.49,9.22c9.46,18.93-1.8,38.59-9.34,48.62L48,100.08c12.08-9.74,23.64-12.31,32.48-12.31A40.13,40.13,0,0,1,96.81,91a8,8,0,0,0,9.25-1.51L163.32,32,224,92.68Z" },
  { id: "arena", name: "importRowArena", what: "importRowArenaWhat", icon: "M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z" },
  { id: "cosmos", name: "importRowCosmos", what: "importRowCosmosWhat", icon: "M245.11,60.68c-7.65-13.19-27.84-16.16-58.5-8.66A95.93,95.93,0,0,0,32,128a98,98,0,0,0,.78,12.31C5.09,169,5.49,186,10.9,195.32,16,204.16,26.64,208,40.64,208a124.11,124.11,0,0,0,28.79-4A95.93,95.93,0,0,0,224,128a97.08,97.08,0,0,0-.77-12.25c12.5-13,20.82-25.35,23.65-35.92C248.83,72.51,248.24,66.07,245.11,60.68ZM128,48a80.11,80.11,0,0,1,78,62.2c-17.06,16.06-40.15,32.53-62.07,45.13C116.38,171.14,92.48,181,73.42,186.4A79.94,79.94,0,0,1,128,48ZM24.74,187.29c-1.46-2.51-.65-7.24,2.22-13a79.05,79.05,0,0,1,10.29-15.05,96,96,0,0,0,18,31.32C38,193.46,27.24,191.61,24.74,187.29ZM128,208a79.45,79.45,0,0,1-38.56-9.94,370,370,0,0,0,62.43-28.86c21.58-12.39,40.68-25.82,56.07-39.08A80.07,80.07,0,0,1,128,208ZM231.42,75.69c-1.7,6.31-6.19,13.53-12.63,21.13a95.69,95.69,0,0,0-18-31.35c14.21-2.35,27.37-2.17,30.5,3.24C232.19,70.28,232.24,72.63,231.42,75.69Z" },
  { id: "browser", name: "importRowBrowser", what: "importRowBrowserWhat", icon: "M160,56H64A16,16,0,0,0,48,72V224a8,8,0,0,0,12.65,6.51L112,193.83l51.36,36.68A8,8,0,0,0,176,224V72A16,16,0,0,0,160,56Zm0,152.46-43.36-31a8,8,0,0,0-9.3,0L64,208.45V72h96ZM208,40V192a8,8,0,0,1-16,0V40H88a8,8,0,0,1,0-16H192A16,16,0,0,1,208,40Z" },
];
const CARET = ICON("M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z");
// Importing takes a while and the popup closes on its own: it happens in a tab of its own (import.html),
// opened on the source that was tapped
const openImport = (source) => async () => { await chrome.tabs.create({ url: chrome.runtime.getURL(`import.html?source=${source}`) }); window.close(); };
$("sources").replaceChildren(...SOURCES.map((x) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "source-row"; b.id = `src-${x.id}`;
  b.innerHTML = `<span class="source-row__icon">${ICON(x.icon)}</span><span class="source-row__text"><span class="source-row__name"></span><span class="source-row__what"></span></span><span class="source-row__go">${CARET}</span>`;
  b.querySelector(".source-row__name").textContent = t(x.name);
  b.querySelector(".source-row__what").textContent = t(x.what);
  // Safari has no bookmarks API
  if (x.id === "browser" && !chrome.bookmarks) b.hidden = true;
  b.addEventListener("click", openImport(x.id));
  return b;
}));
// On a board of Are.na, Pinterest or Cosmos: "Import this board" first. Chrome asks for that platform here,
// on the click, and the import page starts on its own
const { BOARDS, boardOf, hostsOf } = globalThis.CriterioBoards;
const tabBoard = () => (tab?.url ? boardOf(tab.url) : null);
$("btn-import-this").addEventListener("click", async () => {
  const board = tabBoard();
  if (!board) return;
  try { await chrome.permissions.request({ origins: hostsOf(board.source) }); } catch { /* the import page asks again */ }
  return openImport(`${board.source}&url=${encodeURIComponent(board.url)}`)();
});
/** Standing on a board, the popup opens on Import with that board first */
function showBoardOffer() {
  const board = tabBoard();
  $("btn-import-this").hidden = !board;
  if (!board) return;
  $("btn-import-this").textContent = `${t("importThisBoard")} (${BOARDS[board.source].name})`;
  showPane("import");
}

// If the key arrives while the popup is open (connect tab), it refreshes itself
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

drawAreas();
load().catch((e) => { setView("connect"); note($("connect-msg"), e.message, "error"); });
