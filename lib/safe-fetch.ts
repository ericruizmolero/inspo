// Fetching a URL a user gave us, without letting it reach this server's own network.
// isPublicHttpUrl (lib/extract.ts) only reads the hostname: a name that resolves to 10.x, or a
// public site that redirects to 169.254.169.254, gets past it. Here the name is resolved and every
// address checked, and redirects are followed by hand so each hop is checked again.
// The check that counts is at connect time (PINNED): the socket opens to the address that was just
// checked, so a name that answers public to the check and private to the connection (DNS rebinding)
// gets nowhere. isPublicUrl before it is the cheap early no. Chromium: lib/egress-proxy.ts.
import "server-only";
import { lookup } from "node:dns/promises";
import { lookup as lookupCb, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch, type RequestInit as UndiciInit } from "undici";
import type { Page } from "puppeteer-core";

const PRIVATE = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
] as const) PRIVATE.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [["::", 127], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) PRIVATE.addSubnet(net, bits, "ipv6");

export function isPrivateIp(ip: string): boolean {
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return PRIVATE.check(mapped, "ipv4");
  return PRIVATE.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4");
}

// One page load asks for the same few hosts dozens of times
const answers = new Map<string, { ok: boolean; at: number }>();
const TTL_MS = 60_000;

/** Is it an http(s) URL whose host resolves only to public addresses? */
export async function isPublicUrl(raw: string | URL): Promise<boolean> {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return !isPrivateIp(host);
  const hit = answers.get(host);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ok;
  let ok = false;
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch { ok = false; }
  if (answers.size > 5000) answers.clear();
  answers.set(host, { ok, at: Date.now() });
  return ok;
}

export class BlockedUrlError extends Error {
  constructor(url: string) { super(`Blocked non-public URL: ${url}`); }
}

/** The host's address to connect to, resolved now, or null if any of its addresses is private.
 *  Not cached: this is the answer the socket uses. */
export async function resolvePublic(host: string): Promise<LookupAddress | null> {
  const h = host.replace(/^\[|\]$/g, "");
  if (isIP(h)) return isPrivateIp(h) ? null : { address: h, family: isIP(h) };
  try {
    const addrs = await lookup(h, { all: true, verbatim: true });
    return addrs.length && addrs.every((a) => !isPrivateIp(a.address)) ? addrs[0] : null;
  } catch { return null; }
}

// Every connection safeFetch opens resolves its host here and refuses a private answer.
// An IP literal never reaches lookup: isPublicUrl has already judged it.
const PINNED = new Agent({
  connect: {
    lookup(hostname, options, cb) {
      lookupCb(hostname, { ...options, all: true, verbatim: true }, (err, addrs) => {
        if (err) return cb(err, "", 0);
        if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return cb(new BlockedUrlError(hostname), "", 0);
        if ((options as { all?: boolean }).all) (cb as unknown as (e: null, a: LookupAddress[]) => void)(null, addrs);
        else cb(null, addrs[0].address, addrs[0].family);
      });
    },
  },
});

const MAX_REDIRECTS = 5;

/** fetch() for a URL that came from a user. Throws BlockedUrlError on a private address at any hop.
 *  res.url is the final URL, like fetch's with redirect: "follow". */
// undici's own fetch, not the global one: the dispatcher is what pins, and Next's patched fetch is not
// promised to pass it through. Its Response has the same shape.
export async function safeFetch(url: string | URL, init: RequestInit = {}): Promise<Response> {
  let current = new URL(url);
  for (let hop = 0; ; hop++) {
    if (!(await isPublicUrl(current))) throw new BlockedUrlError(current.href);
    const res = (await undiciFetch(current, { ...(init as UndiciInit), redirect: "manual", dispatcher: PINNED })) as unknown as Response;
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) {
      if (res.url !== current.href) Object.defineProperty(res, "url", { value: current.href });
      return res;
    }
    await res.body?.cancel();
    if (hop >= MAX_REDIRECTS) throw new BlockedUrlError(`${current.href} (too many redirects)`);
    current = new URL(location, current);
  }
}

/** Headless Chromium only loads public addresses: the page itself, each redirect, and every
 *  resource or fetch the page makes. Call right after browser.newPage(). */
export async function guardPage(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.isInterceptResolutionHandled()) return;
    const url = req.url();
    if (/^(data|blob|about):/.test(url)) { void req.continue(); return; }
    // isPublicUrl never throws; this is a request whose page already closed
    void isPublicUrl(url).then((ok) => (ok ? req.continue() : req.abort("blockedbyclient"))).catch(() => {});
  });
}
