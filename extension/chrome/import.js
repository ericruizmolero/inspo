// The import page, opened in a tab from the popup: brings in the browser's bookmarks (chosen by
// folder) or the bookmarks saved on X. Addresses go to the server in batches
// (POST /api/ext/v1/items/batch); naming, thumbnails and tags happen there, as when a URL is pasted.
// A tab rather than the popup because the popup closes as soon as it loses focus.

const DEFAULT_BASE = "https://criterio.design";
const API = "/api/ext/v1";
const BATCH = 25; // what the server accepts per request
const MAX_IMPORT = 1000; // per run; the rest waits for another
const X_BOOKMARKS = "https://x.com/i/bookmarks";

const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const $ = (id) => document.getElementById(id);
const app = $("app");
const setView = (v) => { app.dataset.view = v; };
const note = (el, text, kind) => { el.textContent = text || ""; el.className = "hint" + (kind ? ` is-${kind}` : ""); };
const ws = () => state.workspace?.name || t("yourLibrary");

let state = { key: null, base: DEFAULT_BASE, workspace: null, workspaces: [], user: null };

const api = async (path, init = {}) => {
  const res = await fetch(state.base + API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${state.key}`, "Content-Type": "application/json",
      ...(state.workspace?.id ? { "X-Workspace": state.workspace.id } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { await chrome.storage.local.remove(["key"]); setView("connect"); throw new Error(data.error || t("keyInvalid")); }
  if (!res.ok) throw new Error(data.error || t("errorStatus", [String(res.status)]));
  return data;
};

async function load() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  const s = await chrome.storage.local.get(["key", "base", "workspace", "workspaces", "user"]);
  state = { key: s.key || null, base: s.base || DEFAULT_BASE, workspace: s.workspace || null, workspaces: s.workspaces || [], user: s.user || null };
  if (!state.key) { setView("connect"); return; }
  setChip(); showFoot();
  $("import-lead").textContent = t("importLead", [ws()]);
  setView("import");
  await loadTree();
  // Opened from one of the popup's buttons: that source comes into view, its button focused
  const source = new URLSearchParams(location.search).get("source");
  const btn = source === "x" ? $("btn-x") : source === "browser" ? $("btn-browser") : null;
  if (btn) { $(`src-${source}`).scrollIntoView({ block: "start" }); if (!btn.disabled) btn.focus(); }
  api("/me").then((me) => {
    state.workspace = me.workspace; state.workspaces = me.workspaces || []; state.user = me.user;
    chrome.storage.local.set({ workspace: me.workspace, workspaces: state.workspaces, user: me.user });
    setChip(); showFoot(); $("import-lead").textContent = t("importLead", [ws()]);
  }).catch((e) => note($("browser-msg"), e.message, "error"));
}

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
  $("import-lead").textContent = t("importLead", [ws()]);
});

function showFoot() { $("foot").hidden = false; $("who").textContent = state.user?.email || state.workspace?.name || ""; }

$("btn-connect").addEventListener("click", async () => {
  await chrome.tabs.create({ url: `${state.base || DEFAULT_BASE}/extension/connect` });
});

// ─── The browser's bookmarks ─────────────────────────────────────────────────
// Folders as nested checkboxes; a folder's count is every web page under it, subfolders included.

const isWeb = (url) => /^https?:\/\//.test(url || "");
// The day a bookmark was saved, as the item's date: an old bookmark lands on its day, not on today's
const dayOf = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : undefined);
const folders = new Map(); // id → { node, urls: [{url,title}] (whole subtree) }

function collect(node) {
  const urls = [];
  for (const c of node.children || []) {
    if (c.url) { if (isWeb(c.url)) urls.push({ url: c.url, title: c.title, date: dayOf(c.dateAdded) }); }
    else urls.push(...collect(c));
  }
  folders.set(node.id, { node, urls });
  return urls;
}

function renderFolder(node) {
  const li = document.createElement("li");
  const { urls } = folders.get(node.id);
  if (!urls.length) li.className = "is-empty";
  const label = document.createElement("label");
  const cb = document.createElement("input"); cb.type = "checkbox"; cb.dataset.id = node.id; cb.disabled = !urls.length;
  const name = document.createElement("span"); name.className = "name"; name.textContent = node.title || t("bookmarksRoot");
  const count = document.createElement("span"); count.className = "count"; count.textContent = String(urls.length);
  label.append(cb, name, count);
  li.append(label);
  const subs = (node.children || []).filter((c) => !c.url);
  if (subs.length) { const ul = document.createElement("ul"); for (const s of subs) ul.append(renderFolder(s)); li.append(ul); }
  // Ticking a folder ticks what hangs from it; a subfolder on its own is fine too
  cb.addEventListener("change", () => { for (const sub of li.querySelectorAll("input")) sub.checked = cb.checked; updateSelected(); });
  return li;
}

async function loadTree() {
  const tree = $("tree");
  tree.replaceChildren();
  let roots;
  try { [{ children: roots = [] }] = await chrome.bookmarks.getTree(); } catch (e) { note($("browser-msg"), e.message, "error"); return; }
  const ul = document.createElement("ul");
  for (const r of roots) { collect(r); ul.append(renderFolder(r)); }
  tree.append(ul);
  const total = roots.reduce((n, r) => n + folders.get(r.id).urls.length, 0);
  if (!total) note($("browser-msg"), t("browserEmpty"));
  updateSelected();
}

/** Web pages under the ticked folders, each address once */
function selectedBookmarks() {
  const out = new Map();
  for (const cb of $("tree").querySelectorAll("input:checked")) {
    for (const b of folders.get(cb.dataset.id)?.urls || []) if (!out.has(b.url)) out.set(b.url, b);
  }
  return [...out.values()];
}

function updateSelected() {
  const n = selectedBookmarks().length;
  $("selected-count").textContent = n ? t("selectedCount", [String(n)]) : "";
  $("btn-browser").disabled = n === 0;
}

$("btn-browser").addEventListener("click", async () => {
  let items = selectedBookmarks();
  if (!items.length) return;
  let capNote = "";
  if (items.length > MAX_IMPORT) { capNote = t("tooMany", [String(MAX_IMPORT)]); items = items.slice(0, MAX_IMPORT); }
  const run = startRun("browser", t("progressBrowser"));
  if (capNote) note($("progress-msg"), capNote);
  run.add(items);
  run.noMore();
});

// ─── X ───────────────────────────────────────────────────────────────────────
// Asks for x.com (optional permission), opens the bookmarks page in a tab and injects the collector
// (x-collect.js). The collector reports posts as it scrolls; this page saves them as they arrive.

let xTabId = null;

$("btn-x").addEventListener("click", async () => {
  note($("x-msg"), "");
  let granted = false;
  try { granted = await chrome.permissions.request({ origins: ["https://x.com/*"] }); } catch (e) { note($("x-msg"), e.message, "error"); return; }
  if (!granted) { note($("x-msg"), t("xPermissionDenied"), "error"); return; }
  const run = startRun("x", t("progressX"));
  const tab = await chrome.tabs.create({ url: X_BOOKMARKS, active: true });
  xTabId = tab.id;
  run.tabId = tab.id;
  // Inject once the page has loaded (X is an app: it renders after "complete", the collector waits for it)
  const onUpdated = async (id, info) => {
    if (id !== tab.id || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(onUpdated);
    try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["x-collect.js"] }); }
    catch (e) { run.finish(t("xInjectFailed", [e.message])); }
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!current || current.source !== "x" || sender.tab?.id !== xTabId) return false;
  if (msg?.type === "x-found") {
    current.add(msg.items);
    sendResponse({ stop: current.stopped });
  } else if (msg?.type === "x-done") {
    if (msg.reason === "logged-out") current.finish(t("xNotLoggedIn"), "error");
    else current.noMore();
  }
  return false;
});

chrome.tabs.onRemoved.addListener((id) => {
  if (id === xTabId && current && !current.ended) { note($("progress-msg"), t("xTabClosed")); current.noMore(); }
});

// ─── A run: the queue, the batches and the counts ────────────────────────────

let current = null;

function startRun(source, title) {
  const run = {
    source, tabId: null, queue: [], seen: new Set(), sending: false, more: true, stopped: false, ended: false,
    counts: { found: 0, added: 0, existed: 0, invalid: 0, error: 0 },
    add(items) {
      if (this.ended) return;
      for (const it of items) { if (this.seen.has(it.url)) continue; this.seen.add(it.url); this.queue.push(it); this.counts.found++; }
      paint(this); this.pump();
    },
    noMore() { this.more = false; this.pump(); },
    async pump() {
      if (this.sending || this.ended) return;
      if (!this.queue.length) { if (!this.more) this.finish(); return; }
      this.sending = true;
      const batch = this.queue.splice(0, BATCH);
      try {
        const r = await api("/items/batch", { method: "POST", body: JSON.stringify({ items: batch, source: this.source }) });
        for (const res of r.results || []) this.counts[res.status in this.counts ? res.status : "error"]++;
      } catch (e) {
        this.counts.error += batch.length;
        note($("progress-msg"), e.message, "error");
      }
      this.sending = false;
      paint(this);
      this.pump();
    },
    stop() {
      this.stopped = true; this.more = false; this.queue.length = 0;
      if (this.tabId != null) chrome.tabs.sendMessage(this.tabId, { type: "x-stop" }).catch(() => {});
      if (!this.sending) this.finish();
    },
    finish(message, kind) {
      if (this.ended) return;
      this.ended = true;
      $("progress-title").textContent = t("doneTitle");
      if (this.tabId != null) chrome.tabs.sendMessage(this.tabId, { type: "x-stop" }).catch(() => {});
      paint(this, true);
      if (message) note($("progress-msg"), message, kind);
      else if (this.counts.added) note($("progress-msg"), t("doneSaved", [String(this.counts.added), ws()]), "ok");
      else if (this.counts.found) note($("progress-msg"), t("nothingNew", [ws()]), "ok");
      else note($("progress-msg"), t("nothingFound"));
      $("btn-stop").hidden = true;
      $("btn-open").href = state.base + "/"; $("btn-open").hidden = false;
      $("btn-again").hidden = false;
    },
  };
  current = run;
  $("progress-title").textContent = title;
  note($("progress-msg"), "");
  $("btn-stop").hidden = false; $("btn-open").hidden = true; $("btn-again").hidden = true;
  $("bar").classList.toggle("is-indeterminate", source === "x");
  paint(run);
  setView("progress");
  return run;
}

function paint(run, done = false) {
  for (const k of Object.keys(run.counts)) $(`c-${k}`).textContent = String(run.counts[k]);
  const handled = run.counts.added + run.counts.existed + run.counts.invalid + run.counts.error;
  if (run.source !== "x" || done) {
    $("bar").classList.remove("is-indeterminate");
    $("bar-fill").style.width = run.counts.found ? `${Math.round((handled / run.counts.found) * 100)}%` : "0%";
  }
}

$("btn-stop").addEventListener("click", () => current?.stop());
$("btn-again").addEventListener("click", () => { current = null; xTabId = null; note($("x-msg"), ""); setView("import"); loadTree(); });

chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

load().catch((e) => { setView("connect"); note($("browser-msg"), e.message, "error"); });
