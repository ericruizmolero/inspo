// The live view: a site's HTML, fetched by us, shown inside a sandboxed iframe by srcdoc.
// Nothing is rewritten by hand; a <base> makes every relative asset load from the real
// origin. What we add is small: a shim so the page survives the sandbox (storage and
// cookies throw there, and location is "about:srcdoc"), a guard that keeps links from
// navigating the frame, and a stylesheet that hides the cookie banners the page would
// otherwise open on top of itself.

const MAX_HTML_BYTES = 4 * 1024 * 1024;

// Storage and cookies throw SecurityError in an opaque origin: give them memory stand-ins
// before the page's own scripts run. Location is "about:srcdoc": patch the pieces that
// frameworks read to build URLs. Links must not navigate: the frame is a window, not a browser.
function shim(origin: string): string {
  return `<script>(function(){
var origin=${JSON.stringify(origin)};
function mem(){var s={};return{getItem:function(k){return k in s?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null},get length(){return Object.keys(s).length}}}
try{window.localStorage.length}catch(e){try{Object.defineProperty(window,'localStorage',{value:mem()});Object.defineProperty(window,'sessionStorage',{value:mem()})}catch(e2){}}
try{document.cookie}catch(e){try{var c='';Object.defineProperty(document,'cookie',{get:function(){return c},set:function(v){c=String(v).split(';')[0]}})}catch(e2){}}
try{history.pushState=function(){};history.replaceState=function(){}}catch(e){}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a)return;var h=a.getAttribute('href');if(h&&h!=='#'&&h!==''&&h.charAt(0)!=='#'){e.preventDefault();e.stopPropagation()}},true);
document.addEventListener('submit',function(e){e.preventDefault()},true);
})();</script>`;
}

// Cookie managers, chat bubbles and the Webflow badge: not the site.
const HIDE_CSS = `<style data-inspo-live>
#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,#usercentrics-root,#usercentrics-cmp-ui,#onetrust-consent-sdk,#onetrust-banner-sdk,
.cc-window,.cc-banner,#cookie-banner,#cookieBanner,#cookie-consent,#cookieconsent,.cookie-consent,.cookie-banner,.cookie-notice,#cookie-notice,
#iubenda-cs-banner,.iubenda-cs-container,#hs-eu-cookie-confirmation,.osano-cm-window,#axeptio_overlay,#didomi-host,.didomi-popup-open .didomi-popup-container,
.fc-consent-root,#gdpr-banner,[class*="cookie-consent"],[id*="cookie-consent"],[class*="CookieConsent"],[class*="cookieConsent"],[aria-label*="cookie" i][role="dialog"],
.w-webflow-badge,a[href*="webflow.com?utm_campaign=brandjs"],
#hubspot-messages-iframe-container,#intercom-container,.intercom-lightweight-app,#crisp-chatbox,#tidio-chat,#drift-frame-controller,#drift-frame-chat
{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
html,body{overflow-x:hidden!important}
</style>`;

export const LIVE_MAX_BYTES = MAX_HTML_BYTES;

/** The page's HTML made ready for a sandboxed srcdoc frame. */
export function prepareLiveHtml(html: string, url: string): string {
  const u = new URL(url);
  const origin = `${u.protocol}//${u.host}`;
  let out = html;

  // A CSP in a <meta> would block our inline shim and may block the page's own assets under the new origin
  out = out.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  // Frame-busting: the page believes it is the top window
  out = out.replace(/window\.top\s*([!=]==?)/g, "window.self $1").replace(/top\.location\s*(!==?|===?)\s*(self|window)\.location/g, "false");

  const head = `<base href="${origin}${u.pathname.replace(/[^/]*$/, "")}" target="_self">${shim(origin)}`;
  if (/<head[^>]*>/i.test(out)) out = out.replace(/(<head[^>]*>)/i, `$1${head}`);
  else out = `${head}${out}`;

  if (/<\/head>/i.test(out)) out = out.replace(/(<\/head>)/i, `${HIDE_CSS}$1`);
  else out = `${out}${HIDE_CSS}`;

  return out;
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
