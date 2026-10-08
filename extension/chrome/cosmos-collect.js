// Reads a cluster on Cosmos from inside it (board-collect.js talks to the import page). Cosmos has no
// public API: this asks for the cluster's elements with the query the page itself sends
// (GetClusterElements on api.cosmos.so/graphql, trimmed to the fields used here), with the person's
// session so a private cluster works. A website or a product is its site; an image or a video is its
// file (a video, its cover) with the element's page as where it came from. Text is skipped and counted.
// The query is the page's own: if Cosmos changes it, QUERY is what to fix.
window.__criterioBoard(async ({ found, stopped, named, sleep }) => {
  const GRAPHQL = "https://api.cosmos.so/graphql";
  const QUERY = "query GetClusterElements($clusterId:ClusterId$pageCursor:String$pageSize:Int){clusterConnections(clusterId:$clusterId meta:{pageSize:$pageSize pageCursor:$pageCursor}){items{element{__typename id shareUrl source{url}...on MediaElementTile{generatedCaption{text}media{...M}}...on WebsiteElementTile{websiteTitle:title}...on ProductElementTile{productTitle:name}...on TextElementTile{text}}}meta{nextPageCursor count}}}fragment M on Media{__typename url ...on Video{thumbnail{url}}}";
  const PAGE_SIZE = 50;
  const PAUSE_MS = 400;
  const MAX_PAGES = 200;

  const board = globalThis.CriterioBoards.boardOf(location.href);
  if (board?.source !== "cosmos") return "not-a-board";

  // The cluster's number is in the page the server sent, with its name beside it
  const html = document.documentElement.innerHTML;
  const id = html.match(/"clusterId":(\d+)/)?.[1];
  if (!id) return "not-found";
  let name = "";
  try { name = JSON.parse(`"${html.match(new RegExp(`"id":${id},"name":"((?:[^"\\\\]|\\\\.)*)"`))?.[1] || ""}"`); } catch { /* the title below */ }
  named(name || document.title.replace(/\s+[—-]\s+by @.*$/, ""));

  const ask = async (cursor, tries = 2) => {
    try {
      const res = await fetch(GRAPHQL, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName: "GetClusterElements", query: QUERY, variables: { clusterId: Number(id), pageSize: PAGE_SIZE, pageCursor: cursor } }),
      });
      if (res.status === 429 && tries > 1) { await sleep(5000); return ask(cursor, tries - 1); }
      const json = await res.json().catch(() => null);
      return res.ok ? json?.data?.clusterConnections ?? null : null;
    } catch {
      if (tries > 1) { await sleep(1500); return ask(cursor, tries - 1); }
      return null;
    }
  };

  const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const itemOf = (e) => {
    const url = e.source?.url;
    if (e.__typename === "WebsiteElementTile" && url) return { url, title: e.websiteTitle || "" };
    if (e.__typename === "ProductElementTile" && url) return { url, title: e.productTitle || "" };
    if (e.__typename === "MediaElementTile") {
      const m = e.media;
      const file = m?.__typename === "Video" ? m.thumbnail?.url : m?.url;
      // The caption, else the site it was found on: the name says where it comes from
      if (file && e.shareUrl) return { url: e.shareUrl, title: e.generatedCaption?.text?.trim() || host(url), image: [file] };
    }
    if (e.__typename === "TextElementTile" && e.shareUrl && typeof e.text === "string" && e.text.trim()) return { url: e.shareUrl, text: e.text.trim().slice(0, 40000) };
    // A website Cosmos has not finished reading comes as a BaseElementTile: its address is all there is
    if (e.__typename === "BaseElementTile" && url) return { url };
    return null;
  };

  let cursor = null, seen = 0;
  for (let n = 0; n < MAX_PAGES && !stopped(); n++) {
    if (n) await sleep(PAUSE_MS);
    const page = await ask(cursor);
    if (!page || !Array.isArray(page.items)) return n ? "partial" : "error";
    const items = [];
    const skipped = {};
    for (const { element: e } of page.items) {
      if (!e) continue;
      seen++;
      const it = itemOf(e);
      if (it) items.push(it);
      else { const why = "other"; skipped[why] = (skipped[why] || 0) + 1; }
    }
    await found({ items, skipped, total: page.meta?.count });
    cursor = page.meta?.nextPageCursor;
    if (!cursor) return "end";
  }
  return seen ? "end" : "error";
});
