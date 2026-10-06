// The only way out for headless Chromium: an HTTP proxy inside this process that connects to an
// address it has just resolved and checked (resolvePublic, lib/safe-fetch.ts). Chromium hands the
// proxy hostnames, never resolves them itself, so a site whose DNS answers public once and private
// the next time (DNS rebinding) still cannot reach this server's network. guardPage stays in front
// of it as the early no.
import "server-only";
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { resolvePublic } from "./safe-fetch";

let started: Promise<number> | null = null;

/** Starts the proxy once per process. Resolves to its port on 127.0.0.1. */
function start(): Promise<number> {
  const server = http.createServer(async (req, res) => {
    // Plain http: the request line carries the absolute URL
    let target: URL;
    try { target = new URL(req.url ?? ""); } catch { res.writeHead(400).end(); return; }
    if (target.protocol !== "http:") { res.writeHead(400).end(); return; }
    const addr = await resolvePublic(target.hostname);
    if (!addr) { res.writeHead(403).end(); return; }
    const headers: http.OutgoingHttpHeaders = { ...req.headers, host: target.host };
    delete headers["proxy-connection"];
    const upstream = http.request({ host: addr.address, family: addr.family, port: target.port || 80, method: req.method, path: target.pathname + target.search, headers }, (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    });
    upstream.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(upstream);
  });

  // https and websockets: a tunnel to the checked address
  server.on("connect", async (req, client: net.Socket, head: Buffer) => {
    client.on("error", () => client.destroy());
    const m = /^\[?([^\]]+?)\]?:(\d+)$/.exec(req.url ?? "");
    const addr = m ? await resolvePublic(m[1]) : null;
    if (!m || !addr) { client.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
    const upstream = net.connect({ host: addr.address, family: addr.family, port: Number(m[2]) }, () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on("error", () => client.destroy());
    client.on("close", () => upstream.destroy());
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.unref(); // never keeps a function or a script alive on its own
      resolve((server.address() as AddressInfo).port);
    });
  });
}

/** Chromium launch flags that send every request through the proxy. <-loopback> removes Chromium's
 *  built-in exception for localhost, so even that goes through the check. WebRTC may only use the proxy. */
export async function egressArgs(): Promise<string[]> {
  started ??= start().catch((e) => { started = null; throw e; });
  const port = await started;
  return [`--proxy-server=http://127.0.0.1:${port}`, "--proxy-bypass-list=<-loopback>", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"];
}
