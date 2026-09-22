// Service worker de la extensión. Solo hace de buzón: recibe la llave desde content.js (que
// la recoge en criterio.design/extension/conectar) y la guarda en chrome.storage.local.
// Todo lo demás (llamadas a la API) lo hace el popup directamente.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ext-key" && typeof msg.key === "string" && msg.key.startsWith("crit_")) {
    chrome.storage.local
      .set({ key: msg.key, base: msg.base, workspace: msg.workspace ?? null, connectedAt: Date.now() })
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // respuesta asíncrona
  }
  return false;
});
