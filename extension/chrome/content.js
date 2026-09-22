// Corre solo en criterio.design/extension/conectar. Recoge la llave que la página emite con
// window.postMessage y se la pasa al service worker para guardarla. Después confirma a la
// página, que enseña "la extensión ya tiene la llave".
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
