// The library writes its URL with history, not the router, so it never reloads. Once Next patches history it copies
// its own state into the entry and syncs the router, but only when it is handed null. The library's mount effects run
// before that patch, and there the native call with null erases the state: Back to that entry then changes the URL
// and leaves the page on screen (#136). So the state is put back whenever the write took it away.
function write(method: "pushState" | "replaceState", url: string) {
  const prev = window.history.state;
  window.history[method](null, "", url);
  if (prev?.__NA && !window.history.state?.__NA) History.prototype.replaceState.call(window.history, prev, "", url);
}

export function pushUrl(url: string) {
  write("pushState", url);
}

export function replaceUrl(url: string) {
  write("replaceState", url);
}
