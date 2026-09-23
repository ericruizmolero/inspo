// Runs only on criterio.design/extension/connect. Picks up the key the page posts with
// window.postMessage and hands it to the service worker to store. Then it confirms to the
// page, which shows that the extension has the key.
const FROM_PAGE = "criterio";
const FROM_EXT = "criterio-ext";

const say = (type) => window.postMessage({ source: FROM_EXT, type }, window.location.origin);

window.addEventListener("message", (e) => {
  if (e.origin !== window.location.origin || e.source !== window || e.data?.source !== FROM_PAGE) return;
  if (e.data.type === "page-hello") say("ext-hello");
  if (e.data.type === "ext-key") {
    chrome.runtime.sendMessage({ type: "ext-key", key: e.data.key, base: e.data.base || window.location.origin, workspace: e.data.workspace }, (res) => {
      if (!chrome.runtime.lastError && res?.ok) say("ext-key-received");
    });
  }
});

say("ext-hello");
