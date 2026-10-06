"use server";
// The MCP connector from the web (cookie session): answering an AI client's request to connect
// (/mcp/authorize), and the apps a person has let in (the Connect dialog).
import { headers } from "next/headers";
import { withCtx, HttpError } from "@/lib/workspace";
import { originOfHeaders } from "@/lib/mcp/auth";
import { approve, deny, listConnections, readAuthRequest, revokeConnection } from "@/lib/mcp/oauth";
import { getErrors } from "@/lib/i18n";

/**
 * The person's answer on the consent page. The request is read again here, from the same query the page was
 * opened with: what the page showed is never trusted. Returns where to take the answer (the app's own address,
 * with a code on a yes).
 */
export async function answerMcpAuth(query: Record<string, string>, allow: boolean) {
  return withCtx(async (ctx) => {
    const origin = originOfHeaders(await headers());
    const clean = Object.fromEntries(Object.entries(query ?? {}).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v.slice(0, 2000)]));
    const request = await readAuthRequest(clean, origin);
    if ("fatal" in request) {
      if (request.fatal) throw new HttpError(400, (await getErrors()).badBody);
      return { url: request.redirect };
    }
    return { url: allow ? await approve(request, ctx.user.id, origin) : deny(request, origin) };
  });
}

export async function loadConnections() {
  return withCtx(async (ctx) => listConnections(ctx.user.id));
}

export async function disconnectApp(id: string) {
  return withCtx(async (ctx) => {
    await revokeConnection(ctx.user.id, String(id));
    return listConnections(ctx.user.id);
  });
}
