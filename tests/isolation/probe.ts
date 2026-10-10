// What every probe does: sign in as B, call the surface, check the answer holds nothing of A's.
import { expect } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { actAs, NavigationThrow } from "../harness";
import type { Fixture } from "./fixture";

export type Surface = { probe: (fx: Fixture) => Promise<void> } | { exempt: string };

/** B's owner signed in, with B's team active (or `workspace`) */
export const asB = (fx: Fixture, workspace = fx.b.team, headers: Record<string, string> = {}) =>
  actAs({ ...fx.b.owner, workspaceId: workspace }, headers);

export const request = (path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }) =>
  new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? "GET",
    headers: { ...(init?.body !== undefined && !(init.body instanceof FormData) ? { "content-type": "application/json" } : {}), ...init?.headers },
    body: init?.body === undefined ? undefined : init.body instanceof FormData ? init.body : JSON.stringify(init.body),
  });

export const params = <T extends Record<string, string | string[]>>(p: T) => ({ params: Promise.resolve(p) });

export const bearer = (key: string, headers: Record<string, string> = {}) => ({ authorization: `Bearer ${key}`, ...headers });

/** Nothing of A's anywhere in what came back */
export function expectNoSecret(fx: Fixture, value: unknown, step: string) {
  expect(typeof value === "string" ? value : JSON.stringify(value) ?? "", step).not.toContain(fx.a.secret);
}

/** A refusal: 401, 403 or 404, with nothing of A's in its body */
export async function expectDenied(fx: Fixture, res: Response, step: string) {
  expect([401, 403, 404], `${step}: status ${res.status}`).toContain(res.status);
  expectNoSecret(fx, await res.text(), step);
}

/** A Server Action that said no: { ok: false }, or a value with nothing of A's */
export function expectRefused(fx: Fixture, result: unknown, step: string) {
  if (result && typeof result === "object" && "ok" in result) expect((result as { ok: boolean }).ok, step).toBe(false);
  expectNoSecret(fx, result, step);
}

/** A page that answered with notFound() or a redirect, never with A's content */
export async function expectPageRefused(fx: Fixture, render: () => Promise<unknown>, step: string) {
  const out = await render().then((v) => v, (e: unknown) => e);
  if (out instanceof NavigationThrow) return;
  if (out instanceof Error) throw out;
  expect.fail(`${step}: the page rendered instead of refusing`);
}

/** Runs `fn` as if the model, embedding and Jev keys were set, so a surface gets past "no key" to its ownership
 *  check. The calls themselves stay mocked (tests/setup.ts). */
export async function withKeys<T>(fn: () => Promise<T>): Promise<T> {
  const keys = ["OPENROUTER_API_KEY", "TYPESAFE_API_KEY"];
  for (const k of keys) process.env[k] = "test";
  try { return await fn(); } finally { for (const k of keys) delete process.env[k]; }
}

/** A's row, to compare before and after a write B attempted */
export const itemRow = async (id: string) => (await db.select().from(schema.inspoItem).where(eq(schema.inspoItem.id, id)))[0];
