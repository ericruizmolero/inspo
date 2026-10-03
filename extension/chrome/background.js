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
