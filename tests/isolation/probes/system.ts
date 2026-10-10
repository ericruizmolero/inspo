import { expect } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { files } from "../../harness";
import type { Fixture } from "../fixture";
import { asB, expectDenied, expectNoSecret, expectRefused, itemRow, params, request, withKeys, type Surface } from "../probe";

/** Everything A's shared project keeps of its system, to compare before and after a write B attempted */
async function aSystem(fx: Fixture) {
  const p = fx.a.project;
  const [head, areas, comments, revisions] = await Promise.all([
    db.select().from(schema.projectSystem).where(eq(schema.projectSystem.projectId, p)),
    db.select().from(schema.systemArea).where(eq(schema.systemArea.projectId, p)),
    db.select().from(schema.systemAreaComment).where(eq(schema.systemAreaComment.projectId, p)),
    db.select().from(schema.systemAreaRevision).where(eq(schema.systemAreaRevision.projectId, p)),
  ]);
  return { head, areas, comments, revisions };
}

/** B attempts `write` on A's system; nothing of A's system may change */
async function unchanged(fx: Fixture, write: () => Promise<void>) {
  const before = await aSystem(fx);
  await write();
  expect(await aSystem(fx), "A's system is as it was").toEqual(before);
}

/** The evidence of an area of B's own project, to check no A item got in */
const bEvidence = async (fx: Fixture, area: string) =>
  JSON.stringify((await db.select({ evidence: schema.systemArea.evidence }).from(schema.systemArea)
    .where(and(eq(schema.systemArea.projectId, fx.b.project), eq(schema.systemArea.area, area))))[0]?.evidence ?? []);

const aFiles = (fx: Fixture) => [...files.keys()].filter((k) => k.startsWith(`inspo/${fx.a.team}/`)).sort();

const sys = () => import("@/app/actions/system");
const talk = () => import("@/app/actions/area-comments");
const brand = () => import("@/app/actions/brand");

export const system: Record<string, Surface> = {
  "action:app/actions/system.ts#loadSystem": {
    probe: async (fx) => {
      asB(fx);
      for (const id of [fx.a.project, fx.a.hidden]) expectNoSecret(fx, await (await sys()).loadSystem(id), `A's system ${id} reads as empty`);
    },
  },
  "action:app/actions/system.ts#decideSystemArea": {
    probe: async (fx) => {
      asB(fx);
      const { decideSystemArea } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await decideSystemArea(fx.a.project, "color", { decision: "b" }), "deciding an area of A's project"));
      await unchanged(fx, async () => expectRefused(fx, await decideSystemArea(fx.a.project, "color", { decision: "" }), "emptying an area of A's project"));
      const own = await decideSystemArea(fx.b.project, "layout", { decision: "b", evidence: [{ itemId: fx.a.item, take: "t" }, { itemId: fx.b.item, take: "t" }] });
      expect(own.ok, "B decides its own area").toBe(true);
      expectNoSecret(fx, own, "B's decision with A's evidence");
      expect(await bEvidence(fx, "layout"), "A's reference is not evidence in B's project").not.toContain(fx.a.item);
    },
  },
  "action:app/actions/system.ts#setSystemNever": {
    probe: async (fx) => {
      asB(fx);
      const { setSystemNever } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await setSystemNever(fx.a.project, "color", "b"), "a never line on A's area"));
    },
  },
  "action:app/actions/system.ts#releaseSystemArea": {
    probe: async (fx) => {
      asB(fx);
      const { releaseSystemArea } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await releaseSystemArea(fx.a.project, "color"), "releasing A's decided area"));
    },
  },
  "action:app/actions/system.ts#loadSystemVisuals": {
    probe: async (fx) => {
      asB(fx);
      const res = await (await sys()).loadSystemVisuals(fx.a.project);
      expectNoSecret(fx, res, "the visuals of A's board");
      expect(JSON.stringify(res), "no reference of A's board").not.toContain(fx.a.prefix);
    },
  },
  "action:app/actions/system.ts#undoSystemArea": {
    probe: async (fx) => {
      asB(fx);
      const { undoSystemArea } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await undoSystemArea(fx.a.project, "color"), "undoing A's area"));
    },
  },
  "action:app/actions/system.ts#loadSystemHistory": {
    probe: async (fx) => {
      asB(fx);
      expectNoSecret(fx, await (await sys()).loadSystemHistory(fx.a.project), "the history of A's areas");
    },
  },
  "action:app/actions/system.ts#assignSystemArea": {
    probe: async (fx) => {
      asB(fx);
      const { assignSystemArea } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await assignSystemArea(fx.a.project, "color", fx.a.item, false), "taking A's reference out of A's area"));
      expectRefused(fx, await assignSystemArea(fx.b.project, "color", fx.a.item, true), "A's reference into B's own area");
      expect(await bEvidence(fx, "color"), "A's reference is not evidence in B's project").not.toContain(fx.a.item);
    },
  },
  "action:app/actions/system.ts#setSystemEvidence": {
    probe: async (fx) => {
      asB(fx);
      const { setSystemEvidence } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await setSystemEvidence(fx.a.project, "color", []), "emptying the evidence of A's area"));
      expectNoSecret(fx, await setSystemEvidence(fx.b.project, "type", [{ itemId: fx.a.item, take: "t" }]), "A's reference as evidence in B's project");
      expect(await bEvidence(fx, "type"), "A's reference is not evidence in B's project").not.toContain(fx.a.item);
    },
  },
  "action:app/actions/system.ts#setSystemVerdict": {
    probe: async (fx) => {
      asB(fx);
      const { setSystemVerdict } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await setSystemVerdict(fx.a.project, "color", { id: "c1", keep: false }), "a verdict on A's area"));
    },
  },
  "action:app/actions/system.ts#saveSystemSummary": {
    probe: async (fx) => {
      asB(fx);
      const { saveSystemSummary } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await saveSystemSummary(fx.a.project, "b"), "rewriting A's summary"));
    },
  },
  "action:app/actions/system.ts#saveDocPart": {
    probe: async (fx) => {
      asB(fx);
      const { saveDocPart } = await sys();
      await unchanged(fx, async () => expectRefused(fx, await saveDocPart(fx.a.project, "head", "b"), "rewriting A's criterio.md head"));
      await unchanged(fx, async () => expectRefused(fx, await saveDocPart(fx.a.project, "head", null), "resetting A's criterio.md head"));
    },
  },

  "action:app/actions/area-comments.ts#loadAreaThread": {
    probe: async (fx) => {
      asB(fx);
      const { loadAreaThread } = await talk();
      expectRefused(fx, await loadAreaThread(fx.a.project, "color", [fx.a.item]), "the thread of A's area");
      const own = await loadAreaThread(fx.b.project, "color", [fx.a.item]);
      expect(own.ok, "B's own thread loads").toBe(true);
      expectNoSecret(fx, own, "B's thread naming A's reference carries none of A's comments");
    },
  },
  "action:app/actions/area-comments.ts#postAreaComment": {
    probe: async (fx) => {
      asB(fx);
      const { postAreaComment } = await talk();
      await unchanged(fx, async () => expectRefused(fx, await postAreaComment(fx.a.project, "color", "b"), "a comment in A's area"));
      await unchanged(fx, async () => {
        const own = await postAreaComment(fx.b.project, "head", "b", { pin: { quote: "q", x: 0.5, to: fx.a.areaComment } });
        expect(own.ok, "B pins its own file").toBe(true);
        expectNoSecret(fx, own, "a pin answering A's comment");
      });
    },
  },
  "action:app/actions/area-comments.ts#removeAreaComment": {
    probe: async (fx) => {
      asB(fx);
      const { removeAreaComment } = await talk();
      for (const id of [fx.a.areaComment, fx.a.proposal]) await unchanged(fx, async () => expectNoSecret(fx, await removeAreaComment(id), `removing A's ${id}`));
    },
  },
  "action:app/actions/area-comments.ts#loadSystemActivity": {
    probe: async (fx) => {
      asB(fx);
      expectRefused(fx, await (await talk()).loadSystemActivity(fx.a.project), "the activity of A's system");
    },
  },
  "action:app/actions/area-comments.ts#answerAreaProposal": {
    probe: async (fx) => {
      asB(fx);
      const { answerAreaProposal } = await talk();
      for (const accept of [true, false]) await unchanged(fx, async () => expectRefused(fx, await answerAreaProposal(fx.a.proposal, accept), `answering A's proposal (${accept})`));
    },
  },

  "action:app/actions/brand.ts#saveBrand": {
    probe: async (fx) => {
      asB(fx);
      const { saveBrand } = await brand();
      const logo = (key: string) => ({ lede: "", primary: { light: { key, type: "image/png" }, dark: null }, mark: { light: null, dark: null }, clearSpace: 1, minPx: null });
      await unchanged(fx, async () => expectRefused(fx, await saveBrand(fx.a.project, "logo", logo(`inspo/${fx.b.team}/brand/${fx.a.project}/x.png`), null), "writing A's logo"));
      expectRefused(fx, await saveBrand(fx.b.project, "logo", logo(fx.a.keys.brand), null), "B's logo pointing at A's file");
      const [own] = await db.select({ brand: schema.projectSystem.brand }).from(schema.projectSystem).where(eq(schema.projectSystem.projectId, fx.b.project));
      expect(JSON.stringify(own?.brand ?? null), "B's brand does not point at A's file").not.toContain(fx.a.keys.brand);
    },
  },
  "action:app/actions/brand.ts#releaseBrand": {
    probe: async (fx) => {
      asB(fx);
      const { releaseBrand } = await brand();
      await unchanged(fx, async () => expectRefused(fx, await releaseBrand(fx.a.project, "logo"), "releasing A's logo"));
    },
  },
  "action:app/actions/brand.ts#seedBrandFromClient": {
    probe: async (fx) => {
      asB(fx);
      const { seedBrandFromClient } = await brand();
      await unchanged(fx, async () => expectRefused(fx, await seedBrandFromClient(fx.a.project), "seeding A's brand from its client"));
    },
  },
  "action:app/actions/brand.ts#findBrandFace": {
    probe: async (fx) => {
      asB(fx);
      const res = await (await brand()).findBrandFace(fx.a.project, "Probe Sans");
      expectNoSecret(fx, res, "a face for A's project");
      expect(JSON.stringify(res), "A's client site is not where the face comes from").not.toContain(fx.a.prefix);
    },
  },
  "action:app/actions/brand.ts#attachBrandFile": {
    probe: async (fx) => {
      asB(fx);
      const { attachBrandFile } = await brand();
      expectRefused(fx, await attachBrandFile(fx.a.project, fx.a.keys.brand, "image/png"), "A's brand file in A's project");
      expectRefused(fx, await attachBrandFile(fx.b.project, fx.a.keys.brand, "image/png"), "A's brand file in B's project");
      expectRefused(fx, await attachBrandFile(fx.b.project, `inspo/${fx.b.team}/brand/${fx.b.project}/../../../${fx.a.team}/brand/${fx.a.project}/logo.png`, "image/png"), "A's brand file through a climbing key");
    },
  },

  "route:app/api/system/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/route");
      asB(fx);
      await withKeys(async () => {
        for (const projectId of [fx.a.project, fx.a.hidden]) await unchanged(fx, async () => expectDenied(fx, await POST(request("/api/system", { method: "POST", body: { projectId } })), `a run on A's ${projectId}`));
      });
    },
  },
  "route:app/api/system/options/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/options/route");
      asB(fx);
      await withKeys(async () => {
        await expectDenied(fx, await POST(request("/api/system/options", { method: "POST", body: { projectId: fx.a.project, area: "color", itemIds: [fx.a.item] } })), "options for A's area");
      });
    },
  },
  "route:app/api/system/curate/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/curate/route");
      asB(fx);
      await withKeys(() => unchanged(fx, async () => {
        await expectDenied(fx, await POST(request("/api/system/curate", { method: "POST", body: { projectId: fx.a.project, area: "color", keep: { c1: true } } })), "curating A's area");
      }));
    },
  },
  "route:app/api/system/start/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/start/route");
      asB(fx);
      const refs = await POST(request("/api/system/start", { method: "POST", body: { projectId: fx.a.project, area: "color" } }));
      expectNoSecret(fx, await refs.text(), "where to start A's area");
      await withKeys(async () => {
        await expectDenied(fx, await POST(request("/api/system/start", { method: "POST", body: { projectId: fx.a.project, area: "color", part: "ask" } })), "the opening question for A's area");
      });
    },
  },
  "route:app/api/system/brand/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/brand/route");
      asB(fx);
      await withKeys(() => unchanged(fx, async () => {
        await expectDenied(fx, await POST(request("/api/system/brand", { method: "POST", body: { projectId: fx.a.project, force: ["logo"] } })), "a brand pass on A's project");
      }));
    },
  },
  "route:app/api/system/brand/import-text/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/brand/import-text/route");
      asB(fx);
      const before = aFiles(fx);
      await unchanged(fx, async () => {
        await expectDenied(fx, await POST(request("/api/system/brand/import-text", { method: "POST", body: { projectId: fx.a.project, text: "a guide long enough to be read" } })), "a guide into A's brand");
      });
      expect(aFiles(fx), "no file written under A's workspace").toEqual(before);
    },
  },
  "route:app/api/system/brand/upload/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/system/brand/upload/route");
      asB(fx);
      const before = aFiles(fx);
      await expectDenied(fx, await POST(request("/api/system/brand/upload", { method: "POST", body: { projectId: fx.a.project, purpose: "logo", name: "x.png", size: 10 } })), "an upload ticket for A's brand");
      const form = new FormData();
      form.set("projectId", fx.a.project);
      form.set("purpose", "logo");
      form.set("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "x.png", { type: "image/png" }));
      await expectDenied(fx, await POST(request("/api/system/brand/upload", { method: "POST", body: form })), "a file into A's brand");
      expect(aFiles(fx), "no file written under A's workspace").toEqual(before);
    },
  },
  "route:app/api/system/brand/assets/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/system/brand/assets/route");
      asB(fx);
      await expectDenied(fx, await GET(request(`/api/system/brand/assets?projectId=${fx.a.project}`)), "the zip of A's brand");
      // A stored brand is checked on write; the zip still reads only the workspace's own files, whatever the row says
      const now = new Date();
      const planted = { logo: { lede: "", primary: { light: { key: fx.a.keys.brand, type: "image/png" }, dark: null }, mark: { light: null, dark: null }, clearSpace: 1, minPx: null } };
      await db.insert(schema.projectSystem).values({ projectId: fx.b.project, organizationId: fx.b.team, summary: "", brand: planted, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: schema.projectSystem.projectId, set: { brand: planted } });
      try {
        const res = await GET(request(`/api/system/brand/assets?projectId=${fx.b.project}`));
        expect(res.status, "B's own zip").toBe(200);
        expect(Buffer.from(await res.arrayBuffer()).toString("latin1"), "B's zip carries no logo read from A's file").not.toMatch(/logo\//);
      } finally {
        await db.update(schema.projectSystem).set({ brand: null }).where(eq(schema.projectSystem.projectId, fx.b.project));
      }
    },
  },
  "route:app/api/system/brand/fonts/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/system/brand/fonts/route");
      asB(fx);
      const res = await GET(request(`/api/system/brand/fonts?projectId=${fx.a.project}`));
      expect(await res.json(), "no face of A's brand").toEqual({ faces: {} });
    },
  },
  "route:app/api/system/fonts/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/system/fonts/route");
      asB(fx);
      const a = await GET(request(`/api/system/fonts?projectId=${fx.a.project}`));
      expect(await a.json(), "no face of A's board").toEqual({ faces: {} });
      const mixed = await GET(request(`/api/system/fonts?projectId=${fx.b.project}&ids=${fx.a.item}`));
      expect(await mixed.json(), "A's reference named on B's board").toEqual({ faces: {} });
    },
  },
  "route:app/api/system/font/route.ts#GET": {
    exempt: "proxies one font file of a public site; the URL must carry a token signed by the server and no workspace row is read",
  },
  "route:app/api/templates/[id]/page/route.ts#GET": {
    probe: async (fx) => {
      const { GET } = await import("@/app/api/templates/[id]/page/route");
      asB(fx);
      for (const id of [fx.a.template, fx.a.project]) await expectDenied(fx, await GET(request(`/api/templates/${id}/page`), params({ id })), `the page of A's ${id}`);
    },
  },
  "route:app/api/agent/route.ts#POST": {
    probe: async (fx) => {
      const { POST } = await import("@/app/api/agent/route");
      asB(fx);
      await withKeys(async () => {
        const items = await itemRow(fx.a.item);
        await unchanged(fx, async () => {
          const run = [
            { kind: "delete_items", items: [fx.a.item] },
            { kind: "delete_project", project: fx.a.project },
            { kind: "clear", project: fx.a.project, area: "color" },
            { kind: "file", items: [fx.a.item], project: fx.b.project, on: true },
            { kind: "assign", items: [fx.b.item], project: fx.a.project, area: "color", on: true },
          ];
          const res = await POST(request("/api/agent", { method: "POST", body: { run } }));
          expect(res.status, "the confirmation answers").toBe(200);
          const body = (await res.json()) as { done: unknown[] };
          expectNoSecret(fx, body, "the confirmation's answer");
          expect(body.done, "none of A's ids runs").toEqual([]);
        });
        expect(await itemRow(fx.a.item), "A's reference is as it was").toEqual(items);
        const [project] = await db.select({ id: schema.project.id }).from(schema.project).where(eq(schema.project.id, fx.a.project));
        expect(project, "A's project is still there").toBeTruthy();
        // Asking plans with the model, whose prompt is B's own workspace: the isolation test checks it names nothing of A's
        const ask = await POST(request("/api/agent", { method: "POST", body: { text: "what did we decide", scope: { projectId: fx.a.project, openItemId: fx.a.item, pickedIds: [fx.a.item], visibleIds: [fx.a.item] } } }));
        expectNoSecret(fx, await ask.text(), "asking with A's ids in the scope");
      });
    },
  },
};
