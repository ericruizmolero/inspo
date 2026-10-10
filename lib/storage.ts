// File storage. Production: a private Cloudflare R2 bucket (S3 API), when R2_* is set.
// Local: .data/files. Either way the app stores a file as its path, /api/files/<key>,
// and app/api/files/[...key]/route.ts checks who is asking. With R2 it then redirects to a
// short-lived signed URL, so the bytes come from R2 and never pass through a function; on disk
// it streams them. Large uploads also skip the app: the browser PUTs to a signed URL (uploadUrl).
// The key is the same in both drivers, so a reference never changes when files move.
import "server-only";
import { promises as fs, createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { assertRoomIn } from "./quota";
import { log, recordFailure } from "./log";

export const FILES_BASE = "/api/files/";

/** The path the app stores and the browser loads for a key */
export const fileUrl = (key: string) => FILES_BASE + key;

/** The key behind a stored path, or null if it is not one of ours (an old URL, an outside link) */
export function keyOf(url: string): string | null {
  if (!url.startsWith(FILES_BASE)) return null;
  const key = url.slice(FILES_BASE.length).split("?")[0];
  return isSafeKey(key) ? key : null;
}

/** No empty, "." or ".." segment and no backslash, after any decoding the router did */
export function isSafeKey(key: string): boolean {
  return !!key && !key.includes("\\") && !key.split("/").some((p) => !p || p === "." || p === "..");
}

export interface StoredFile { body: Buffer; contentType: string; size: number }
/** A file as a stream, for serving: `range` is set (and the status is 206) when part of it was asked for */
export interface OpenedFile { stream: ReadableStream<Uint8Array>; contentType: string; size: number; range?: string }
export interface Listed { key: string; uploadedAt: Date; size: number }
/** A signed address on R2: `maxAge` is how long, in seconds, it can still be cached */
export interface SignedGet { url: string; maxAge: number }

interface Driver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string, range?: string): Promise<(StoredFile & { range?: string; total?: number }) | null>;
  open(key: string, range?: string): Promise<OpenedFile | null>;
  exists(key: string): Promise<boolean>;
  del(keys: string[]): Promise<void>;
  list(prefix: string): Promise<Listed[]>;
  /** Only R2 has these: the disk driver serves and receives files itself */
  signGet?(key: string): Promise<SignedGet>;
  signPut?(key: string, contentType: string, size: number): Promise<string>;
}

// ─── R2 ──────────────────────────────────────────────────────────────────────

function r2(): Driver {
  const bucket = process.env.R2_BUCKET!;
  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    // Path-style keeps it working against MinIO and other S3 servers in development
    forcePathStyle: true,
  });
  // Signed URLs of the current hour, by key (signGet)
  const signed = new Map<string, Promise<string>>();
  let signedHour = 0;
  const missing = (e: unknown) => (e as { name?: string; $metadata?: { httpStatusCode?: number } }).name === "NoSuchKey"
    || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;
  return {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key, range) {
      try {
        const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }));
        const body = Buffer.from(await r.Body!.transformToByteArray());
        const total = r.ContentRange ? Number(r.ContentRange.split("/")[1]) : undefined;
        return { body, contentType: r.ContentType || "application/octet-stream", size: body.length, range: r.ContentRange, total };
      } catch (e) {
        if (missing(e)) return null;
        throw e;
      }
    },
    async open(key, range) {
      try {
        const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }));
        return { stream: r.Body!.transformToWebStream(), contentType: r.ContentType || "application/octet-stream", size: r.ContentLength ?? 0, range: r.ContentRange };
      } catch (e) {
        if (missing(e)) return null;
        throw e;
      }
    },
    async exists(key) {
      try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true; }
      catch (e) { if (missing(e)) return false; throw e; }
    },
    async del(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
      }
    },
    async list(prefix) {
      const out: Listed[] = [];
      let token: string | undefined;
      do {
        const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
        for (const o of r.Contents ?? []) if (o.Key) out.push({ key: o.Key, uploadedAt: o.LastModified ?? new Date(0), size: o.Size ?? 0 });
        token = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (token);
      return out;
    },
    async signGet(key) {
      // Signed from the start of the hour, valid for two: the same file keeps the same URL for
      // an hour, so the browser's cache still works, and every URL handed out lives an hour or more.
      const hour = 3600_000;
      const from = Math.floor(Date.now() / hour) * hour;
      // The same key signs to the same URL all hour, so each one is signed once an hour. A library load
      // signs hundreds, and going through the SDK every time cost seconds.
      if (signedHour !== from) { signed.clear(); signedHour = from; }
      let url = signed.get(key);
      if (!url) {
        url = getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket, Key: key,
          // Keys carry a timestamp: a changed file gets a new key, so a day of caching is safe
          ResponseCacheControl: "private, max-age=86400",
          // An SVG opened on its own runs its scripts: a download instead. <img> still shows it.
          ...(/\.svg$/i.test(key) ? { ResponseContentDisposition: "attachment" } : {}),
        }), { signingDate: new Date(from), expiresIn: 7200 });
        signed.set(key, url);
        url.catch(() => signed.delete(key));
      }
      return { url: await url, maxAge: Math.max(0, Math.floor((from + 2 * hour - Date.now()) / 1000) - 300) };
    },
    async signPut(key, contentType, size) {
      // Type and length are signed: R2 refuses a body of another size or type than the one checked
      return getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size }), {
        expiresIn: 600,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
    },
  };
}

// ─── Local disk ──────────────────────────────────────────────────────────────

const ROOT = path.join(process.cwd(), ".data", "files");
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".avif": "image/avif", ".json": "application/json", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
};

/** "bytes=0-9" → [0, 9] within a file of `size` bytes; null for no range or one it can't serve */
function parseRange(range: string | undefined, size: number): [number, number] | null {
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  return start <= end ? [start, end] : null;
}

function disk(): Driver {
  // A segment may carry an encoded slash (..%2F..): resolved, the path must still be under ROOT
  const file = (key: string) => {
    const full = path.resolve(ROOT, ...key.split("/"));
    if (!full.startsWith(ROOT + path.sep)) throw new Error(`Key outside storage: ${key}`);
    return full;
  };
  const gone = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT";
  return {
    async put(key, body) {
      await fs.mkdir(path.dirname(file(key)), { recursive: true });
      await fs.writeFile(file(key), body);
    },
    async get(key, range) {
      try {
        const all = await fs.readFile(file(key));
        const contentType = TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
        const part = parseRange(range, all.length);
        if (part) {
          const [start, end] = part;
          const body = all.subarray(start, end + 1);
          return { body, contentType, size: body.length, range: `bytes ${start}-${end}/${all.length}`, total: all.length };
        }
        return { body: all, contentType, size: all.length };
      } catch (e) {
        if (gone(e)) return null;
        throw e;
      }
    },
    async open(key, range) {
      try {
        const { size } = await fs.stat(file(key));
        const contentType = TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
        const part = parseRange(range, size);
        const [start, end] = part ?? [0, size - 1];
        const stream = Readable.toWeb(createReadStream(file(key), { start, end })) as ReadableStream<Uint8Array>;
        return { stream, contentType, size: end - start + 1, range: part ? `bytes ${start}-${end}/${size}` : undefined };
      } catch (e) {
        if (gone(e)) return null;
        throw e;
      }
    },
    async exists(key) {
      try { await fs.access(file(key)); return true; } catch { return false; }
    },
    async del(keys) {
      await Promise.all(keys.map((k) => fs.unlink(file(k)).catch((e) => { if (!gone(e)) throw e; })));
    },
    async list(prefix) {
      const out: Listed[] = [];
      const walk = async (dir: string) => {
        let names: string[] = [];
        try { names = await fs.readdir(dir); } catch { return; }
        for (const n of names) {
          const full = path.join(dir, n);
          const st = await fs.stat(full);
          if (st.isDirectory()) await walk(full);
          else {
            const key = path.relative(ROOT, full).split(path.sep).join("/");
            if (key.startsWith(prefix)) out.push({ key, uploadedAt: st.mtime, size: st.size });
          }
        }
      };
      await walk(ROOT);
      return out;
    },
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const usingR2 = () => !!(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

let driver: Driver | null = null;
const d = () => (driver ??= usingR2() ? r2() : disk());

/**
 * Stores a file and returns the path to save in the database. `owner` is the workspace whose own file it is: the
 * file must fit in its plan's storage (HttpError 402 before anything is written) and its size is recorded. A shared
 * cache keyed by address (a screenshot, a post's copy) has no owner.
 */
export async function putFile(key: string, body: Buffer, contentType: string, owner?: string): Promise<string> {
  if (owner) await assertRoomIn(owner, { bytes: body.length }, key);
  await d().put(key, body, contentType);
  if (owner) await recordFile(key, owner, body.length);
  return fileUrl(key);
}

/** The size of a workspace's file, written or about to be (a signed upload is signed for exactly this size) */
export async function recordFile(key: string, organizationId: string, bytes: number): Promise<void> {
  const F = schema.storedFile;
  await db.insert(F).values({ key, organizationId, bytes }).onConflictDoUpdate({ target: F.key, set: { organizationId, bytes } });
}
export const getFile = (key: string, range?: string) => d().get(key, range);
/** For serving: streams the file (or the asked range) without holding it in memory */
export const openFile = (key: string, range?: string) => d().open(key, range);
export const fileExists = (key: string) => d().exists(key);
/** Where the browser can fetch a file straight from R2, or null on disk (then the route streams it) */
export const signedFileUrl = (key: string): Promise<SignedGet | null> => d().signGet?.(key) ?? Promise.resolve(null);
/** Where the browser can PUT a file straight to R2, or null on disk (then it posts it to the app) */
export const uploadUrl = (key: string, contentType: string, size: number): Promise<string | null> =>
  d().signPut?.(key, contentType, size) ?? Promise.resolve(null);
export const listFiles = (prefix: string) => d().list(prefix);

/** Deletes files by key, and their sizes with them. Never throws: an orphan file blocks nothing. */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    await d().del(keys);
    await db.delete(schema.storedFile).where(inArray(schema.storedFile.key, keys));
  } catch (err) { void recordFailure("storage", "delete files", err, { ref: keys[0] }); }
}

export async function getJson<T>(key: string): Promise<T | null> {
  const f = await getFile(key);
  if (!f) return null;
  try { return JSON.parse(f.body.toString("utf8")) as T; } catch (err) { log.warn("storage.bad_json", { ref: key, err }); return null; }
}
export async function putJson(key: string, data: unknown): Promise<void> {
  await d().put(key, Buffer.from(JSON.stringify(data)), "application/json");
}
