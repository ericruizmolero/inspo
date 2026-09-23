// The extension's service worker. It only acts as a mailbox: it gets the key from content.js
// (which picks it up at criterio.design/extension/connect) and stores it in chrome.storage.local.
// Everything else (API calls) the popup does directly.

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
