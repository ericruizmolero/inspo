// Everything the library needs to show one workspace, in one call. Used by the library layout on a
// page load, and by /api/library so the client can have the other workspaces ready before a switch.
import "server-only";
import { listMembers } from "./workspace";
import { loadWorkspaceData } from "./items";
import { loadProjects } from "./projects";
import { TEMPLATE_AUTHOR } from "./template-seed";
import type { ProjectLinks } from "@/types/inspo";
import { loadSystems } from "./system";
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
  const [all, filed, systems, members, admin, quota, comments] = await Promise.all([
    loadWorkspaceData(ws.id),
    loadProjects(ws.id),
    loadSystems(ws.id),
    listMembers(ws.id),
    isAdmin(user.email),
    quotaStatus(ws),
    listComments(ws.id),
  ]);
  // A template is not one of the workspace's projects, and what only a template holds is not in its library: the
  // references a built-in template brought show up when a project is cloned from it, and not before
  const { projects } = filed;
  const real = new Set(projects.map((p) => p.id));
  const mine = (m: ProjectLinks): ProjectLinks => Object.fromEntries(Object.entries(m).map(([id, ps]) => [id, ps.filter((p) => real.has(p))] as const).filter(([, ps]) => ps.length));
  const links = mine(filed.links), shelf = mine(filed.shelf);
  const items = all.items.filter((i) => !(i.addedBy === TEMPLATE_AUTHOR && i.id && !links[i.id] && !shelf[i.id]));
  const shown = new Set(items.map((i) => i.web));
  const only = <T,>(m: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(m).filter(([web]) => shown.has(web)));
  const thumbnailMap = only(all.thumbnailMap), tagMap = only(all.tagMap), tagJobs = only(all.tagJobs);
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
    initialProjectShelf: shelf,
    initialSystems: systems,
    members: members.map((m) => ({ name: m.name, image: m.image ?? null })),
    isAdmin: admin,
    initialQuota: quota,
    initialComments: comments,
    initialDesignMdIndex: designMdIndex,
    initialPageShots: pageShots,
  };
}

export type LibraryData = Awaited<ReturnType<typeof loadLibrary>>;
