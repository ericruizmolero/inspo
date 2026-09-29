// Copies the files in R2 down to .data/files, so the local app shows the images of the
// production copy without holding R2 keys (with them, a local delete would delete the real file).
// Read-only on R2. Files already here are skipped, so running it again only brings the new ones.
//   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… npm run files:pull
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { promises as fs } from "fs";
import path from "path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const ROOT = path.join(process.cwd(), ".data", "files");

async function main() {
  const { R2_ACCOUNT_ID, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !(R2_ACCOUNT_ID || R2_ENDPOINT)) {
    throw new Error("Set R2_ACCOUNT_ID (or R2_ENDPOINT), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET");
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  });

  let pulled = 0, skipped = 0, bytes = 0, token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    for (const o of page.Contents ?? []) {
      if (!o.Key || o.Key.split("/").includes("..")) continue;
      const file = path.join(ROOT, ...o.Key.split("/"));
      try {
        const st = await fs.stat(file);
        if (st.size === o.Size) { skipped++; continue; }
      } catch { /* not here yet */ }
      const r = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: o.Key }));
      const body = Buffer.from(await r.Body!.transformToByteArray());
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      pulled++; bytes += body.length;
      if (pulled % 50 === 0) console.log(`  ${pulled} pulled…`);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  console.log(`${pulled} files pulled (${(bytes / 1024 / 1024).toFixed(1)} MB), ${skipped} already here → .data/files`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
