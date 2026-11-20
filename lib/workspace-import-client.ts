// Importing an export's zip from the browser (Settings, Workspace), through app/api/workspace/import: it asks for a
// slot, PUTs the zip straight to R2 and has the app import that upload. With files on disk there is no slot to PUT
// to, and then, or when the PUT cannot be made and the zip is small enough for a function, the zip is posted to the
// app. A failure is an Error, or a PlanLimitError for a plan's limit (lib/plan-limit.ts).
import { failureOf } from "./plan-limit";

const ROUTE = "/api/workspace/import";
/** What a function takes on Vercel is 4.5 MB */
const VIA_APP_MAX = 4 * 1024 * 1024;

export interface Imported { id: string; name: string }

async function post<T>(body: BodyInit, type: string): Promise<T> {
  const res = await fetch(ROUTE, { method: "POST", headers: { "Content-Type": type }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw failureOf(data, `Error ${res.status}`);
  return data as T;
}

/** The zip as a new workspace on the open workspace's plan */
export async function importWorkspaceZip(file: File): Promise<Imported> {
  const slot = await post<{ key: string; put: string | null }>(JSON.stringify({ size: file.size }), "application/json");
  if (slot.put) {
    let uploaded = false;
    try {
      uploaded = (await fetch(slot.put, { method: "PUT", headers: { "Content-Type": "application/zip" }, body: file })).ok;
    } catch (e) {
      // The bucket's CORS rules or a blocked request ("Failed to fetch"): through the app, if it fits
      if (file.size > VIA_APP_MAX) throw e;
    }
    if (uploaded) return post<Imported>(JSON.stringify({ key: slot.key }), "application/json");
    if (file.size > VIA_APP_MAX) throw new Error("upload failed");
  }
  return post<Imported>(file, "application/zip");
}
