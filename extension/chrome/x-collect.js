// Runs inside x.com/i/bookmarks, injected by the import page (import.js) with chrome.scripting
// after the person grants x.com. It scrolls through the bookmarks and reports each post's
// address to the extension; nothing else on the page is read. It stops when the end is
// reached, when the import page says so, or when that page is gone.
(() => {
  if (window.__criterioCollector) return; // already running in this tab
  const TICK_MS = 800;
  const IDLE_TICKS = 14; // ~11 s without anything new = the end of the list
  const seen = new Set();
  let stopped = false, idle = 0, timer = 0, waited = 0;
  const WAIT_TICKS = 40; // up to ~32 s for X to draw the list (or the login page) at all

  const badge = document.createElement("div");
  badge.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:2147483647;padding:8px 12px;border-radius:10px;background:#0e0e0d;color:#f2f2ef;font:500 13px/1.4 Inter,system-ui,sans-serif;box-shadow:0 8px 24px -8px rgba(0,0,0,.5);pointer-events:none";
  const show = (text) => { badge.textContent = text; if (!badge.isConnected) document.body.appendChild(badge); };

  const finish = (reason) => {
    if (stopped) return;
    stopped = true; clearInterval(timer);
    badge.remove();
    try { chrome.runtime.sendMessage({ type: "x-done", reason, found: seen.size }, () => void chrome.runtime.lastError); } catch { /* page gone */ }
  };

  const send = (msg) => new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        // No listener: the import page was closed, so nobody is saving what we find
        if (chrome.runtime.lastError || res?.stop) finish("stopped");
        resolve();
      });
    } catch { finish("stopped"); resolve(); }
  });

  // Each post's own link is the one with its time inside; quoted posts have no such link
  const harvest = () => {
    const fresh = [];
    for (const a of document.querySelectorAll('article[data-testid="tweet"] a[href*="/status/"]')) {
      if (!a.querySelector("time")) continue;
      const m = (a.getAttribute("href") || "").match(/^\/(\w{1,15})\/status\/(\d{1,25})/);
      if (!m) continue;
      const url = `https://x.com/${m[1]}/status/${m[2]}`;
      if (seen.has(url)) continue;
      seen.add(url); fresh.push(url);
    }
    return fresh;
  };

  const loggedOut = () => /\/(login|i\/flow\/login)/.test(location.pathname);
  const retry = () => {
    // "Something went wrong. Try reloading." shows a Retry button when X rate-limits the list
    const btn = [...document.querySelectorAll('[role="button"]')].find((b) => /^(retry|reintentar)$/i.test(b.textContent.trim()));
    if (btn) btn.click();
  };

  chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === "x-stop") finish("stopped"); });

  timer = setInterval(async () => {
    if (stopped) return;
    if (loggedOut()) { finish("logged-out"); return; }
    // Nothing drawn yet: X is still loading, so this doesn't count as the end of the list
    if (!seen.size && !document.querySelector('article[data-testid="tweet"]') && waited++ < WAIT_TICKS) { show("criterio.design …"); return; }
    const fresh = harvest();
    if (fresh.length) { idle = 0; await send({ type: "x-found", urls: fresh, found: seen.size }); }
    else { idle++; retry(); }
    show(`criterio.design · ${seen.size}`);
    if (idle >= IDLE_TICKS) { finish("end"); return; }
    // To the bottom; every few idle ticks a step back up, which wakes the list when it stalls
    if (idle && idle % 4 === 0) window.scrollBy(0, -800);
    else window.scrollTo(0, document.documentElement.scrollHeight);
  }, TICK_MS);

  window.__criterioCollector = { stop: () => finish("stopped") };
})();
