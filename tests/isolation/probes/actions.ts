import { expect } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { files } from "../../harness";
import { asB, expectNoSecret, expectRefused, itemRow, type Surface } from "../probe";
import type { Fixture } from "../fixture";

const projectRow = async (id: string) => (await db.select().from(schema.project).where(eq(schema.project.id, id)))[0];
const filed = (projectId: string) => db.select().from(schema.projectItem).where(eq(schema.projectItem.projectId, projectId));
const votes = (projectId: string) => db.select().from(schema.polishVote).where(eq(schema.polishVote.projectId, projectId));
const shares = (projectId: string) => db.select().from(schema.systemShare).where(eq(schema.systemShare.projectId, projectId));
const commentRow = async (id: string) => (await db.select().from(schema.inspoComment).where(eq(schema.inspoComment.id, id)))[0];
const unique = (fx: Fixture) => `https://${fx.b.owner.id}-${Math.random().toString(36).slice(2, 8)}.example.com`;

/** A write B attempted on A's project: whatever it answered, A's project and its board are as they were */
async function projectKept(fx: Fixture, projectId: string, write: () => Promise<unknown>, step: string) {
  const before = { row: await projectRow(projectId), board: await filed(projectId), votes: await votes(projectId) };
  expectNoSecret(fx, await write(), step);
  expect({ row: await projectRow(projectId), board: await filed(projectId), votes: await votes(projectId) }, `${step}: A's project unchanged`).toEqual(before);
}

/** A write B attempted on A's item, refused, with the row as it was */
async function itemKept(fx: Fixture, itemId: string, write: () => Promise<unknown>, step: string) {
  const before = await itemRow(itemId);
  expectRefused(fx, await write(), step);
  expect(await itemRow(itemId), `${step}: A's item unchanged`).toEqual(before);
}

const notAdmin = (call: (m: typeof import("@/app/actions/admin")) => Promise<unknown>): Surface => ({
  probe: async (fx) => {
    asB(fx);
    expectRefused(fx, await call(await import("@/app/actions/admin")), "B is not an app admin");
  },
});

export const actions: Record<string, Surface> = {
  "action:app/actions/access.ts#joinWaitlistFromLogin": { exempt: "public waitlist sign-up: takes an email, no session and no workspace id" },

  "action:app/actions/admin.ts#grantAccess": notAdmin((m) => m.grantAccess("someone@example.test")),
  "action:app/actions/admin.ts#revokeAccess": notAdmin((m) => m.revokeAccess("someone@example.test")),
  "action:app/actions/admin.ts#setSignupMode": notAdmin((m) => m.setSignupMode("open")),
  "action:app/actions/admin.ts#deleteFeedback": notAdmin((m) => m.deleteFeedback(["x"])),
  "action:app/actions/admin.ts#resolveFeedback": notAdmin((m) => m.resolveFeedback(["x"], true)),

  "action:app/actions/brief.ts#saveProjectBrief": {
    probe: async (fx) => {
      const { saveProjectBrief } = await import("@/app/actions/brief");
      asB(fx);
      await projectKept(fx, fx.a.project, async () => {
        const r = await saveProjectBrief(fx.a.project, { about: "b" });
        expectRefused(fx, r, "A's brief is not B's to write");
        return r;
      }, "save A's brief");
    },
  },
  "action:app/actions/brief.ts#setProjectClient": {
    probe: async (fx) => {
      const { setProjectClient } = await import("@/app/actions/brief");
      asB(fx);
      await projectKept(fx, fx.a.project, async () => {
        const r = await setProjectClient(fx.a.project, fx.a.item);
        expectRefused(fx, r, "A's project's client is not B's to set");
        return r;
      }, "set A's client");
      expectRefused(fx, await setProjectClient(fx.b.project, fx.a.item), "A's item is not a client B's project can name");
    },
  },

  "action:app/actions/ext-keys.ts#createKey": {
    probe: async (fx) => {
      const { createKey } = await import("@/app/actions/ext-keys");
      asB(fx);
      expectRefused(fx, await createKey(fx.a.team, "b"), "no key opens A's team for B");
    },
  },
  "action:app/actions/ext-keys.ts#revokeKey": {
    probe: async (fx) => {
      const { revokeKey } = await import("@/app/actions/ext-keys");
      const key = () => db.select().from(schema.extKey).where(eq(schema.extKey.id, fx.a.extKeyId));
      asB(fx);
      expectRefused(fx, await revokeKey(fx.a.extKeyId), "B cannot revoke A's key");
      expect((await key())[0].revokedAt, "A's key still works").toBeNull();
    },
  },

  "action:app/actions/library.ts#addInspo": {
    probe: async (fx) => {
      const { addInspo } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => addInspo({ web: unique(fx), name: "b", type: "web", projectId: fx.a.project }), "a site B adds does not land on A's board");
    },
  },
  "action:app/actions/library.ts#readBoardAction": { exempt: "reads a public board on Are.na, Pinterest or Cosmos by its address; takes no workspace id and saves nothing" },
  "action:app/actions/library.ts#importBatch": {
    probe: async (fx) => {
      const { importBatch } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => importBatch(fx.a.project, [{ kind: "text", text: "b", page: unique(fx) }]), "an import B runs does not land on A's board");
    },
  },
  "action:app/actions/library.ts#boardProject": {
    probe: async (fx) => {
      const { boardProject } = await import("@/app/actions/library");
      const name = (await projectRow(fx.a.project)).name;
      asB(fx, fx.a.team);
      const r = await boardProject(name);
      expect(r.ok, "B gets a project of its own").toBe(true);
      if (!r.ok) return;
      expect((await projectRow(r.data.id)).organizationId, "named as A's, the board's project is B's").toBe(fx.b.team);
      // It carries A's name, which later probes must not find in B's answers
      await db.delete(schema.project).where(eq(schema.project.id, r.data.id));
    },
  },
  "action:app/actions/library.ts#newProject": {
    probe: async (fx) => {
      const { newProject } = await import("@/app/actions/library");
      asB(fx, fx.a.team);
      const r = await newProject("b");
      expect(r.ok, "B makes a project").toBe(true);
      if (r.ok) expect((await projectRow(r.data.id)).organizationId, "with A's team active, the project is made in B's").toBe(fx.b.team);
    },
  },
  "action:app/actions/library.ts#markProjectStarted": {
    probe: async (fx) => {
      const { markProjectStarted } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => markProjectStarted(fx.a.project), "B cannot start A's project");
    },
  },
  "action:app/actions/library.ts#editProject": {
    probe: async (fx) => {
      const { editProject } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, async () => {
        const r = await editProject(fx.a.project, "b");
        expectRefused(fx, r, "B cannot rename A's project");
        return r;
      }, "rename A's project");
    },
  },
  "action:app/actions/library.ts#removeProject": {
    probe: async (fx) => {
      const { removeProject } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => removeProject(fx.a.project), "B cannot delete A's project");
      expect(files.has(fx.a.keys.brand), "A's brand files stay").toBe(true);
    },
  },
  "action:app/actions/library.ts#setFiled": {
    probe: async (fx) => {
      const { setFiled } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => setFiled(fx.a.project, [fx.a.item, fx.a.media], false), "B cannot take A's items off A's board");
      await projectKept(fx, fx.a.project, () => setFiled(fx.a.project, [fx.b.item], true), "B cannot file its item on A's board");
      await setFiled(fx.b.project, [fx.a.item], true);
      expect((await filed(fx.b.project)).map((r) => r.itemId), "A's item cannot be filed on B's board").not.toContain(fx.a.item);
    },
  },
  "action:app/actions/library.ts#votePolish": {
    probe: async (fx) => {
      const { votePolish } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => votePolish(fx.a.project, [fx.a.item, fx.a.media], "forget"), "B's vote does not reach A's board");
    },
  },
  "action:app/actions/library.ts#closeProjectPolish": {
    probe: async (fx) => {
      const { closeProjectPolish } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => closeProjectPolish(fx.a.project, { [fx.a.item]: "forget" }), "B cannot close A's polish");
    },
  },
  "action:app/actions/library.ts#restoreToBoard": {
    probe: async (fx) => {
      const { restoreToBoard } = await import("@/app/actions/library");
      asB(fx);
      await projectKept(fx, fx.a.project, () => restoreToBoard(fx.a.project, fx.a.item), "B cannot restore on A's board");
      await projectKept(fx, fx.a.project, () => restoreToBoard(fx.b.project, fx.a.item), "A's item cannot be restored to B's board");
      expect((await filed(fx.b.project)).map((r) => r.itemId), "A's item is not on B's board").not.toContain(fx.a.item);
    },
  },
  "action:app/actions/library.ts#addImage": {
    probe: async (fx) => {
      const { addImage } = await import("@/app/actions/library");
      asB(fx);
      expectRefused(fx, await addImage({ url: `/api/files/${fx.a.keys.media}` }), "A's uploaded image is not B's to save");
    },
  },
  "action:app/actions/library.ts#removeInspo": {
    probe: async (fx) => {
      const { removeInspo } = await import("@/app/actions/library");
      const before = await itemRow(fx.a.media);
      asB(fx);
      expectNoSecret(fx, await removeInspo(fx.a.media), "B cannot remove A's card");
      expect(await itemRow(fx.a.media), "A's card stays").toEqual(before);
      expect(files.has(fx.a.keys.media), "A's image file stays").toBe(true);
    },
  },
  "action:app/actions/library.ts#removeInspos": {
    probe: async (fx) => {
      const { removeInspos } = await import("@/app/actions/library");
      asB(fx);
      const r = await removeInspos([fx.a.item, fx.a.text]);
      expect(r, "none of A's cards count as B's").toEqual({ ok: true, data: 0 });
      expect(await itemRow(fx.a.item), "A's card stays").toBeDefined();
      expect(await itemRow(fx.a.text), "A's text stays").toBeDefined();
      expect(files.has(fx.a.keys.text), "A's text file stays").toBe(true);
    },
  },
  "action:app/actions/library.ts#postComment": {
    probe: async (fx) => {
      const { postComment } = await import("@/app/actions/library");
      const thread = () => db.select().from(schema.inspoComment).where(eq(schema.inspoComment.itemId, fx.a.item));
      const before = await thread();
      asB(fx);
      expectRefused(fx, await postComment(fx.a.item, "b", []), "B cannot comment on A's item");
      expectRefused(fx, await postComment(fx.b.item, "b", [], fx.a.comment), "B cannot reply to A's comment from its own item");
      expectRefused(fx, await postComment(fx.b.item, "", [{ url: `/api/files/${fx.a.keys.comment}`, w: 1, h: 1 }]), "A's screenshot is not an attachment B can post");
      expect(await thread(), "A's thread unchanged").toEqual(before);
    },
  },
  "action:app/actions/library.ts#removeComment": {
    probe: async (fx) => {
      const { removeComment } = await import("@/app/actions/library");
      asB(fx);
      expectRefused(fx, await removeComment(fx.a.comment), "B cannot delete A's comment");
      expect(await commentRow(fx.a.comment), "A's comment stays").toBeDefined();
      expect(files.has(fx.a.keys.comment), "its screenshot stays").toBe(true);
    },
  },
  "action:app/actions/library.ts#editNote": {
    probe: async (fx) => {
      const { editNote } = await import("@/app/actions/library");
      asB(fx);
      await itemKept(fx, fx.a.item, () => editNote(fx.a.item, "note", "b"), "B cannot edit A's note");
    },
  },
  "action:app/actions/library.ts#setLanguage": { exempt: "the interface language: a cookie and the signed-in user's own row, no workspace id" },
  "action:app/actions/library.ts#workspaceOfItem": {
    probe: async (fx) => {
      const { workspaceOfItem } = await import("@/app/actions/library");
      asB(fx);
      expect(await workspaceOfItem(fx.a.item), "A's item does not name A's team to B").toEqual({ ok: true, data: null });
    },
  },
  "action:app/actions/library.ts#editTags": {
    probe: async (fx) => {
      const { editTags } = await import("@/app/actions/library");
      asB(fx);
      await itemKept(fx, fx.a.item, () => editTags(fx.a.item, { add: "b" }), "B cannot tag A's item");
    },
  },

  "action:app/actions/mcp.ts#answerMcpAuth": { exempt: "the OAuth consent answer: a grant for the signed-in user, keyed by the client's request, no workspace id" },
  "action:app/actions/mcp.ts#loadConnections": {
    probe: async (fx) => {
      const { loadConnections } = await import("@/app/actions/mcp");
      asB(fx, fx.a.team);
      expectNoSecret(fx, await loadConnections(), "B's connected apps carry none of A's");
    },
  },
  "action:app/actions/mcp.ts#disconnectApp": { exempt: "revokes a grant filtered by the signed-in user's id, no workspace id" },

  "action:app/actions/notifications.ts#setEmailPreference": { exempt: "the signed-in user's own email switches, no workspace id" },
  "action:app/actions/notifications.ts#resubscribe": {
    probe: async (fx) => {
      const { resubscribe } = await import("@/app/actions/notifications");
      const user = () => db.select().from(schema.user).where(eq(schema.user.id, fx.a.owner.id));
      const before = await user();
      asB(fx);
      expect(await resubscribe(fx.a.owner.id, "digest", "forged"), "a forged link does not reach A's owner").toBe(false);
      expect(await user(), "A's owner unchanged").toEqual(before);
    },
  },
  "action:app/actions/notifications.ts#teamActivityFeed": {
    probe: async (fx) => {
      const { teamActivityFeed } = await import("@/app/actions/notifications");
      asB(fx, fx.a.team);
      expectNoSecret(fx, await teamActivityFeed(), "with A's team active, the bell shows B's own");
    },
  },
  "action:app/actions/notifications.ts#teamActivitySeen": {
    probe: async (fx) => {
      const { teamActivitySeen } = await import("@/app/actions/notifications");
      const member = () => db.select().from(schema.member).where(and(eq(schema.member.organizationId, fx.a.team), eq(schema.member.userId, fx.a.owner.id)));
      const before = await member();
      asB(fx, fx.a.team);
      await teamActivitySeen();
      expect(await member(), "A's bell unchanged").toEqual(before);
    },
  },

  "action:app/actions/share.ts#loadShares": {
    probe: async (fx) => {
      const { loadShares } = await import("@/app/actions/share");
      asB(fx);
      expectRefused(fx, await loadShares(fx.a.project), "B cannot list A's share links");
    },
  },
  "action:app/actions/share.ts#makeShare": {
    probe: async (fx) => {
      const { makeShare } = await import("@/app/actions/share");
      const before = await shares(fx.a.project);
      asB(fx);
      expectRefused(fx, await makeShare(fx.a.project, "full", "b"), "B cannot share A's project");
      expect(await shares(fx.a.project), "no new link to A's project").toEqual(before);
    },
  },
  "action:app/actions/share.ts#stopShare": {
    probe: async (fx) => {
      const { stopShare } = await import("@/app/actions/share");
      const before = await shares(fx.a.project);
      asB(fx);
      expectRefused(fx, await stopShare(fx.a.project, fx.a.share), "B cannot turn off A's link");
      expectNoSecret(fx, await stopShare(fx.b.project, fx.a.share), "nor through its own project");
      expect(await shares(fx.a.project), "A's link still live").toEqual(before);
    },
  },

  "action:app/actions/templates.ts#loadTemplates": {
    probe: async (fx) => {
      const { loadTemplates } = await import("@/app/actions/templates");
      asB(fx, fx.a.team);
      expectNoSecret(fx, await loadTemplates(), "B's templates carry none of A's");
    },
  },
  "action:app/actions/templates.ts#startFromTemplate": {
    probe: async (fx) => {
      const { startFromTemplate } = await import("@/app/actions/templates");
      asB(fx);
      expectRefused(fx, await startFromTemplate(fx.a.template, "b"), "B cannot start from A's template");
    },
  },
  "action:app/actions/templates.ts#loadRecipe": {
    probe: async (fx) => {
      const { loadRecipe } = await import("@/app/actions/templates");
      asB(fx);
      expectRefused(fx, await loadRecipe(fx.a.template), "B cannot read A's recipe");
    },
  },
  "action:app/actions/templates.ts#saveRecipe": {
    probe: async (fx) => {
      const { saveRecipe } = await import("@/app/actions/templates");
      asB(fx);
      await projectKept(fx, fx.a.template, async () => {
        const r = await saveRecipe(fx.a.template, "b");
        expectRefused(fx, r, "B cannot write A's recipe");
        return r;
      }, "write A's recipe");
    },
  },
  "action:app/actions/templates.ts#removeTemplate": {
    probe: async (fx) => {
      const { removeTemplate } = await import("@/app/actions/templates");
      asB(fx);
      await projectKept(fx, fx.a.template, () => removeTemplate(fx.a.template), "B cannot delete A's template");
    },
  },

  "action:app/actions/text.ts#addText": {
    probe: async (fx) => {
      const { addText } = await import("@/app/actions/text");
      asB(fx);
      await projectKept(fx, fx.a.project, () => addText({ title: "b", text: "b", projectId: fx.a.project }), "a text B pastes does not land on A's board");
    },
  },
  "action:app/actions/text.ts#saveText": {
    probe: async (fx) => {
      const { saveText } = await import("@/app/actions/text");
      const before = files.get(fx.a.keys.text);
      asB(fx);
      await itemKept(fx, fx.a.text, () => saveText(fx.a.text, "b"), "B cannot rewrite A's text");
      expect(files.get(fx.a.keys.text), "A's words unchanged").toEqual(before);
    },
  },
  "action:app/actions/text.ts#renameText": {
    probe: async (fx) => {
      const { renameText } = await import("@/app/actions/text");
      asB(fx);
      await itemKept(fx, fx.a.text, () => renameText(fx.a.text, "b"), "B cannot rename A's text");
    },
  },
  "action:app/actions/text.ts#readTexts": {
    probe: async (fx) => {
      const { readTexts } = await import("@/app/actions/text");
      asB(fx, fx.a.team);
      expect(await readTexts([fx.a.text]), "A's words do not come back to B").toEqual({ ok: true, data: {} });
    },
  },

  "action:app/actions/workspace.ts#setOutputLanguage": {
    probe: async (fx) => {
      const { setOutputLanguage } = await import("@/app/actions/workspace");
      const team = () => db.select().from(schema.organization).where(eq(schema.organization.id, fx.a.team));
      const before = await team();
      asB(fx);
      expectRefused(fx, await setOutputLanguage(fx.a.team, "es"), "B cannot set A's output language");
      expect(await team(), "A's team unchanged").toEqual(before);
    },
  },
};
