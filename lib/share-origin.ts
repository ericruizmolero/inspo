// The address a share is opened at, so the file's links are whole wherever criterio.md is pasted
import "server-only";
import { headers } from "next/headers";

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : process.env.BETTER_AUTH_URL || "https://criterio.design";
}
