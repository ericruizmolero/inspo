// Tino moving his ears in the chat, as an MCP App: a small page a client that supports the extension draws beside
// start_setup's answer. Only the ears move, and they rest under reduced motion. A client without MCP Apps ignores it and
// shows the text, with the still drawing.
import { TINO_SHAPES } from "./tino";

export const TINO_APP_URI = "ui://criterio/tino.html";
export const TINO_APP_MIME = "text/html;profile=mcp-app";
const SIZE = 72;

export function tinoApp(): string {
  const { ears, body, visor } = TINO_SHAPES;
  const ear = (e: (typeof ears)[number], i: number) => `<g class="ear" style="transform-origin:${e.x}px ${e.y + 4}px;animation-delay:${i * 60}ms"><path transform="translate(${e.x} ${e.y}) rotate(${e.rotate})" d="${e.d}"/></g>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tino</title><style>
html,body{margin:0;background:transparent}
svg{display:block;width:${SIZE}px;height:${SIZE}px;color:#1B1B18}
.visor{stroke:#F6F1E6}
@media (prefers-color-scheme:dark){svg{color:#EDE6D6}.visor{stroke:#141412}}
.ear{animation:wiggle 3.4s ease-in-out infinite}
@keyframes wiggle{0%,62%,100%{transform:rotate(0)}66%{transform:rotate(-9deg)}70%{transform:rotate(7deg)}74%{transform:rotate(-7deg)}78%{transform:rotate(6deg)}82%{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){.ear{animation:none}}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23.5 37.5 63 63" role="img" aria-label="Tino"><g fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round">${ears.map(ear).join("")}</g><path fill="currentColor" d="${body}"/><path class="visor" stroke-width="6.2" stroke-linecap="round" d="${visor}"/></svg>
<script>
(() => {
  const send = (m) => parent.postMessage({ jsonrpc: "2.0", ...m }, "*");
  const size = () => send({ method: "ui/notifications/size-changed", params: { width: ${SIZE}, height: ${SIZE} } });
  addEventListener("message", (e) => { if (e.data && e.data.id === 1 && e.data.result) { send({ method: "ui/notifications/initialized" }); size(); } });
  send({ id: 1, method: "ui/initialize", params: { protocolVersion: "2026-01-26", appInfo: { name: "Tino", version: "1.0.0" }, appCapabilities: {} } });
})();
</script></body></html>`;
}
