// Everything the library needs to show one workspace, in one call. Used by the library layout on a
// page load, and by /api/library so the client can have the other workspaces ready before a switch.
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { listMembers } from "./workspace";
import { loadWorkspaceData } from "./items";
import { loadProjects } from "./projects";
import { TEMPLATE_AUTHOR } from "./template-seed";
import type { ProjectLinks } from "@/types/inspo";
import { loadSystems } from "./system";
import { isAdmin } from "./activity";
import { quotaStatus } from "./quota";
import { listComments } from "./comments";
import { listVotes } from "./polish-votes";
import { designDocsFor } from "./design-store";
import { pageShotsFor, signCanvasCopies } from "./page-shots";
import type { SessionUser, Workspace } from "./workspace-core";

export async function loadLibrary(user: SessionUser, ws: Workspace) {
  // Taken before reading: whatever changes while this loads makes the next look differ, and loads again
  const stamp = await libraryStamp(ws.id);
  const [all, filed, systems, members, admin, quota, comments, votes] = await Promise.all([
    loadWorkspaceData(ws.id),
    loadProjects(ws.id),
    loadSystems(ws.id),
    listMembers(ws.id),
    isAdmin(user.email),
    quotaStatus(ws),
    listComments(ws.id),
    listVotes(ws.id),
  ]);
  // A template is not one of the workspace's projects, and what only a template holds is not in its library: the
  // references a built-in template brought show up when a project is cloned from it, and not before
  const { projects } = filed;
  const real = new Set(projects.map((p) => p.id));
  const mine = (m: ProjectLinks): ProjectLinks => Object.fromEntries(Object.entries(m).map(([id, ps]) => [id, ps.filter((p) => real.has(p))] as const).filter(([, ps]) => ps.length));
  const links = mine(filed.links);
  const items = all.items.filter((i) => !(i.addedBy === TEMPLATE_AUTHOR && i.id && !links[i.id]));
  const shown = new Set(items.map((i) => i.web));
  const only = <T,>(m: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(m).filter(([web]) => shown.has(web)));
  const thumbnailMap = only(all.thumbnailMap), tagMap = only(all.tagMap), tagJobs = only(all.tagJobs);
  const webs = items.map((i) => i.web);
  const [designMdIndex, pageShots] = await Promise.all([designDocsFor(webs), pageShotsFor(webs).then(signCanvasCopies)]);
  return {
    workspace: ws,
    stamp,
    items,
    initialThumbnailMap: thumbnailMap,
    initialTagMap: tagMap,
    initialTagJobs: tagJobs,
    initialProjects: projects,
    initialProjectLinks: links,
    initialSystems: systems,
    members: members.map((m) => ({ id: m.userId, name: m.name, image: m.image ?? null })),
    initialPolishVotes: votes.filter((v) => real.has(v.projectId)),
    isAdmin: admin,
    initialQuota: quota,
    initialComments: comments,
    initialDesignMdIndex: designMdIndex,
    initialPageShots: pageShots,
  };
}

export type LibraryData = Awaited<ReturnType<typeof loadLibrary>>;

/** What the board shows, in one short string: how many items, links and projects, and the last time any of them
 *  changed. An add, a delete, an edit, tags arriving, a filing or a new project all change it. One query on
 *  the workspace's indexes: the open board asks for it every 15 s (/api/library/changes). */
export async function libraryStamp(organizationId: string): Promise<string> {
  const { rows } = await db.execute<{ stamp: string }>(sql`select concat_ws('|',
    (select concat_ws(':', count(*), max(updated_at)) from inspo_item where organization_id = ${organizationId}),
    (select concat_ws(':', count(*), count(archived_at), max(created_at), max(archived_at)) from project_item where organization_id = ${organizationId}),
    (select concat_ws(':', count(*), max(updated_at)) from project where organization_id = ${organizationId} and template is null),
    (select concat_ws(':', count(*), max(updated_at)) from polish_vote where organization_id = ${organizationId})
  ) as stamp`);
  return rows[0]?.stamp ?? "";
}
