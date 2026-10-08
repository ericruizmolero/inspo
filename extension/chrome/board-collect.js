// What every board collector shares. The import page injects this file and then one platform's
// collector (arena-collect.js, pinterest-collect.js, cosmos-collect.js) into a tab of the board,
// after the person grants that platform. The collector reads the board with the person's session
// and calls `found` with each page of items; this file talks to the import page:
//   { type: "board-found", name?, total?, items: [{ url, title?, image?, text? }], skipped: { [reason]: n } }
//   { type: "board-done", reason, name }
// `name` and `total` ride on the first board-found: the import page names the project before the
// first batch. It stops at the end, when the import page says so ("board-stop"), or when that page
// is gone.
(() => {
  if (window.__criterioBoard) return;
  window.__criterioBoard = (read) => {
    if (window.__criterioBoardRunning) return; // already reading this tab
    window.__criterioBoardRunning = true;
    let stopped = false;
    let name = "";

    const finish = (reason) => {
      if (stopped) return;
      stopped = true;
      try { chrome.runtime.sendMessage({ type: "board-done", reason, name }, () => void chrome.runtime.lastError); } catch { /* page gone */ }
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

    chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === "board-stop") finish("stopped"); });

    let first = true;
    const found = async ({ items = [], skipped = {}, total }) => {
      if (stopped || (!items.length && !Object.keys(skipped).length && !first)) return;
      const msg = { type: "board-found", items, skipped };
      if (first) { msg.name = name; if (total) msg.total = total; first = false; }
      await send(msg);
    };

    const ctx = {
      found,
      stopped: () => stopped,
      named: (n) => { name = String(n || "").trim().slice(0, 80); },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    };
    Promise.resolve().then(() => read(ctx)).then((reason) => finish(reason || "end"), (e) => { console.error("criterio: board", e); finish("error"); });
  };
})();
