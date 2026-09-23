// The extension popup. Two views: "connect" (no key) and "tab" (save the current tab).
// All the name, collection and tag logic lives on the server: this only sends the
// address, the title and a screenshot of what's visible (see app/api/ext/v1/items/route.ts).

const DEFAULT_BASE = "https://criterio.design";
const API = "/api/ext/v1";

// Texts come from _locales/<lang>/messages.json (browser language; English if there is no translation)
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const ws = () => state.workspace?.name || t("yourLibrary");

const $ = (id) => document.getElementById(id);
const app = $("app");
const setView = (v) => { app.dataset.view = v; };
const note = (el, text, kind) => { el.textContent = text || ""; el.className = "hint" + (kind ? ` is-${kind}` : ""); };

let state = { key: null, base: DEFAULT_BASE, workspace: null, user: null };
let tab = null;

const api = async (path, init = {}) => {
  const res = await fetch(state.base + API + path, {
    ...init,
    headers: { Authorization: `Bearer ${state.key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { await disconnect(false); throw new Error(data.error || t("keyInvalid")); }
  if (!res.ok) throw new Error(data.error || t("errorStatus", [String(res.status)]));
  return data;
};

async function load() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  const s = await chrome.storage.local.get(["key", "base", "workspace", "user"]);
  state = { key: s.key || null, base: s.base || DEFAULT_BASE, workspace: s.workspace || null, user: s.user || null };
  if (!state.key) { setView("connect"); return; }
  $("ws-name").textContent = state.workspace?.name || "";
  showFoot();
  setView("tab");
  await loadTab();
  // Checks the key in the background and refreshes the workspace and person names
  api("/me").then((me) => {
    state.workspace = me.workspace; state.user = me.user;
    chrome.storage.local.set({ workspace: me.workspace, user: me.user });
    $("ws-name").textContent = me.workspace.name; showFoot();
  }).catch((e) => note($("tab-msg"), e.message, "error"));
}

function showFoot() {
  $("foot").hidden = false;
  $("who").textContent = state.user?.email || state.workspace?.name || "";
}

async function loadTab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  tab = t;
  const url = t?.url || "";
  const ok = /^https?:\/\//.test(url);
  $("tab-title").textContent = t?.title || url;
  try { $("tab-host").textContent = ok ? new URL(url).hostname.replace(/^www\./, "") : t("notWebsite"); } catch { $("tab-host").textContent = ""; }
  if (t?.favIconUrl) { $("tab-fav").src = t.favIconUrl; $("tab-fav").hidden = false; }
  $("btn-save").disabled = !ok;
  $("btn-open").hidden = true;
  if (!ok) { note($("tab-msg"), t("onlyHttp"), null); return; }
  note($("tab-msg"), "");
  try {
    const r = await api(`/items/lookup?url=${encodeURIComponent(url)}`);
    if (r.exists) already(r.item);
  } catch (e) { note($("tab-msg"), e.message, "error"); }
}

function already(item) {
  note($("tab-msg"), item?.addedBy ? t("alreadySavedBy", [ws(), item.addedBy]) : t("alreadySaved", [ws()]), "ok");
  $("btn-save").hidden = true;
  const open = $("btn-open"); open.href = state.base + "/"; open.hidden = false;
}

async function capture() {
  try { return await chrome.tabs.captureVisibleTab(undefined, { format: "jpeg", quality: 72 }); }
  catch { return undefined; } // protected pages: saved without a screenshot
}

async function save() {
  if (!tab?.url) return;
  const btn = $("btn-save");
  btn.disabled = true; btn.textContent = t("saving");
  note($("tab-msg"), "");
  try {
    const screenshot = await capture();
    const r = await api("/items", { method: "POST", body: JSON.stringify({ url: tab.url, title: tab.title, screenshot }) });
    if (r.existed) { already(r.item); return; }
    note($("tab-msg"), t("savedIn", [ws()]), "ok");
    btn.hidden = true;
    const open = $("btn-open"); open.href = state.base + "/"; open.hidden = false;
  } catch (e) {
    note($("tab-msg"), e.message, "error");
    btn.disabled = false; btn.textContent = t("save");
  }
}

async function disconnect(tellServer = true) {
  if (tellServer && state.key) { try { await api("/me", { method: "DELETE" }); } catch { /* already revoked or offline */ } }
  await chrome.storage.local.remove(["key", "workspace", "user", "connectedAt"]);
  state.key = null; state.workspace = null; state.user = null;
  $("foot").hidden = true; $("ws-name").textContent = "";
  $("btn-save").hidden = false; $("btn-save").disabled = false; $("btn-save").textContent = t("save");
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
    await chrome.storage.local.set({ key, base, workspace: me.workspace, user: me.user, connectedAt: Date.now() });
    await load();
  } catch (e) { state.key = null; note($("connect-msg"), e.message, "error"); }
});

$("btn-save").addEventListener("click", save);
$("btn-disconnect").addEventListener("click", () => disconnect(true));

// If the key arrives while the popup is open (connect tab), it refreshes itself
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

load().catch((e) => { setView("connect"); note($("connect-msg"), e.message, "error"); });
