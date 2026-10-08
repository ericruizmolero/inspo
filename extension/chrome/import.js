// The import page, opened in a tab from the popup or from the button on a board: brings in the
// browser's bookmarks (chosen by folder), the bookmarks saved on X or a board on Are.na, Pinterest
// or Cosmos. Addresses go to the server in batches (POST /api/ext/v1/items/batch); naming,
// thumbnails and tags happen there, as when a URL is pasted. A tab rather than the popup because
// the popup closes as soon as it loses focus.

const DEFAULT_BASE = "https://criterio.design";
const API = "/api/ext/v1";
const BATCH = 25; // what the server accepts per request
const BATCH_IMAGES = 10; // a batch with images: the server copies each one before it answers
const MAX_IMPORT = 1000; // per run; the rest waits for another
const X_BOOKMARKS = "https://x.com/i/bookmarks";
const { BOARDS, boardOf, hostsOf } = globalThis.CriterioBoards;

const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const $ = (id) => document.getElementById(id);
const app = $("app");
const setView = (v) => { app.dataset.view = v; };
const note = (el, text, kind) => { el.textContent = text || ""; el.className = "hint" + (kind ? ` is-${kind}` : ""); };
const ws = () => state.workspace?.name || t("yourLibrary");
/** The project picked for this import ({ id, name }), or null: the server then picks the one last worked in */
const project = () => { const o = $("dest").hidden ? null : $("project-select").selectedOptions[0]; return o?.value ? { id: o.value, name: o.textContent } : null; };

let state = { key: null, base: DEFAULT_BASE, workspace: null, workspaces: [], user: null };
/** The workspace's projects as GET /projects listed them: a board imported again lands in its project again */
let projects = [];

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
  await opened(new URLSearchParams(location.search));
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
    projects = r.projects;
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

// ─── Where a run comes from ──────────────────────────────────────────────────
// One entry per source. X and the boards read in a tab of their own through a collector; a board's
// collector speaks board-found / board-done (board-collect.js), and its tab is closed at the end.

const SOURCES = {
  browser: { title: () => t("progressBrowser"), counted: true },
  x: { title: () => t("progressX"), stop: "x-stop", tabClosed: () => t("xTabClosed") },
  ...Object.fromEntries(Object.entries(BOARDS).map(([key, b]) => [key, {
    board: b,
    title: () => t("progressBoard", [b.name]),
    stop: "board-stop",
    tabClosed: () => t("boardTabClosed", [b.name]),
  }])),
};

let collectTabId = null; // the tab a collector runs in

/** Opens `url` in a tab, injects `files` once it has loaded and hands the tab to the run */
async function collectIn(run, url, files, active, onFail) {
  const tab = await chrome.tabs.create({ url, active });
  collectTabId = tab.id;
  run.tabId = tab.id;
  // Inject once the page has loaded (X is an app: it renders after "complete", the collector waits for it)
  const onUpdated = async (id, info) => {
    if (id !== tab.id || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(onUpdated);
    try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files }); }
    catch (e) { onFail(e); }
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
}

// ─── X ───────────────────────────────────────────────────────────────────────
// Asks for x.com (optional permission), opens the bookmarks page in a tab and injects the collector
// (x-collect.js). The collector reports posts as it scrolls; this page saves them as they arrive.

$("btn-x").addEventListener("click", async () => {
  note($("x-msg"), "");
  let granted = false;
  try { granted = await chrome.permissions.request({ origins: ["https://x.com/*"] }); } catch (e) { note($("x-msg"), e.message, "error"); return; }
  if (!granted) { note($("x-msg"), t("xPermissionDenied"), "error"); return; }
  const run = startRun("x");
  await collectIn(run, X_BOOKMARKS, ["x-collect.js"], true, (e) => run.finish(t("xInjectFailed", [e.message])));
});

// ─── A board on Are.na, Pinterest or Cosmos ──────────────────────────────────
// Asks for the platform's hosts (optional permissions; with them its board pages also get the
// import button, see background.js), opens the board in a tab behind this one and injects its
// collector. Everything lands in a project named after the board.

/** Starts importing the board at `raw`; false (and says why) when it can't */
async function importBoard(raw, { ask = true } = {}) {
  note($("board-msg"), "");
  const found = boardOf(raw);
  if (!found) { note($("board-msg"), t("boardBadUrl"), "error"); return false; }
  const { name, collector } = BOARDS[found.source];
  const origins = hostsOf(found.source);
  let granted = await chrome.permissions.contains({ origins });
  if (!granted && ask) {
    try { granted = await chrome.permissions.request({ origins }); } catch (e) { note($("board-msg"), e.message, "error"); return false; }
  }
  if (!granted) { note($("board-msg"), t("boardPermissionDenied", [name]), "error"); return false; }
  const run = startRun(found.source);
  run.boardUrl = found.url;
  await collectIn(run, found.url, ["boards.js", "board-collect.js", collector], false, (e) => { closeCollector(run); run.finish(t("boardInjectFailed", [name, e.message]), "error"); });
  return true;
}

$("btn-board").addEventListener("click", () => importBoard($("board-url").value));
$("board-url").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btn-board").click(); });

/** The project named after the board: the one already there from an earlier import, or a new one */
async function boardProject(name) {
  const r = await api("/projects");
  const had = r.projects.find((p) => p.name === name);
  if (had) return had;
  const made = await api("/projects", { method: "POST", body: JSON.stringify({ name }) });
  return made.project;
}

/** Opened with ?source= (the popup's buttons, the button on a board): that source comes into view.
 *  With a board's address and its platform already granted, the import starts on its own. */
async function opened(params) {
  const source = params.get("source");
  if (!source) return;
  const url = params.get("url") || "";
  if (BOARDS[source]) {
    $("board-url").value = boardOf(url)?.url || "";
    // Once: reloading this page must not import the board again
    history.replaceState(null, "", location.pathname);
    if ($("board-url").value && await importBoard(url, { ask: false })) return;
    note($("board-msg"), "");
  }
  const section = $(`src-${BOARDS[source] ? "board" : source}`);
  if (!section) return;
  section.scrollIntoView({ block: "start" });
  const btn = section.querySelector(".btn");
  if (BOARDS[source] && !$("board-url").value) $("board-url").focus(); else if (btn && !btn.disabled) btn.focus();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!current || sender.tab?.id !== collectTabId) return false;
  const src = SOURCES[current.source];
  if (current.source === "x" && msg?.type === "x-found") {
    current.add(msg.items);
    sendResponse({ stop: current.stopped });
  } else if (current.source === "x" && msg?.type === "x-done") {
    if (msg.reason === "logged-out") current.finish(t("xNotLoggedIn"), "error");
    else current.noMore();
  } else if (src.board && msg?.type === "board-found") {
    if (msg.name !== undefined) current.named(msg.name);
    if (msg.total) current.total = Math.min(msg.total, MAX_IMPORT);
    current.skip(msg.skipped);
    current.add(msg.items);
    sendResponse({ stop: current.stopped || current.capped });
  } else if (src.board && msg?.type === "board-done") {
    const name = src.board.name;
    closeCollector(current);
    if (msg.reason === "partial") current.partial = true; // some pages came, then the platform stopped answering
    if (msg.reason === "not-a-board") current.finish(t("boardBadUrl"), "error");
    else if (msg.reason === "not-found") current.finish(t("boardNotFound", [name]), "error");
    else if (msg.reason === "error") current.finish(t("boardFailed", [name]), "error");
    else current.noMore();
  }
  return false;
});

chrome.tabs.onRemoved.addListener((id) => {
  if (id === collectTabId && current && !current.ended) { note($("progress-msg"), SOURCES[current.source].tabClosed()); current.noMore(); }
});

/** A board's tab is this page's own doing: it goes when the collector is done */
function closeCollector(run) {
  if (!SOURCES[run.source].board || run.tabId == null) return;
  const id = run.tabId;
  run.tabId = null;
  if (collectTabId === id) collectTabId = null; // not "the tab was closed": we closed it
  chrome.tabs.remove(id).catch(() => {});
}

// ─── A run: the queue, the batches and the counts ────────────────────────────

let current = null;

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com)$/i; // as lib/url.ts
/** What an item becomes once saved: its words, its image, a video by address, or a website */
const kindOf = (it) => { if (it.text) return "text"; if (it.image) return "image"; try { return VIDEO_HOSTS.test(new URL(it.url).hostname) ? "video" : "website"; } catch { return "website"; } };

function startRun(source) {
  const src = SOURCES[source];
  const run = {
    source, project: src.board ? null : project(), tabId: null, total: 0, queue: [], seen: new Set(), sending: false, more: true, stopped: false, capped: false, partial: false, ended: false,
    // A board waits for its project before the first batch
    ready: !src.board, naming: false, boardUrl: "",
    counts: { found: 0, added: 0, existed: 0, invalid: 0, error: 0 },
    kinds: { website: 0, image: 0, video: 0, text: 0 },
    reasons: {},
    add(items) {
      if (this.ended) return;
      for (const it of items) {
        if (this.seen.has(it.url)) continue;
        // A board of thousands: this run takes the first ones, the collector is told to stop
        if (src.board && this.counts.found >= MAX_IMPORT) { this.capped = true; note($("progress-msg"), t("tooMany", [String(MAX_IMPORT)])); break; }
        this.seen.add(it.url); this.queue.push(it); this.counts.found++;
      }
      paint(this); this.pump();
    },
    /** What the collector could not bring, by reason: counted as skipped */
    skip(skipped) {
      for (const [why, n] of Object.entries(skipped || {})) {
        if (!(n > 0)) continue;
        this.reasons[why] = (this.reasons[why] || 0) + n;
        this.counts.invalid += n;
      }
    },
    /** The board's name, once: the project it lands in */
    async named(name) {
      if (this.naming || this.ready) return;
      this.naming = true;
      try { this.project = await boardProject(name || this.boardUrl); }
      catch { this.project = project(); } // still imported, into the picked project
      this.ready = true;
      this.pump();
    },
    // A board that never said its name (it failed first) has nothing waiting for a project
    noMore() { this.more = false; if (!this.naming) this.ready = true; this.pump(); },
    async pump() {
      if (this.sending || this.ended || !this.ready) return;
      if (!this.queue.length) { if (!this.more) this.finish(); return; }
      this.sending = true;
      const size = this.queue.slice(0, BATCH).some((it) => it.image) ? BATCH_IMAGES : BATCH;
      const batch = this.queue.splice(0, size);
      try {
        const r = await api("/items/batch", { method: "POST", body: JSON.stringify({ items: batch, source: this.source, projectId: this.project?.id }) });
        (r.results || []).forEach((res, i) => {
          const status = res.status in this.counts ? res.status : "error";
          this.counts[status]++;
          if (status === "added") this.kinds[kindOf(batch[i])]++;
          if (status === "invalid") this.reasons.invalid = (this.reasons.invalid || 0) + 1;
        });
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
      else if (this.partial) note($("progress-msg"), t("boardPartial", [src.board.name, String(this.counts.added)]));
      else if (src.board && (this.counts.added || this.counts.invalid)) note($("progress-msg"), boardResult(this), "ok");
      else if (this.counts.added) note($("progress-msg"), this.project ? t("doneSavedIn", [String(this.counts.added), this.project.name]) : t("doneSaved", [String(this.counts.added), ws()]), "ok");
      else if (this.counts.found) note($("progress-msg"), this.project ? t("nothingNewIn", [ws(), this.project.name]) : t("nothingNew", [ws()]), "ok");
      else note($("progress-msg"), t("nothingFound"));
      $("btn-stop").hidden = true;
      // The project it went to when there is one; the app's own landing otherwise
      $("btn-open").href = state.base + (this.project ? `/?in=${encodeURIComponent(this.project.id)}` : "/");
      $("btn-open").textContent = t(this.project ? "openProject" : "openLibrary"); $("btn-open").hidden = false;
      $("btn-again").hidden = false;
    },
  };
  current = run;
  $("progress-title").textContent = src.title();
  note($("progress-msg"), "");
  $("btn-stop").hidden = false; $("btn-open").hidden = true; $("btn-again").hidden = true;
  $("bar").classList.toggle("is-indeterminate", !src.counted);
  $("bar-fill").style.width = ""; // whatever the last run left
  paint(run);
  setView("progress");
  return run;
}

/** "38 websites, 12 images and 2 texts imported. 3 skipped (file)." */
function boardResult(run) {
  const list = (parts) => (parts.length > 1 ? t("listAnd", [parts.slice(0, -1).join(", "), parts.at(-1)]) : parts[0] || "");
  const count = (key, n) => t(n === 1 ? `${key}One` : `${key}Many`, [String(n)]);
  const kinds = Object.entries(run.kinds).filter(([, n]) => n).map(([k, n]) => count(`kind_${k}`, n));
  const lines = [];
  if (kinds.length) lines.push(t("resultImported", [list(kinds)]));
  if (run.counts.existed) lines.push(t("resultAlready", [String(run.counts.existed)]));
  const reasons = Object.entries(run.reasons).filter(([, n]) => n);
  const why = (k, n) => t(`reason_${k}${n === 1 ? "One" : "Many"}`);
  if (reasons.length === 1) lines.push(t("resultSkippedOne", [String(reasons[0][1]), why(...reasons[0])]));
  else if (reasons.length > 1) lines.push(t("resultSkippedMany", [String(run.counts.invalid), reasons.map(([k, n]) => `${n} ${why(k, n)}`).join(", ")]));
  return lines.join(" ");
}

/** Tells the collector's tab to stop; a tab this page opened for a board is closed too */
function stopCollector(run) {
  if (run.tabId == null) return;
  const { stop } = SOURCES[run.source];
  if (stop) chrome.tabs.sendMessage(run.tabId, { type: stop }).catch(() => {});
  closeCollector(run);
}

function paint(run, done = false) {
  for (const k of Object.keys(run.counts)) $(`c-${k}`).textContent = String(run.counts[k]);
  const sent = run.counts.added + run.counts.existed + run.counts.error + (run.reasons.invalid || 0);
  const src = SOURCES[run.source];
  // How far along: of what was found, or of what the board says it holds while it is still being read.
  // X never says how many there are: its bar only fills at the end.
  const of = done || src.counted ? run.counts.found : src.board ? Math.max(run.total - (run.counts.invalid - (run.reasons.invalid || 0)), run.counts.found) : 0;
  if (of || done) {
    $("bar").classList.remove("is-indeterminate");
    $("bar-fill").style.width = of ? `${Math.min(100, Math.round((sent / of) * 100))}%` : done ? "100%" : "0%";
  }
}

$("btn-stop").addEventListener("click", () => current?.stop());
$("btn-again").addEventListener("click", () => { current = null; collectTabId = null; note($("x-msg"), ""); note($("board-msg"), ""); setView("import"); loadProjects(); loadTree(); });

chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.key) load(); });

load().catch((e) => { setView("connect"); note($("browser-msg"), e.message, "error"); });
