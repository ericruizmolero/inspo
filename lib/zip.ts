// Zip files with nothing but node:zlib: the Vercel build has no `zip` binary to lean on, and what the app zips is
// either a handful of small files (/extension/download, a brand's kit) or a workspace streamed out entry by entry
// (/api/workspace/export). ZipWriter writes both; openZip reads one back by ranges (an import), so a zip in the
// bucket is never loaded whole. Past 4 GB the offsets go in ZIP64 records, which every unzip tool reads.
import { deflateRawSync, inflateRawSync } from "node:zlib";

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Path inside the zip, with forward slashes */
  name: string;
  data: Buffer;
}

const MAX32 = 0xffffffff;
const SIG = { local: 0x04034b50, central: 0x02014b50, end: 0x06054b50, end64: 0x06064b50, locator64: 0x07064b50 };

/** Writes a zip one entry at a time: each add() answers that entry's bytes, end() the directory that closes the file */
export class ZipWriter {
  private central: Buffer[] = [];
  private offset = 0;
  private count = 0;
  private time: number;
  private day: number;

  /** `date` stamps every entry (local time, as the format wants) */
  constructor(date = new Date()) {
    this.time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    this.day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  }

  /** `compress` false stores the bytes as they are: pictures and videos are packed already, and deflating them only costs time */
  add(name: string, data: Buffer, compress = true): Buffer[] {
    const nameBytes = Buffer.from(name, "utf8");
    const deflated = compress ? deflateRawSync(data) : null;
    // A file that comes out bigger is stored as it is
    const stored = !deflated || deflated.length >= data.length;
    const body = stored ? data : deflated;
    const crc = crc32(data);
    const method = stored ? 0 : 8;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG.local, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0 (deflate)
    local.writeUInt16LE(0x0800, 6); // names are UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(this.time, 10);
    local.writeUInt16LE(this.day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);

    // An entry that starts past 4 GB keeps its offset in a ZIP64 extra field
    const far = this.offset >= MAX32;
    const extra = Buffer.alloc(far ? 12 : 0);
    if (far) { extra.writeUInt16LE(0x0001, 0); extra.writeUInt16LE(8, 2); extra.writeBigUInt64LE(BigInt(this.offset), 4); }
    const head = Buffer.alloc(46);
    head.writeUInt32LE(SIG.central, 0);
    head.writeUInt16LE(45, 4); // made by: 4.5 (ZIP64)
    head.writeUInt16LE(far ? 45 : 20, 6);
    head.writeUInt16LE(0x0800, 8);
    head.writeUInt16LE(method, 10);
    head.writeUInt16LE(this.time, 12);
    head.writeUInt16LE(this.day, 14);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(body.length, 20);
    head.writeUInt32LE(data.length, 24);
    head.writeUInt16LE(nameBytes.length, 28);
    head.writeUInt16LE(extra.length, 30);
    head.writeUInt32LE(far ? MAX32 : this.offset, 42);
    this.central.push(head, nameBytes, extra);

    this.offset += local.length + nameBytes.length + body.length;
    this.count++;
    return [local, nameBytes, body];
  }

  /** The central directory and the records that end the file */
  end(): Buffer {
    const cd = Buffer.concat(this.central);
    const cdOffset = this.offset;
    const out = [cd];
    const zip64 = cdOffset >= MAX32 || cd.length >= MAX32 || this.count >= 0xffff;
    if (zip64) {
      const end64 = Buffer.alloc(56);
      end64.writeUInt32LE(SIG.end64, 0);
      end64.writeBigUInt64LE(BigInt(44), 4);
      end64.writeUInt16LE(45, 12);
      end64.writeUInt16LE(45, 14);
      end64.writeBigUInt64LE(BigInt(this.count), 24);
      end64.writeBigUInt64LE(BigInt(this.count), 32);
      end64.writeBigUInt64LE(BigInt(cd.length), 40);
      end64.writeBigUInt64LE(BigInt(cdOffset), 48);
      const locator = Buffer.alloc(20);
      locator.writeUInt32LE(SIG.locator64, 0);
      locator.writeBigUInt64LE(BigInt(cdOffset + cd.length), 8);
      locator.writeUInt32LE(1, 16);
      out.push(end64, locator);
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(SIG.end, 0);
    end.writeUInt16LE(Math.min(this.count, 0xffff), 8);
    end.writeUInt16LE(Math.min(this.count, 0xffff), 10);
    end.writeUInt32LE(Math.min(cd.length, MAX32), 12);
    end.writeUInt32LE(Math.min(cdOffset, MAX32), 16);
    out.push(end);
    return Buffer.concat(out);
  }
}

/** A whole zip in memory, for a handful of small files. `date` stamps every entry */
export function zip(entries: ZipEntry[], date = new Date()): Buffer {
  const w = new ZipWriter(date);
  return Buffer.concat([...entries.flatMap((e) => w.add(e.name, e.data)), w.end()]);
}

// ─── Reading ─────────────────────────────────────────────────────────────────

/** Where a zip's bytes are: its size, and the bytes from `start` up to `end` (exclusive) */
export interface ZipSource {
  size: number;
  read(start: number, end: number): Promise<Buffer>;
}

/** One file in a zip: its uncompressed size, and its bytes, checked against the CRC the zip carries */
export interface ZipFile {
  name: string;
  size: number;
  read(): Promise<Buffer>;
}

/** Thrown for anything that is not a zip this reader understands */
export class BadZip extends Error {}

export const bufferSource = (buf: Buffer): ZipSource => ({ size: buf.length, read: async (start, end) => buf.subarray(start, end) });

/** The files in a zip, by name, read from its central directory: nothing but the directory is loaded */
export async function openZip(src: ZipSource): Promise<Map<string, ZipFile>> {
  // The end record is the last 22 bytes, unless a comment (up to 64 KB) follows it
  const tailStart = Math.max(0, src.size - 22 - 0xffff);
  const tail = await src.read(tailStart, src.size);
  let at = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === SIG.end) { at = i; break; }
  if (at < 0) throw new BadZip("no end of central directory");
  let count = tail.readUInt16LE(at + 10);
  let cdSize = tail.readUInt32LE(at + 12);
  let cdOffset = tail.readUInt32LE(at + 16);
  if (count === 0xffff || cdSize === MAX32 || cdOffset === MAX32) {
    const locatorAt = tailStart + at - 20;
    const locator = locatorAt >= 0 ? await src.read(locatorAt, locatorAt + 20) : null;
    if (!locator || locator.readUInt32LE(0) !== SIG.locator64) throw new BadZip("no ZIP64 locator");
    const end64At = Number(locator.readBigUInt64LE(8));
    const end64 = await src.read(end64At, end64At + 56);
    if (end64.readUInt32LE(0) !== SIG.end64) throw new BadZip("no ZIP64 end record");
    count = Number(end64.readBigUInt64LE(32));
    cdSize = Number(end64.readBigUInt64LE(40));
    cdOffset = Number(end64.readBigUInt64LE(48));
  }
  if (cdOffset + cdSize > src.size) throw new BadZip("central directory out of range");
  const cd = await src.read(cdOffset, cdOffset + cdSize);

  const files = new Map<string, ZipFile>();
  let p = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > cd.length || cd.readUInt32LE(p) !== SIG.central) throw new BadZip("bad central directory entry");
    const flags = cd.readUInt16LE(p + 8);
    const method = cd.readUInt16LE(p + 10);
    const crc = cd.readUInt32LE(p + 16);
    let compressed = cd.readUInt32LE(p + 20);
    let size = cd.readUInt32LE(p + 24);
    const nameLen = cd.readUInt16LE(p + 28), extraLen = cd.readUInt16LE(p + 30), commentLen = cd.readUInt16LE(p + 32);
    let offset = cd.readUInt32LE(p + 42);
    const name = cd.subarray(p + 46, p + 46 + nameLen).toString(flags & 0x0800 ? "utf8" : "latin1");
    // The ZIP64 extra field holds, in this order, whichever of the three did not fit in 32 bits
    const extra = cd.subarray(p + 46 + nameLen, p + 46 + nameLen + extraLen);
    for (let e = 0; e + 4 <= extra.length;) {
      const id = extra.readUInt16LE(e), len = extra.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === MAX32) { size = Number(extra.readBigUInt64LE(q)); q += 8; }
        if (compressed === MAX32) { compressed = Number(extra.readBigUInt64LE(q)); q += 8; }
        if (offset === MAX32) offset = Number(extra.readBigUInt64LE(q));
      }
      e += 4 + len;
    }
    p += 46 + nameLen + extraLen + commentLen;
    if (method !== 0 && method !== 8) throw new BadZip(`unsupported method ${method}`);
    if (flags & 0x0001) throw new BadZip("encrypted entry");
    files.set(name, {
      name, size,
      read: async () => {
        const local = await src.read(offset, offset + 30);
        if (local.length < 30 || local.readUInt32LE(0) !== SIG.local) throw new BadZip("bad local header");
        const start = offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
        const raw = await src.read(start, start + compressed);
        // The size the directory declares is the most a deflated entry may grow to
        const data = method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: Math.max(1, size) });
        if (data.length !== size || crc32(data) !== crc) throw new BadZip(`corrupt entry ${name}`);
        return data;
      },
    });
  }
  return files;
}
