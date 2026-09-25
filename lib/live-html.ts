// The live view: a saved site shown inside a sandboxed iframe, served through our own routes.
//
// The frame has an opaque origin (sandbox without allow-same-origin: the page runs but can
// never reach our session or DOM). An opaque origin makes every request cross-origin, and
// whatever the browser fetches in CORS mode (ES modules, fonts, fetch/XHR) fails against the
// site's own domain, which never sends CORS headers. So the document and its same-host assets
// come through /api/live/a/<token>/<host>/<path>, which answers with CORS headers, and relative
// URLs resolve there on their own: no <base> to lose when a React app rebuilds <head>.
// Pictures and video redirect to the site (no CORS needed, and no bytes through us).
import { createHmac, timingSafeEqual } from "crypto";

export const LIVE_MAX_BYTES = 8 * 1024 * 1024;
export const LIVE_ROOT = "/api/live/a";
// Last segment of a document URL that ends in "/": Next would drop the slash, and every relative
// URL would then resolve one level up, outside the site's root. The asset route strips it.
export const LIVE_DOC = "__live__";
// Next's dev server refuses cross-origin requests for any path that holds "/_next/", ours included:
// the segment travels spelled differently and the asset route puts it back.
export const NEXT_SEG = /(^|\/)_next(?=\/|$)/g;
export const NEXT_SEG_SAFE = /(^|\/)__next(?=\/|$)/g;
export const hideNextSeg = (path: string) => path.replace(NEXT_SEG, "$1__next");
export const showNextSeg = (path: string) => path.replace(NEXT_SEG_SAFE, "$1_next");
export const LIVE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// ─── Token ───────────────────────────────────────────────────────────────────
// Proves a member asked for this host today. The frame cannot send cookies (opaque origin),
// so the proof travels in the path. Stable within a day, so the CDN cache stays warm.

function secret(): string {
  return process.env.LIVE_SECRET || process.env.BETTER_AUTH_SECRET || "dev-live-secret";
}
// Bump when the shim or the rewriting changes: the token is in every asset URL, so a new one
// leaves behind whatever browsers and the CDN cached from the old version.
const LIVE_VERSION = 3;
function sign(host: string, day: number): string {
  return createHmac("sha256", secret()).update(`${LIVE_VERSION}|${host}|${day}`).digest("hex").slice(0, 24);
}
const today = () => Math.floor(Date.now() / 86_400_000);

export function liveToken(host: string): string {
  return sign(host, today());
}
export function verifyLiveToken(token: string, host: string): boolean {
  const d = today();
  return [d, d - 1].some((day) => {
    const want = sign(host, day);
    return want.length === token.length && timingSafeEqual(Buffer.from(want), Buffer.from(token));
  });
}

/** Where the frame loads a URL of the site from: absolute path on our origin. */
export function livePath(token: string, url: URL): string {
  const path = url.pathname.endsWith("/") ? `${url.pathname}${LIVE_DOC}` : url.pathname;
  return `${LIVE_ROOT}/${token}/${url.host}${hideNextSeg(path)}${url.search}`;
}

// Never fetch our own network from a URL a user typed
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?|\[?fc[0-9a-f]{2}:.*|\[?fe80:.*)$/i;

export function isPublicHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) && !PRIVATE_HOST.test(u.hostname) && u.hostname.includes(".");
  } catch {
    return false;
  }
}

// Pictures, video and audio are fetched without CORS: they go straight to the site
export const MEDIA_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp4|webm|mov|m4v|mp3|m4a|ogg|wav|aac)(\?|#|$)/i;
export const isMediaType = (type: string) => /^(image|video|audio)\//i.test(type);

// ─── Shim ────────────────────────────────────────────────────────────────────
// Runs before the page's own scripts. Storage and cookies throw in an opaque origin: memory
// stand-ins. URL(x, location.origin) throws (origin is "null"): resolve against the site.
// fetch/XHR to the site's own host go through our route, like everything else. History
// cannot change URL here: swallowed. Links must not navigate: the frame is a window, not a
// browser. Cookie banners come in a thousand markups: anything fixed that talks about cookies
// is hidden, on load and again as it appears.
function shim(origin: string, host: string, root: string): string {
  return `<script data-inspo-live>(function(){
var origin=${JSON.stringify(origin)},host=${JSON.stringify(host)},root=${JSON.stringify(root)};
function mem(){var s={};return{getItem:function(k){return k in s?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null},get length(){return Object.keys(s).length}}}
try{window.localStorage.length}catch(e){try{Object.defineProperty(window,'localStorage',{value:mem()});Object.defineProperty(window,'sessionStorage',{value:mem()})}catch(e2){}}
try{document.cookie}catch(e){try{var c='';Object.defineProperty(document,'cookie',{get:function(){return c},set:function(v){c=String(v).split(';')[0]}})}catch(e2){}}
try{var hp=history.pushState.bind(history),hr=history.replaceState.bind(history);history.pushState=function(s,t){try{hp(s,t)}catch(e){}};history.replaceState=function(s,t){try{hr(s,t)}catch(e){}}}catch(e){}
try{var N=window.URL;var F=function(u,b){if(b===undefined||b===null||b==='null'||/^about:/.test(String(b)))b=origin+'/';try{return new N(u,b)}catch(e){return new N(u,origin+'/')}};F.prototype=N.prototype;['createObjectURL','revokeObjectURL','canParse','parse'].forEach(function(k){if(N[k])F[k]=N[k].bind(N)});window.URL=F}catch(e){}
var ours=new N(document.baseURI).origin;var MEDIA=/\\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp4|webm|mov|m4v|mp3|m4a|ogg|wav|aac)(\\?|#|$)/i;
function via(u){try{var a=new N(String(u),document.baseURI);var onSite=a.host===host,onUs=a.origin===ours&&a.pathname.indexOf(root)!==0;if(!onSite&&!onUs)return u;var p=a.pathname+a.search+a.hash;return MEDIA.test(a.pathname)?origin+p:root+p.replace(/(^|\\/)_next(?=\\/|$)/g,'$1__next')}catch(e){}return u}
function viaSet(v){return String(v).split(',').map(function(c){var m=c.trim().match(/^(\\S+)(\\s+.*)?$/);return m?via(m[1])+(m[2]||''):c}).join(', ')}
try{var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){var l=String(n).toLowerCase();if(l==='src'||l==='href'||l==='poster'||l==='data-src')v=via(v);else if(l==='srcset'||l==='data-srcset')v=viaSet(v);return sa.call(this,n,v)};
[[HTMLImageElement,'src'],[HTMLImageElement,'srcset'],[HTMLScriptElement,'src'],[HTMLSourceElement,'src'],[HTMLSourceElement,'srcset'],[HTMLVideoElement,'src'],[HTMLVideoElement,'poster'],[HTMLAudioElement,'src'],[HTMLLinkElement,'href'],[HTMLIFrameElement,'src']].forEach(function(pr){var d=Object.getOwnPropertyDescriptor(pr[0].prototype,pr[1]);if(!d||!d.set)return;Object.defineProperty(pr[0].prototype,pr[1],{get:d.get,set:function(v){d.set.call(this,pr[1]==='srcset'?viaSet(v):via(v))},configurable:true})})}catch(e){}
try{var nf=window.fetch;window.fetch=function(i,o){if(typeof i==='string'||i instanceof URL)return nf(via(i),o);if(i&&i.url){var v=via(i.url);if(v!==i.url)return nf(new Request(v,i),o)}return nf(i,o)}}catch(e){}
try{var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var a=Array.prototype.slice.call(arguments);a[1]=via(u);return xo.apply(this,a)}}catch(e){}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a)return;var h=a.getAttribute('href');if(h&&h!=='#'&&h!==''&&h.charAt(0)!=='#'){e.preventDefault();e.stopPropagation()}},true);
document.addEventListener('submit',function(e){e.preventDefault()},true);
function hideBanners(){if(!document.body)return;var els=document.body.querySelectorAll('body *');for(var i=0;i<els.length;i++){var el=els[i];if(el.__liveHidden)continue;var cs=getComputedStyle(el);if(cs.position!=='fixed'&&cs.position!=='sticky')continue;var r=el.getBoundingClientRect();if(r.width<200||r.height<40)continue;var txt=(el.textContent||'').replace(/\\s+/g,' ');if(txt.length>2500||!/cookie|consent|privacy (settings|preferences)|gdpr/i.test(txt))continue;el.style.setProperty('display','none','important');el.__liveHidden=1}}
function keep(){var h=document.head;if(h&&!h.querySelector('style[data-inspo-live]')){var st=document.createElement('style');st.setAttribute('data-inspo-live','');st.textContent=${JSON.stringify(hideCssBody)};h.appendChild(st)}}
document.addEventListener('DOMContentLoaded',function(){keep();hideBanners();try{new MutationObserver(keep).observe(document.head,{childList:true})}catch(e){}});
window.addEventListener('load',hideBanners);[400,1200,2500,5000].forEach(function(ms){setTimeout(hideBanners,ms)});
})();</script>`;
}

// Cookie managers, chat bubbles and the Webflow badge: not the site.
const hideCssBody = `
#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,#usercentrics-root,#usercentrics-cmp-ui,#onetrust-consent-sdk,#onetrust-banner-sdk,
.cc-window,.cc-banner,#cookie-banner,#cookieBanner,#cookie-consent,#cookieconsent,.cookie-consent,.cookie-banner,.cookie-notice,#cookie-notice,
#iubenda-cs-banner,.iubenda-cs-container,#hs-eu-cookie-confirmation,.osano-cm-window,#axeptio_overlay,#didomi-host,
.fc-consent-root,#gdpr-banner,[class*="cookie-consent"],[id*="cookie-consent"],[class*="CookieConsent"],[class*="cookieConsent"],[aria-label*="cookie" i][role="dialog"],
.w-webflow-badge,a[href*="webflow.com?utm_campaign=brandjs"],
#hubspot-messages-iframe-container,#intercom-container,.intercom-lightweight-app,#crisp-chatbox,#tidio-chat,#drift-frame-controller,#drift-frame-chat
{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
html,body{overflow-x:hidden!important}
`;
const HIDE_CSS = `<style data-inspo-live>${hideCssBody}</style>`;

// ─── URL rewriting ───────────────────────────────────────────────────────────

/** Absolute URL on the site's host → our path. Anything else unchanged. */
function toLive(raw: string, site: URL, root: string): string {
  const s = raw.trim();
  if (!s || /^(data|blob|javascript|mailto|tel|#):?/i.test(s)) return raw;
  let u: URL;
  try { u = new URL(s.startsWith("//") ? `${site.protocol}${s}` : s, site); } catch { return raw; }
  if (u.host !== site.host) return raw;
  if (MEDIA_EXT.test(u.pathname)) return u.href;
  return `${root}${hideNextSeg(u.pathname)}${u.search}${u.hash}`;
}

/** Relative or same-host URL → absolute on the site (for media, which loads direct). */
function toSite(raw: string, site: URL): string {
  const s = raw.trim();
  if (!s || /^(data|blob|javascript|#)/i.test(s) || /^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:/i.test(s)) return raw;
  try { return new URL(s.startsWith("//") ? `${site.protocol}${s}` : s, site).href; } catch { return raw; }
}

function mapSrcset(value: string, fn: (u: string) => string): string {
  return value.split(",").map((part) => {
    const m = part.trim().match(/^(\S+)(\s+.*)?$/);
    return m ? `${fn(m[1])}${m[2] ?? ""}` : part;
  }).join(", ");
}

const ATTR = /(\s(?:src|href|srcset|poster|data-src|data-srcset|imagesrcset))=("([^"]*)"|'([^']*)'|([^\s>]+))/gi;

function rewriteTag(tag: string, site: URL, root: string): string {
  const name = tag.match(/^<([a-z0-9-]+)/i)?.[1].toLowerCase() ?? "";
  const media = name === "img" || name === "source" || name === "video" || name === "audio" || name === "picture";
  return tag.replace(ATTR, (_m, attr: string, _q, dq, sq, bare) => {
    const value: string = dq ?? sq ?? bare ?? "";
    const isSet = /srcset$/i.test(attr);
    const map = media ? (u: string) => toSite(u, site) : (u: string) => toLive(u, site, root);
    const next = isSet ? mapSrcset(value, map) : map(value);
    return `${attr}="${next.replace(/"/g, "&quot;")}"`;
  });
}

/** The page's HTML made ready for the frame. `root` is where this site lives on our origin. */
export function prepareLiveHtml(html: string, url: string, root: string): string {
  const site = new URL(url);
  const origin = `${site.protocol}//${site.host}`;
  let out = html;

  // The site's own <base> would send relative URLs back to its origin; a CSP in a <meta> would
  // block our inline shim; a refresh would navigate the frame away
  out = out.replace(/<base\b[^>]*>/gi, "");
  out = out.replace(/<meta[^>]+http-equiv=["']?(content-security-policy|refresh)["']?[^>]*>/gi, "");
  // Frame-busting: the page believes it is the top window
  out = out.replace(/window\.top\s*([!=]==?)/g, "window.self $1").replace(/top\.location\s*(!==?|===?)\s*(self|window)\.location/g, "false");
  // A CORS fetch our route answers needs no integrity hash we cannot keep; crossorigin goes with it
  out = out.replace(/<(script|link)\b([^>]*?)\s+(?:crossorigin|integrity)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "<$1$2")
    .replace(/<(script|link)\b([^>]*?)\s+(?:crossorigin|integrity)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "<$1$2");
  // Same-host URLs come through us; pictures and video go direct
  out = out.replace(/<(?:img|source|video|audio|picture|script|link|iframe|a|use)\b[^>]*>/gi, (tag) => rewriteTag(tag, site, root));
  // Inline styles: fonts and backgrounds by URL
  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => m.replace(css, rewriteCss(css, url, root)));

  // Function replacers: the shim holds "$1" of its own, which a string replacement would expand
  const head = shim(origin, site.host, root);
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => `${m}${head}`);
  else out = `${head}${out}`;
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, (m) => `${HIDE_CSS}${m}`);
  else out = `${out}${HIDE_CSS}`;
  return out;
}

/** A stylesheet of the site: same-host url() and @import come through us, media goes direct. */
export function rewriteCss(css: string, url: string, root: string): string {
  const site = new URL(url);
  return css
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)/gi, (_m, dq, sq, bare) => {
      const v: string = dq ?? sq ?? bare ?? "";
      const next = MEDIA_EXT.test(v.split(/[?#]/)[0]) ? toSite(v, site) : toLive(v, site, root);
      return `url("${next.replace(/"/g, "%22")}")`;
    })
    .replace(/@import\s+(?:"([^"]*)"|'([^']*)')/gi, (_m, dq, sq) => `@import "${toLive(dq ?? sq ?? "", site, root)}"`);
}
