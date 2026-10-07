// Runs only on criterio.design. It tells the page the extension is here (its version, and whether
// it already holds a key): the library offers the install guide to a browser without it, and the
// guide (/extension/install) follows the steps as they happen. On the guide and on
// /extension/connect it also picks up the key the page posts with window.postMessage and hands it
// to the service worker to store, then confirms to the page, which shows the extension has it.
const FROM_PAGE = "criterio";
const FROM_EXT = "criterio-ext";

const say = (type, more) => window.postMessage({ source: FROM_EXT, type, ...more }, window.location.origin);

// After the extension is reloaded or removed this script stays in the tab but can no longer
// reach it: chrome.* throws, and the page should not be told the extension is still there.
async function hello() {
  try {
    const { key } = await chrome.storage.local.get("key");
    say("ext-hello", { version: chrome.runtime.getManifest().version, connected: !!key });
  } catch { /* orphaned */ }
}

window.addEventListener("message", (e) => {
  if (e.origin !== window.location.origin || e.source !== window || e.data?.source !== FROM_PAGE) return;
  if (e.data.type === "page-hello") hello();
  if (e.data.type === "ext-key") {
    chrome.runtime.sendMessage({ type: "ext-key", key: e.data.key, base: window.location.origin, workspace: e.data.workspace }, (res) => {
      if (!chrome.runtime.lastError && res?.ok) say("ext-key-received");
    });
  }
});

hello();
