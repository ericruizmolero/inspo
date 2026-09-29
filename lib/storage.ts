// File storage. Production: a private Cloudflare R2 bucket (S3 API), when R2_* is set.
// Local: .data/files. Either way the app stores a file as its path, /api/files/<key>,
// and app/api/files/[...key]/route.ts serves it after checking who is asking.
// The key is the same in both drivers, so a reference never changes when files move.
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export const FILES_BASE = "/api/files/";

/** The path the app stores and the browser loads for a key */
export const fileUrl = (key: string) => FILES_BASE + key;

/** The key behind a stored path, or null if it is not one of ours (an old URL, an outside link) */
export function keyOf(url: string): string | null {
  if (!url.startsWith(FILES_BASE)) return null;
  const key = url.slice(FILES_BASE.length).split("?")[0];
  return key && !key.split("/").includes("..") ? key : null;
}

export interface StoredFile { body: Buffer; contentType: string; size: number }
export interface Listed { key: string; uploadedAt: Date }

interface Driver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string, range?: string): Promise<(StoredFile & { range?: string; total?: number }) | null>;
  exists(key: string): Promise<boolean>;
  del(keys: string[]): Promise<void>;
  list(prefix: string): Promise<Listed[]>;
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
        for (const o of r.Contents ?? []) if (o.Key) out.push({ key: o.Key, uploadedAt: o.LastModified ?? new Date(0) });
        token = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (token);
      return out;
    },
  };
}

// ─── Local disk ──────────────────────────────────────────────────────────────

const ROOT = path.join(process.cwd(), ".data", "files");
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".json": "application/json", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
};

function disk(): Driver {
  const file = (key: string) => path.join(ROOT, ...key.split("/"));
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
        const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
        if (m && (m[1] || m[2])) {
          const start = m[1] ? Number(m[1]) : Math.max(0, all.length - Number(m[2]));
          const end = m[1] && m[2] ? Math.min(Number(m[2]), all.length - 1) : all.length - 1;
          const body = all.subarray(start, end + 1);
          return { body, contentType, size: body.length, range: `bytes ${start}-${end}/${all.length}`, total: all.length };
        }
        return { body: all, contentType, size: all.length };
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
            if (key.startsWith(prefix)) out.push({ key, uploadedAt: st.mtime });
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

/** Stores a file and returns the path to save in the database */
export async function putFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await d().put(key, body, contentType);
  return fileUrl(key);
}
export const getFile = (key: string, range?: string) => d().get(key, range);
export const fileExists = (key: string) => d().exists(key);
export const listFiles = (prefix: string) => d().list(prefix);

/** Deletes files by key. Never throws: an orphan file blocks nothing. */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try { await d().del(keys); } catch (e) { console.warn("Could not delete files:", e); }
}

export async function getJson<T>(key: string): Promise<T | null> {
  const f = await getFile(key);
  if (!f) return null;
  try { return JSON.parse(f.body.toString("utf8")) as T; } catch { return null; }
}
export async function putJson(key: string, data: unknown): Promise<void> {
  await d().put(key, Buffer.from(JSON.stringify(data)), "application/json");
}
