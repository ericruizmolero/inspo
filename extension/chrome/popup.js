// The extension popup. Two views: "connect" (no key) and "tab" (save the current tab).
// All the name, collection and tag logic lives on the server: this only sends the
// address, the title, a screenshot of what's visible and the note of what caught the eye
// (see app/api/ext/v1/items/route.ts).

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
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  const s = await chrome.storage.local.get(["key", "base", "workspace", "workspaces", "user"]);
  state = { key: s.key || null, base: s.base || DEFAULT_BASE, workspace: s.workspace || null, workspaces: s.workspaces || [], user: s.user || null };
  if (!state.key) { setView("connect"); return; }
  setChip();
  showFoot();
  setView("tab");
  await loadTab();
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
  await loadTab(); // the same site may or may not be in this workspace
});

function showFoot() {
  $("foot").hidden = false;
  $("who").textContent = state.user?.email || state.workspace?.name || "";
}

async function loadTab() {
  const [cur] = await chrome.tabs.query({ active: true, currentWindow: true });
  tab = cur;
  const url = cur?.url || "";
  const ok = /^https?:\/\//.test(url);
  $("tab-title").textContent = cur?.title || url;
  // The address as it will be saved: host and path, without the scheme or a trailing slash
  try { const u = new URL(url); $("tab-host").textContent = ok ? (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "") : t("notWebsite"); } catch { $("tab-host").textContent = ""; }
  if (cur?.favIconUrl && !/^chrome/.test(cur.favIconUrl)) { $("tab-fav").src = cur.favIconUrl; $("tab-fav").hidden = false; $("tab-fav-fallback").setAttribute("hidden", ""); }
  const saveBtn = $("btn-save"); saveBtn.hidden = false; saveBtn.disabled = !ok; saveBtn.classList.remove("is-busy"); saveBtn.textContent = t("save");
  $("btn-open").hidden = true;
  $("tab-note").hidden = !ok;
  if (!ok) { note($("tab-msg"), t("onlyHttp"), null); return; }
  note($("tab-msg"), "");
  showShot(await capture());
  try {
    const r = await api(`/items/lookup?url=${encodeURIComponent(url)}`);
    if (r.exists) already(r.item);
  } catch (e) { note($("tab-msg"), e.message, "error"); }
}

function already(item) {
  note($("tab-msg"), item?.addedBy ? t("alreadySavedBy", [ws(), item.addedBy]) : t("alreadySaved", [ws()]), "ok");
  $("btn-save").hidden = true;
  $("tab-note").hidden = true;
  showOpen(item);
}

// "View on criterio.design": the item itself when we know it, the library otherwise
function showOpen(item) {
  const open = $("btn-open"); open.href = state.base + (item?.id ? `/i/${item.id}` : "/"); open.hidden = false;
}

// The shot is taken when the popup opens (activeTab allows it) and reused when saving
let shot;
function showShot(dataUrl) {
  shot = dataUrl;
  const img = $("shot-img");
  if (dataUrl) { img.src = dataUrl; img.hidden = false; $("shot").hidden = false; }
}

async function capture() {
  try { return await chrome.tabs.captureVisibleTab(undefined, { format: "jpeg", quality: 72 }); }
  catch { return undefined; } // protected pages: saved without a screenshot
}

async function save() {
  if (!tab?.url) return;
  const btn = $("btn-save");
  btn.disabled = true; btn.classList.add("is-busy"); btn.textContent = t("saving");
  note($("tab-msg"), "");
  try {
    const screenshot = shot || (await capture());
    // "why": not "note", which is the helper that paints the messages below
    const why = $("tab-note").value.trim();
    const r = await api("/items", { method: "POST", body: JSON.stringify({ url: tab.url, title: tab.title, screenshot, note: why }) });
    if (r.existed) { already(r.item); return; }
    note($("tab-msg"), t("savedIn", [ws()]), "ok");
    btn.hidden = true;
    $("tab-note").hidden = true;
    showOpen(r.item);
  } catch (e) {
    note($("tab-msg"), e.message, "error");
    btn.disabled = false; btn.classList.remove("is-busy"); btn.textContent = t("save");
  }
}

async function disconnect(tellServer = true) {
  if (tellServer && state.key) { try { await api("/me", { method: "DELETE" }); } catch { /* already revoked or offline */ } }
  await chrome.storage.local.remove(["key", "workspace", "workspaces", "user", "connectedAt"]);
  state.key = null; state.workspace = null; state.workspaces = []; state.user = null;
  $("foot").hidden = true; setChip();
  const btn = $("btn-save"); btn.hidden = false; btn.disabled = false; btn.classList.remove("is-busy"); btn.textContent = t("save");
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

// If the key arrives while the popup is open (connect tab), it refreshes itself
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

load().catch((e) => { setView("connect"); note($("connect-msg"), e.message, "error"); });
