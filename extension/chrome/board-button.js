// "Import to Criterio" on a board of Are.na, Pinterest or Cosmos. Registered by background.js only
// for a platform the person granted, with boards.js before it. One pill in the bottom right corner,
// in a closed shadow root so the page's styles and scripts don't reach it, shown only while the
// address is a board (these sites change pages without loading, so the address is watched). The
// click asks the service worker to open the import page on this board.
(() => {
  if (window.__criterioButton) return;
  window.__criterioButton = true;
  const { BOARDS, boardOf } = globalThis.CriterioBoards;
  const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

  // The font has to live in the document for the shadow root to use it; a name of our own, so the page's stays theirs
  try {
    const satoshi = new FontFace("criterio-satoshi", `url(${chrome.runtime.getURL("fonts/Satoshi-Variable.woff2")})`, { weight: "300 900" });
    document.fonts.add(satoshi);
    satoshi.load().catch(() => {}); // a page that refuses it, or a build without the file, gets the system font
  } catch { /* no FontFace */ }

  const host = document.createElement("criterio-import");
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      :host {
        all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
        /* Tokens from popup.css (app/globals.css): a page of someone else's can't lend them */
        --paper: #EDE6D6; --paper-light: #F6F1E6; --paper-pressed: #D9CFBA; --ink: #1B1B18; --ember: #E8892B;
        --bevel: inset 2px 2px 0 rgba(255,255,255,0.65), inset -2px -3px 0 rgba(27,27,24,0.22);
        --bevel-pressed: inset 2px 3px 0 rgba(27,27,24,0.22);
        --lift: 0 8px 24px -10px rgba(0,0,0,0.45);
        --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
        --font-sans: "criterio-satoshi", "Satoshi", ui-sans-serif, system-ui, -apple-system, sans-serif;
        --fs-small: 13px; --fw-medium: 500;
      }
      button {
        display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px 0 8px; margin: 0;
        font: var(--fw-medium) var(--fs-small)/1 var(--font-sans);
        letter-spacing: 0; color: var(--ink); background: var(--paper); cursor: pointer;
        border: 1.5px solid var(--ink); border-radius: 999px;
        box-shadow: var(--bevel), var(--lift);
        animation: in 220ms var(--ease-out) both;
        transition: background-color 120ms var(--ease-out);
      }
      button:hover { background: var(--paper-light); }
      button:active { background: var(--paper-pressed); transform: translateY(1px); box-shadow: var(--bevel-pressed), var(--lift); }
      button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
      img { width: 22px; height: 22px; display: block; pointer-events: none; }
      @keyframes in { from { opacity: 0; transform: translateY(6px); } }
      @media (prefers-reduced-motion: reduce) {
        button { animation-name: fade; transition: none; }
        button:active { transform: none; }
        @keyframes fade { from { opacity: 0; } }
      }
    </style>
    <button type="button"><img alt="" draggable="false"><span></span></button>`;
  const button = root.querySelector("button");
  root.querySelector("img").src = chrome.runtime.getURL("icons/icon48.png");
  root.querySelector("span").textContent = t("pageButton");

  let board = null;
  button.addEventListener("click", () => {
    if (!board) return;
    try { chrome.runtime.sendMessage({ type: "import-board", url: board.url }); }
    catch { host.remove(); } // the extension was reloaded or removed: this button can do nothing now
  });

  let last = "";
  const check = () => {
    if (location.href === last) return;
    last = location.href;
    board = boardOf(location.href);
    if (!board) { host.remove(); return; }
    button.setAttribute("aria-label", t("pageButtonLabel", [BOARDS[board.source].name]));
    if (!host.isConnected) document.documentElement.append(host);
  };
  check();
  // Pushed addresses don't fire anything a content script can hear: a cheap look twice a second
  setInterval(check, 500);
  addEventListener("popstate", check);
})();
