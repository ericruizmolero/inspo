// Deleting a workspace: every row and every file it left, and nothing else. The one way in: the app's action
// (app/actions/workspace.ts) and scripts/delete-workspace.ts; Better Auth's own endpoint is off (lib/auth.ts).
//
// The database goes first, in one transaction: the organization row, whose foreign keys cascade to items,
// projects, comments, revisions, members, invitations and keys, and set null on failure, activity and
// feedback rows. AI spend stays for the accounts (migration 0038). Then the rows that name the workspace by
// a key rather than a foreign key. Then storage, by prefix. Each step converges: run again on the same id, it
// finds nothing in the database and deletes whatever files are left, so a cleanup cut halfway is run again.
import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { listFiles, deleteFiles } from "./storage";
import { whyShotPrefix } from "./design-store";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { recordFailure } from "./log";

/** Every storage prefix that holds this workspace's files and no one else's */
export const workspacePrefixes = (organizationId: string) => [`inspo/${organizationId}/`, whyShotPrefix(organizationId)];

export interface DeleteResult {
  /** Files found under the workspace's prefixes and deleted */
  files: number;
  /** False when a file was still there after the delete: running deleteWorkspace again finishes it */
  storageClean: boolean;
}

/** Deletes the workspace `organizationId`. A personal space is refused (HttpError 403); a missing one is not an error */
export async function deleteWorkspace(organizationId: string): Promise<DeleteResult> {
  const O = schema.organization;
  await db.transaction(async (tx) => {
    const [org] = await tx.select({ kind: O.kind }).from(O).where(eq(O.id, organizationId)).for("update");
    // The personal space is where a person lands with no team
    if (org?.kind === "personal") throw new HttpError(403, (await getErrors()).personalSpaceStays);
    await tx.delete(O).where(eq(O.id, organizationId));
    // After the delete: the cascade's own triggers write a tombstone per item and comment
    await tx.delete(schema.libraryTombstone).where(eq(schema.libraryTombstone.organizationId, organizationId));
    const claim = schema.captureClaim.key, limit = schema.rateLimit.key;
    await tx.delete(schema.captureClaim).where(or(
      sql`starts_with(${claim}, ${`system:${organizationId}|`})`, sql`starts_with(${claim}, ${`brand:${organizationId}|`})`));
    // "app:shot:<id>", "app:ext:ws:<id>": the per-workspace counters of lib/rate-limit.ts
    await tx.delete(schema.rateLimit).where(and(sql`starts_with(${limit}, 'app:')`, sql`right(${limit}, ${organizationId.length + 1}) = ${`:${organizationId}`}`));
    await tx.update(schema.session).set({ activeOrganizationId: null }).where(eq(schema.session.activeOrganizationId, organizationId));
  });

  let files = 0, storageClean = true;
  for (const prefix of workspacePrefixes(organizationId)) {
    try {
      const keys = (await listFiles(prefix)).map((f) => f.key);
      files += keys.length;
      await deleteFiles(keys);
      // deleteFiles never throws: what is still listed is what it could not delete
      const left = await listFiles(prefix);
      if (left.length) throw new Error(`${left.length} files left under ${prefix}`);
    } catch (err) {
      storageClean = false;
      // The prefix names the workspace; its id as organizationId would fail the foreign key now
      void recordFailure("storage", "workspace files", err, { organizationId: null, ref: prefix });
    }
  }
  return { files, storageClean };
}
