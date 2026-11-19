// The live preview of a Vault entry: one HTML document that shows the piece running. An entry brings its own
// (`demo`, written with it), or one is put together from its blocks: the html ones in the body in their order (a
// setup block's <script src> tags included), the css ones in a <style>, the js ones in a <script> at the end.
// The document is our team's code, but it still never runs as the app: app/api/vault/[entry]/preview serves it
// sandboxed, with no origin, no cookies and no way to reach the page around it.

interface Previewable { title: string; demo: string | null; ground?: string | null; blocks: { lang: string; code: string }[] }

const MARKUP = new Set(["html", "htm"]);
const STYLE = new Set(["css"]);
const SCRIPT = new Set(["js", "javascript", "mjs"]);
const of = (e: Previewable, langs: Set<string>) => e.blocks.filter((b) => langs.has(b.lang)).map((b) => b.code);

/** Something to show: its own demo, or at least one block of markup */
export const canPreview = (e: Previewable) => !!e.demo?.trim() || of(e, MARKUP).length > 0;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** Inside an inline <script> or <style>, the one thing that must not appear is its own closing tag */
const inTag = (code: string, tag: "script" | "style") => code.replace(new RegExp(`</(${tag})`, "gi"), "<\\/$1");

/** What a card adds to the document it plays on hover (components/Vault.tsx): it never scrolls, so the wheel stays
 *  with the page, and a click anywhere tells the card to open the entry instead of doing its own thing */
const IN_CARD = `<style>html,body{overflow:hidden!important}</style><script>addEventListener("click",function(e){e.preventDefault();e.stopPropagation();parent.postMessage({vault:"open"},"*")},true)</script>`;

/**
 * A button in a card shows its hover without the pointer on it: resting anywhere on the card is enough (Eric, 18-11).
 * A real :hover cannot be made from script, so every rule that says :hover gets a twin that says .is-hovered, and that
 * class goes on and off the elements those rules name, with the mouse events a script would listen for, in a loop.
 * The real pointer still works over the piece.
 */
const AUTO_HOVER = `<script>(function(){var C="is-hovered",sels=[];function walk(rules,into){for(var i=rules.length-1;i>=0;i--){var r=rules[i];if(r.cssRules&&r.type!==1){walk(r.cssRules,r);continue}if(r.type===1&&r.selectorText&&r.selectorText.indexOf(":hover")>-1){r.selectorText.split(",").forEach(function(s){var at=s.indexOf(":hover");if(at>-1)sels.push(s.slice(0,at).trim())});try{into.insertRule(r.cssText.replace(/:hover/g,"."+C),i+1)}catch(e){}}}}function start(){[].forEach.call(document.styleSheets,function(sh){try{walk(sh.cssRules,sh)}catch(e){}});var els=[];sels.concat(["a","button","[role=button]"]).forEach(function(s){try{[].forEach.call(document.querySelectorAll(s),function(el){if(els.indexOf(el)<0)els.push(el)})}catch(e){}});if(!els.length)return;function fire(el,n){el.dispatchEvent(new MouseEvent(n,{bubbles:n==="mouseover"||n==="mouseout",view:window}))}function on(){els.forEach(function(el){el.classList.add(C);fire(el,"mouseover");fire(el,"mouseenter")});setTimeout(off,1500)}function off(){els.forEach(function(el){el.classList.remove(C);fire(el,"mouseout");fire(el,"mouseleave")});setTimeout(on,900)}setTimeout(on,350)}if(document.readyState==="complete")start();else addEventListener("load",start)})()</script>`;

/** The document as a card plays it; `hover` also plays its hover by itself */
export function cardDoc(doc: string, hover = false): string {
  const extra = IN_CARD + (hover ? AUTO_HOVER : "");
  const at = doc.search(/<\/body\s*>/i);
  return at < 0 ? doc + extra : doc.slice(0, at) + extra + doc.slice(at);
}

/** The preview with the app's own icon in its tab (app/icon.svg, which follows the browser's theme). A document that
 *  names no icon gets the browser's guess, /favicon.ico: Tino in ink, lost on a dark tab bar. One that brings its own keeps it */
export function withIcon(doc: string): string {
  if (/<link[^>]+rel=["']?[^"'>]*icon/i.test(doc)) return doc;
  const link = '<link rel="icon" type="image/svg+xml" href="/icon.svg">';
  const head = /<head[^>]*>/i.exec(doc);
  return head ? doc.slice(0, head.index + head[0].length) + "\n" + link + doc.slice(head.index + head[0].length) : doc;
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The preview as a link that is passed around: its tab says the piece's name, and where the link is pasted
 *  (WhatsApp, Slack, X) it unfurls with that name, what the piece is and its own card (app/api/vault/[entry]/og).
 *  The document's own title, if it brought one, gives way to ours */
export function withShare(doc: string, m: { title: string; description: string; url: string; image: string }): string {
  const title = `${m.title} · Criterio Vault`;
  const tags = [
    `<title>${esc(title)}</title>`,
    m.description ? `<meta name="description" content="${attr(m.description)}">` : "",
    '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Criterio">',
    `<meta property="og:title" content="${attr(title)}">`,
    m.description ? `<meta property="og:description" content="${attr(m.description)}">` : "",
    `<meta property="og:url" content="${attr(m.url)}">`,
    `<meta property="og:image" content="${attr(m.image)}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${attr(m.title)}">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${attr(title)}">`,
    m.description ? `<meta name="twitter:description" content="${attr(m.description)}">` : "",
    `<meta name="twitter:image" content="${attr(m.image)}">`,
  ].filter(Boolean).join("\n");
  const bare = doc.replace(/<title[^>]*>[\s\S]*?<\/title>/i, "");
  const head = /<head[^>]*>/i.exec(bare);
  if (head) return bare.slice(0, head.index + head[0].length) + "\n" + tags + bare.slice(head.index + head[0].length);
  const html = /<html[^>]*>/i.exec(bare);
  const at = html ? html.index + html[0].length : (/^\s*<!doctype[^>]*>/i.exec(bare)?.[0].length ?? 0);
  return bare.slice(0, at) + "\n<head>\n" + tags + "\n</head>" + bare.slice(at);
}

/** The ground a put-together preview stands on and the ink that reads on it. One fixed colour, never the viewer's
 *  theme: the entry's picture is taken on it, and a card must not change ground when its piece starts */
export const PREVIEW_GROUND = "#F4F0E6";
function groundOf(e: Previewable): { ground: string; ink: string } {
  const ground = e.ground && /^#[0-9a-f]{6}$/i.test(e.ground) ? e.ground : PREVIEW_GROUND;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
  return { ground, ink: 0.299 * r + 0.587 * g + 0.114 * b < 140 ? "#EDE6D6" : "#1B1B18" };
}

/** A small piece (a button, a link) would sit lost in the middle of the ground: once laid out, what the body holds is
 *  enlarged until it fills a fair share of the view (never past 4 times, never shrunk), and again when the view
 *  changes. A section already fills it and stays as it is. Only in a put-together preview: a demo sizes itself. */
const FIT = `<script>(function(){function fit(){var els=[].filter.call(document.body.children,function(el){return !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName)});els.forEach(function(el){el.style.zoom=""});var w=0,h=0;els.forEach(function(el){var r=el.getBoundingClientRect();w=Math.max(w,r.width);h+=r.height});if(!w||!h)return;var k=Math.min(4,0.42*innerWidth/w,0.3*innerHeight/h);if(k>1.05)els.forEach(function(el){el.style.zoom=k})}addEventListener("load",fit);addEventListener("resize",fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit)})()</script>`;

export function previewDoc(e: Previewable): string | null {
  if (e.demo?.trim()) return /^\s*<!doctype/i.test(e.demo) ? e.demo : `<!doctype html>\n${e.demo}`;
  const html = of(e, MARKUP);
  if (!html.length) return null;
  const { ground, ink } = groundOf(e);
  return [
    "<!doctype html>", '<html lang="en">', "<head>", '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(e.title)}</title>`,
    // The entry's ground with the piece in the middle: an entry that needs more brings its demo
    `<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:${ground};color:${ink};font-family:ui-sans-serif,system-ui,sans-serif}body>*{max-width:100%}</style>`,
    ...of(e, STYLE).map((c) => `<style>\n${inTag(c, "style")}\n</style>`),
    "</head>", "<body>",
    ...html,
    ...of(e, SCRIPT).map((c) => `<script>\n${inTag(c, "script")}\n</script>`),
    FIT,
    "</body>", "</html>",
  ].join("\n");
}

/** The policy the preview is served with (the route and next.config.ts both send it, so no other header replaces
 *  it): no origin, scripts allowed, and scripts, styles, fonts and pictures from any https address. It calls nothing. */
export const VAULT_PREVIEW_CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' https: blob:",
  "style-src 'unsafe-inline' https:",
  "img-src https: data: blob:",
  "media-src https: data: blob:",
  "font-src https: data:",
  "worker-src blob:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join("; ");
