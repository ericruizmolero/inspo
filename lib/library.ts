// Everything the library needs to show one workspace, in one call. Used by the library layout on a
// page load, and by /api/library so the client can have the other workspaces ready before a switch.
import "server-only";
import { listMembers } from "./workspace";
import { loadWorkspaceData } from "./items";
import { loadProjects } from "./projects";
import { isAdmin } from "./activity";
import { quotaStatus } from "./quota";
import { listComments } from "./comments";
import { designMdIndexFor, getDesignMdIndex } from "./design-store";
import { getPageIndex, pageShotsFor, signCanvasCopies } from "./page-shots";
import type { SessionUser, Workspace } from "./workspace-core";

export async function loadLibrary(user: SessionUser, ws: Workspace) {
  // Both shared indexes (R2) are read while the database answers; they are cached, so the calls below reuse them
  const pages = getPageIndex();
  void getDesignMdIndex();
  const [{ items, thumbnailMap, tagMap, tagJobs }, { projects, links }, members, admin, quota, comments] = await Promise.all([
    loadWorkspaceData(ws.id),
    loadProjects(ws.id),
    listMembers(ws.id),
    isAdmin(user.email),
    quotaStatus(ws),
    listComments(ws.id),
  ]);
  // The workspace's addresses are already here: neither index needs to ask the database for them again
  const webs = new Set(items.map((i) => i.web));
  const designMdIndex = await designMdIndexFor(ws.id, webs);
  // A site's DESIGN.md capture comes before a capture of its own
  const pageShots = await signCanvasCopies(await pageShotsFor(ws.id, designMdIndex, await pages, webs));
  return {
    workspace: ws,
    items,
    initialThumbnailMap: thumbnailMap,
    initialTagMap: tagMap,
    initialTagJobs: tagJobs,
    initialProjects: projects,
    initialProjectLinks: links,
    members: members.map((m) => ({ name: m.name, image: m.image ?? null })),
    isAdmin: admin,
    initialQuota: quota,
    initialComments: comments,
    initialDesignMdIndex: designMdIndex,
    initialPageShots: pageShots,
  };
}

export type LibraryData = Awaited<ReturnType<typeof loadLibrary>>;
