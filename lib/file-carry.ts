// Taking a workspace's rows somewhere else with their files: a project moved to another workspace
// (lib/project-move.ts) and a workspace imported from its export (lib/workspace-import.ts). A workspace's own files
// live under inspo/<id>/ (lib/storage.ts); rows name them as /api/files/inspo/<id>/… or, in a brand, as the bare key.
// Every string that names one is copied into the new workspace's folder and rewritten to the copy, wherever it sits
// in the row, and every id in a JSON value swapped for its new one.
import "server-only";
import { fileUrl, isSafeKey, keyOf, putFile } from "./storage";
import { eachLimit } from "./each-limit";
import { log } from "./log";

/** A file of the old workspace's, read from wherever it is now: the bucket, or an export's zip */
export type ReadFile = (key: string) => Promise<{ body: Buffer; contentType: string } | null>;

/** A path of the old workspace's own (`inspo/<from>/…`) as it is in the new one, or null for any other string */
function carriedKey(value: string, from: string, to: string): { key: string; next: string } | null {
  const key = keyOf(value) ?? (value.startsWith(`inspo/${from}/`) ? value : null);
  if (!key?.startsWith(`inspo/${from}/`)) return null;
  const next = `inspo/${to}/${key.slice(`inspo/${from}/`.length)}`;
  return isSafeKey(next) ? { key, next } : null;
}

/** The keys of `organizationId`'s own files that a value names, anywhere in it */
export function keysIn(value: unknown, organizationId: string, out = new Set<string>()): Set<string> {
  if (typeof value === "string") { const c = carriedKey(value, organizationId, organizationId); if (c) out.add(c.key); }
  else if (Array.isArray(value)) for (const v of value) keysIn(v, organizationId, out);
  else if (value && typeof value === "object" && !(value instanceof Date)) for (const v of Object.values(value)) keysIn(v, organizationId, out);
  return out;
}

/** A string that names some workspace's private file: under inspo/ (a workspace's folder or its "why" captures) */
export const namesPrivateFile = (value: string) => (keyOf(value) ?? value).startsWith("inspo/");

/**
 * Files of the old workspace that the rows point at, copied into the new one's folder (its storage counts them).
 * `foreign` is what becomes of a string that names a private file which was not copied: "keep" leaves it as it was
 * (a project moved between two workspaces of the same person), "drop" makes it null (an import: the file did not
 * come in the zip, or it is another workspace's, and a row of the new workspace may not point at it).
 */
export class FileCarrier {
  private done = new Map<string, string>();
  constructor(private from: string, private to: string, private read: ReadFile, private foreign: "keep" | "drop") {}

  /** The old workspace's keys a value names, anywhere in it */
  keysIn(value: unknown): Set<string> {
    return keysIn(value, this.from);
  }

  /** The path a string will have once carried, without copying anything yet */
  next(value: string): string {
    const c = carriedKey(value, this.from, this.to);
    if (!c) return value;
    return value.startsWith("inspo/") ? c.next : fileUrl(c.next);
  }

  /** The path a string has in the new workspace after copy(): the copy's, the same string, or null (see `foreign`) */
  private target(value: string): string | null {
    const c = carriedKey(value, this.from, this.to);
    if (c && this.done.has(c.key)) return this.next(value);
    return this.foreign === "drop" && namesPrivateFile(value) ? null : value;
  }

  /** Keys whose copy the new folder already holds: rows point at it, and copy() neither reads nor writes over it */
  adopt(keys: Iterable<string>): void {
    for (const key of keys) { const c = carriedKey(key, this.from, this.to); if (c) this.done.set(key, c.next); }
  }

  /** Copies these keys into the new folder, `at` at a time. A file that can no longer be read is left out: answers
   *  those. Once `signal` aborts no other file starts, and it throws after the ones under way are written */
  async copy(keys: Iterable<string>, at = 4, signal?: AbortSignal): Promise<string[]> {
    const missed: string[] = [];
    await eachLimit([...keys].filter((k) => !this.done.has(k)), at, async (key) => {
      const c = carriedKey(key, this.from, this.to);
      if (!c || signal?.aborted) return;
      const f = await this.read(key).catch((err) => { log.warn("file_carry.file_unread", { ref: key, err }); return null; });
      if (!f) { log.warn("file_carry.file_missing", { ref: key }); missed.push(key); return; }
      await putFile(c.next, f.body, f.contentType, this.to);
      this.done.set(key, c.next);
    });
    signal?.throwIfAborted();
    return missed;
  }

  /** The value with every string that names a file rewritten (after copy) */
  map<V>(value: V): V {
    if (typeof value === "string") return this.target(value) as V;
    if (Array.isArray(value)) return value.map((v) => this.map(v)) as V;
    if (value && typeof value === "object" && !(value instanceof Date)) {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.map(v)])) as V;
    }
    return value;
  }
}

/** Every id in a JSON value (exact strings) swapped for its new one */
export function remapIds<V>(value: V, ids: Map<string, string>): V {
  if (!ids.size || value == null) return value;
  if (typeof value === "string") return (ids.get(value) ?? value) as V;
  if (Array.isArray(value)) return value.map((v) => remapIds(v, ids)) as V;
  if (typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapIds(v, ids)])) as V;
  return value;
}
