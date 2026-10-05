"use client";
// Uploading a file of the brand from the browser: straight to the storage with a signed URL when there is one, through
// the app otherwise (files on disk, or a refused PUT for a small file), then checked by the server before use.
import type { BrandFile } from "@/types/brand";
import type { UploadPurpose } from "./context";
import { attachBrandFile } from "@/app/actions/brand";

const VIA_APP_MAX = 4 * 1024 * 1024;

export async function uploadBrandFile(projectId: string, file: File, purpose: UploadPurpose): Promise<BrandFile> {
  const ask = await fetch("/api/system/brand/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, purpose, name: file.name, size: file.size }) });
  const slot = (await ask.json().catch(() => ({}))) as { key?: string; type?: string; put?: string | null; error?: string };
  if (!ask.ok || !slot.key || !slot.type) throw new Error(slot.error ?? `Error ${ask.status}`);
  let key = slot.key, type = slot.type;
  let sent = false;
  if (slot.put) {
    try {
      const put = await fetch(slot.put, { method: "PUT", headers: { "Content-Type": type }, body: file });
      sent = put.ok;
      if (!put.ok && file.size > VIA_APP_MAX) throw new Error(`Error ${put.status}`);
    } catch (e) { if (file.size > VIA_APP_MAX) throw e; }
  }
  if (!sent) {
    const fd = new FormData();
    fd.append("projectId", projectId); fd.append("purpose", purpose); fd.append("file", file);
    const res = await fetch("/api/system/brand/upload", { method: "POST", body: fd });
    const got = (await res.json().catch(() => ({}))) as { key?: string; type?: string; error?: string };
    if (!res.ok || !got.key || !got.type) throw new Error(got.error ?? `Error ${res.status}`);
    key = got.key; type = got.type;
  }
  const r = await attachBrandFile(projectId, key, type, file.name);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}
