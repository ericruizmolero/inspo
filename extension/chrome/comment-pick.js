// Pick an element on the page and leave a comment on it. Injected into the tab by the popup, only after the person's click.
// The UI lives in a shadow root, so the page's styles cannot reach it. It sends the comment to background.js, which holds the key.
(() => {
  if (window.__criterioComment) return;
  window.__criterioComment = true;
  const t = (key) => chrome.i18n.getMessage(key) || key;
  const host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>
    .box{position:fixed;border:2px solid #E8862A;background:rgba(232,134,42,.12);border-radius:4px;pointer-events:none;display:none}
    .bar,.form{position:fixed;font:14px/1.4 system-ui,sans-serif;color:#EFE7D8;background:#22211D;border:1px solid #3A382F;border-radius:12px;pointer-events:auto;box-shadow:0 8px 24px rgba(0,0,0,.35)}
    .bar{left:50%;bottom:20px;transform:translateX(-50%);padding:10px 14px}
    .form{width:320px;padding:12px;display:none;flex-direction:column;gap:8px}
    textarea{all:unset;box-sizing:border-box;width:100%;min-height:76px;padding:8px 10px;background:#111;border:1px solid #3A382F;border-radius:8px;white-space:pre-wrap}
    .row{display:flex;justify-content:flex-end;gap:8px}
    button{all:unset;cursor:pointer;padding:6px 12px;border-radius:8px;background:#EFE7D8;color:#1B1B18;font-weight:500}
    button.quiet{background:none;color:#EFE7D8}
    button:focus-visible,textarea:focus-visible{outline:2px solid #E8862A;outline-offset:1px}
  </style>
  <div class="box"></div><div class="bar"></div>
  <div class="form" role="dialog"><textarea></textarea><div class="row"><button class="quiet" type="button"></button><button type="button"></button></div></div>`;
  const box = root.querySelector(".box"), bar = root.querySelector(".bar"), form = root.querySelector(".form"), input = root.querySelector("textarea");
  const [cancel, send] = root.querySelectorAll("button");
  bar.textContent = t("commentHint");
  input.placeholder = t("commentPlaceholder");
  cancel.textContent = t("commentCancel");
  send.textContent = t("commentSend");
  document.documentElement.append(host);

  let picked = null;
  const frame = (el) => {
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  };
  /** A path that survives small changes: stops at the nearest id */
  const pathOf = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.documentElement && parts.length < 8; e = e.parentElement) {
      if (e.id) { parts.unshift(`#${CSS.escape(e.id)}`); break; }
      const same = e.parentElement ? [...e.parentElement.children].filter((x) => x.tagName === e.tagName) : [];
      parts.unshift(`${e.tagName.toLowerCase()}${same.length > 1 ? `:nth-of-type(${same.indexOf(e) + 1})` : ""}`);
    }
    return parts.join(" > ");
  };
  /** The heading of the section it sits in, or the section's own label */
  const sectionOf = (el) => {
    const s = el.closest("section, header, footer, main, article");
    if (!s) return "";
    const h = s.querySelector("h1, h2, h3");
    return (h?.innerText || s.getAttribute("aria-label") || s.id || s.tagName.toLowerCase()).trim().replace(/\s+/g, " ").slice(0, 120);
  };
  const close = () => {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    window.__criterioComment = false;
  };
  const onMove = (e) => { if (!picked) frame(e.target); };
  const onClick = (e) => {
    if (picked) return;
    e.preventDefault(); e.stopPropagation();
    picked = e.target;
    frame(picked);
    bar.style.display = "none";
    const r = picked.getBoundingClientRect();
    form.style.display = "flex";
    form.style.left = `${Math.max(12, Math.min(r.left, innerWidth - 332))}px`;
    form.style.top = `${r.bottom + 180 < innerHeight ? r.bottom + 8 : Math.max(12, r.top - 170)}px`;
    input.focus();
  };
  const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  cancel.addEventListener("click", close);
  send.addEventListener("click", async () => {
    const comment = input.value.trim();
    if (!comment) { input.focus(); return; }
    send.disabled = true;
    const res = await chrome.runtime.sendMessage({ type: "page-comment", comment: {
      comment, url: location.href, selector: pathOf(picked), section: sectionOf(picked),
      text: (picked.innerText || picked.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 300),
      viewport: `${innerWidth}x${innerHeight}`,
    } }).catch(() => null);
    if (res?.ok) { bar.textContent = t("commentSent"); bar.style.display = "block"; form.style.display = "none"; box.style.display = "none"; setTimeout(close, 1200); }
    else { send.disabled = false; input.placeholder = t("commentFailed"); bar.textContent = res?.error || t("commentFailed"); bar.style.display = "block"; }
  });
})();
