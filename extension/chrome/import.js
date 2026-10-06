// The import page, opened in a tab from the popup: brings in the browser's bookmarks (chosen by
// folder), the bookmarks saved on X or a board on Pinterest. Addresses go to the server in batches
// (POST /api/ext/v1/items/batch); naming, thumbnails and tags happen there, as when a URL is pasted.
// A tab rather than the popup because the popup closes as soon as it loses focus.

const DEFAULT_BASE = "https://criterio.design";
const API = "/api/ext/v1";
const BATCH = 25; // what the server accepts per request
const BATCH_IMAGES = 10; // pins: the server copies each image before it answers
const MAX_IMPORT = 1000; // per run; the rest waits for another
const X_BOOKMARKS = "https://x.com/i/bookmarks";
const PINTEREST = "https://*.pinterest.com/*";

const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const $ = (id) => document.getElementById(id);
const app = $("app");
const setView = (v) => { app.dataset.view = v; };
const note = (el, text, kind) => { el.textContent = text || ""; el.className = "hint" + (kind ? ` is-${kind}` : ""); };
const ws = () => state.workspace?.name || t("yourLibrary");
/** The project picked for this import ({ id, name }), or null: the server then picks the one last worked in */
const project = () => { const o = $("dest").hidden ? null : $("project-select").selectedOptions[0]; return o?.value ? { id: o.value, name: o.textContent } : null; };

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
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  const s = await chrome.storage.local.get(["key", "base", "workspace", "workspaces", "user"]);
  state = { key: s.key || null, base: s.base || DEFAULT_BASE, workspace: s.workspace || null, workspaces: s.workspaces || [], user: s.user || null };
  if (!state.key) { setView("connect"); return; }
  setChip(); showFoot();
  $("import-lead").textContent = t("importLead", [ws()]);
  setView("import");
  loadProjects();
  await loadTree();
  // Opened from one of the popup's buttons: that source comes into view, its button focused
  const params = new URLSearchParams(location.search);
  const source = params.get("source");
  const btn = source === "x" ? $("btn-x") : source === "browser" ? $("btn-browser") : source === "pinterest" ? $("btn-pin") : null;
  // From the popup on Pinterest: the board that was open is already written in
  if (source === "pinterest" && !$("pin-url").value) $("pin-url").value = boardUrl(params.get("url") || "") || "";
  if (btn) { $(`src-${source}`).scrollIntoView({ block: "start" }); if (source === "pinterest" && !$("pin-url").value) $("pin-url").focus(); else if (!btn.disabled) btn.focus(); }
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
  loadProjects(); // each workspace has its own projects
});

// The project it all lands in: the workspace's projects, the one this person last added to picked first
async function loadProjects() {
  try {
    const r = await api("/projects");
    const sel = $("project-select");
    sel.replaceChildren(...r.projects.map((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; return o; }));
    if (r.active) sel.value = r.active;
    $("dest").hidden = r.projects.length === 0;
  } catch { $("dest").hidden = true; } // it still imports, to the project the server picks
}

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

let collectTabId = null; // the tab a collector runs in (x-collect.js, pinterest-collect.js)

$("btn-x").addEventListener("click", async () => {
  note($("x-msg"), "");
  let granted = false;
  try { granted = await chrome.permissions.request({ origins: ["https://x.com/*"] }); } catch (e) { note($("x-msg"), e.message, "error"); return; }
  if (!granted) { note($("x-msg"), t("xPermissionDenied"), "error"); return; }
  const run = startRun("x", t("progressX"));
  const tab = await chrome.tabs.create({ url: X_BOOKMARKS, active: true });
  collectTabId = tab.id;
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
  if (!current || sender.tab?.id !== collectTabId) return false;
  if (current.source === "x" && msg?.type === "x-found") {
    current.add(msg.items);
    sendResponse({ stop: current.stopped });
  } else if (current.source === "x" && msg?.type === "x-done") {
    if (msg.reason === "logged-out") current.finish(t("xNotLoggedIn"), "error");
    else current.noMore();
  } else if (current.source === "pinterest" && msg?.type === "pin-found") {
    if (msg.total) current.total = Math.min(msg.total, MAX_IMPORT);
    current.add(msg.items);
    sendResponse({ stop: current.stopped || current.capped });
  } else if (current.source === "pinterest" && msg?.type === "pin-done") {
    closeCollector(current);
    if (msg.reason === "partial") current.partial = true; // some pages came, then Pinterest stopped answering
    if (msg.reason === "not-a-board") current.finish(t("pinBadUrl"), "error");
    else if (msg.reason === "not-found") current.finish(t("pinNotFound"), "error");
    else if (msg.reason === "error") current.finish(t("pinFailed"), "error");
    else current.noMore();
  }
  return false;
});

chrome.tabs.onRemoved.addListener((id) => {
  if (id === collectTabId && current && !current.ended) { note($("progress-msg"), t(current.source === "pinterest" ? "pinTabClosed" : "xTabClosed")); current.noMore(); }
});

// ─── Pinterest ───────────────────────────────────────────────────────────────
// Asks for pinterest.com (optional permission), opens the board in a tab behind this one and injects
// the collector (pinterest-collect.js), which reads the board's pins without scrolling: this page
// saves them as they arrive and closes that tab at the end.

/** A board's address on pinterest.com, whatever Pinterest it was copied from (pinterest.es, es.pinterest.com); null if it is not one */
function boardUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`); } catch { return null; }
  if (!/(^|\.)pinterest\.[a-z]{2,3}(\.[a-z]{2})?$/.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts.length > 3 || ["pin", "search", "ideas", "today"].includes(parts[0])) return null;
  const host = u.hostname.endsWith(".pinterest.com") ? u.hostname : "www.pinterest.com";
  return `https://${host}/${parts.join("/")}/`;
}

/** The collector's tab is this page's own doing: it goes when the collector is done */
function closeCollector(run) {
  if (run.source !== "pinterest" || run.tabId == null) return;
  const id = run.tabId;
  run.tabId = null;
  if (collectTabId === id) collectTabId = null; // not "the tab was closed": we closed it
  chrome.tabs.remove(id).catch(() => {});
}

$("btn-pin").addEventListener("click", async () => {
  note($("pin-msg"), "");
  const url = boardUrl($("pin-url").value);
  if (!url) { note($("pin-msg"), t("pinBadUrl"), "error"); return; }
  let granted = false;
  try { granted = await chrome.permissions.request({ origins: [PINTEREST] }); } catch (e) { note($("pin-msg"), e.message, "error"); return; }
  if (!granted) { note($("pin-msg"), t("pinPermissionDenied"), "error"); return; }
  const run = startRun("pinterest", t("progressPinterest"));
  const tab = await chrome.tabs.create({ url, active: false });
  collectTabId = tab.id;
  run.tabId = tab.id;
  const onUpdated = async (id, info) => {
    if (id !== tab.id || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(onUpdated);
    try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["pinterest-collect.js"] }); }
    catch (e) { closeCollector(run); run.finish(t("pinInjectFailed", [e.message]), "error"); }
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
});
$("pin-url").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btn-pin").click(); });

// ─── A run: the queue, the batches and the counts ────────────────────────────

let current = null;

function startRun(source, title) {
  const run = {
    source, project: project(), tabId: null, total: 0, queue: [], seen: new Set(), sending: false, more: true, stopped: false, capped: false, partial: false, ended: false,
    counts: { found: 0, added: 0, existed: 0, invalid: 0, error: 0 },
    add(items) {
      if (this.ended) return;
      for (const it of items) {
        if (this.seen.has(it.url)) continue;
        // A board of thousands: this run takes the first ones, the collector is told to stop
        if (this.source === "pinterest" && this.counts.found >= MAX_IMPORT) { this.capped = true; note($("progress-msg"), t("tooMany", [String(MAX_IMPORT)])); break; }
        this.seen.add(it.url); this.queue.push(it); this.counts.found++;
      }
      paint(this); this.pump();
    },
    noMore() { this.more = false; this.pump(); },
    async pump() {
      if (this.sending || this.ended) return;
      if (!this.queue.length) { if (!this.more) this.finish(); return; }
      this.sending = true;
      const batch = this.queue.splice(0, this.source === "pinterest" ? BATCH_IMAGES : BATCH);
      try {
        const r = await api("/items/batch", { method: "POST", body: JSON.stringify({ items: batch, source: this.source, projectId: this.project?.id }) });
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
      stopCollector(this);
      if (!this.sending) this.finish();
    },
    finish(message, kind) {
      if (this.ended) return;
      this.ended = true;
      $("progress-title").textContent = t("doneTitle");
      stopCollector(this);
      paint(this, true);
      if (message) note($("progress-msg"), message, kind);
      else if (this.partial) note($("progress-msg"), t("pinPartial", [String(this.counts.added)]));
      else if (this.counts.added) note($("progress-msg"), this.project ? t("doneSavedIn", [String(this.counts.added), this.project.name]) : t("doneSaved", [String(this.counts.added), ws()]), "ok");
      else if (this.counts.found) note($("progress-msg"), this.project ? t("nothingNewIn", [ws(), this.project.name]) : t("nothingNew", [ws()]), "ok");
      else note($("progress-msg"), t("nothingFound"));
      $("btn-stop").hidden = true;
      // The project it went to when one was picked; the app's own landing otherwise
      $("btn-open").href = state.base + (this.project ? `/?in=${encodeURIComponent(this.project.id)}` : "/");
      $("btn-open").textContent = t(this.project ? "openProject" : "openLibrary"); $("btn-open").hidden = false;
      $("btn-again").hidden = false;
    },
  };
  current = run;
  $("progress-title").textContent = title;
  note($("progress-msg"), "");
  $("btn-stop").hidden = false; $("btn-open").hidden = true; $("btn-again").hidden = true;
  $("bar").classList.toggle("is-indeterminate", source !== "browser");
  $("bar-fill").style.width = ""; // whatever the last run left
  paint(run);
  setView("progress");
  return run;
}

/** Tells the collector's tab to stop; a tab this page opened for itself (Pinterest) is closed too */
function stopCollector(run) {
  if (run.tabId == null) return;
  chrome.tabs.sendMessage(run.tabId, { type: run.source === "pinterest" ? "pin-stop" : "x-stop" }).catch(() => {});
  closeCollector(run);
}

function paint(run, done = false) {
  for (const k of Object.keys(run.counts)) $(`c-${k}`).textContent = String(run.counts[k]);
  const handled = run.counts.added + run.counts.existed + run.counts.invalid + run.counts.error;
  // How far along: of what was found, or of what the board says it holds while it is still being read.
  // X never says how many there are: its bar only fills at the end.
  const of = done || run.source === "browser" ? run.counts.found : run.source === "pinterest" ? Math.max(run.total, run.counts.found) : 0;
  if (of || done) {
    $("bar").classList.remove("is-indeterminate");
    $("bar-fill").style.width = of ? `${Math.min(100, Math.round((handled / of) * 100))}%` : "0%";
  }
}

$("btn-stop").addEventListener("click", () => current?.stop());
$("btn-again").addEventListener("click", () => { current = null; collectTabId = null; note($("x-msg"), ""); note($("pin-msg"), ""); setView("import"); loadProjects(); loadTree(); });

chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

load().catch((e) => { setView("connect"); note($("browser-msg"), e.message, "error"); });
