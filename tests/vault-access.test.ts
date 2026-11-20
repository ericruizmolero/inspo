// The Vault's code is for the paid plans, except the pieces marked free and the rules (types/vault.ts canReadVault).
// The connector's answers are shaped from what it read (lib/mcp/vault.ts entryAnswer, searchAnswer, vaultMdOf), so
// these run without a database: a locked piece must never carry its code, in any field.
import { describe, expect, test } from "vitest";
import { canReadVault, type VaultEntry } from "@/types/vault";
import { entryAnswer, searchAnswer, vaultMdOf, type VaultReader } from "@/lib/mcp/vault";

const ORIGIN = "https://criterio.test";
const CODE = { html: "<div class=\"secret-hero\">", css: ".secret-hero{display:grid}", js: "gsap.to('.secret-hero')" };

const entry = (slug: string, o: Partial<VaultEntry> = {}): VaultEntry => ({
  id: `id-${slug}`, slug, title: slug, category: "hero", tags: ["GSAP"], summary: `What ${slug} is`, image: null, video: null, videoRatio: null,
  liveUrl: null, published: true, preview: true, access: "paid", createdAt: "2026-11-20T00:00:00.000Z",
  use: `When to use ${slug}`, sourceUrl: null, by: null, byImage: null,
  blocks: [{ title: "HTML", lang: "html", code: CODE.html }, { title: "CSS", lang: "css", code: CODE.css }, { title: "JavaScript", lang: "js", code: CODE.js }],
  ...o,
});
const paid = entry("paid-hero");
const free = entry("free-hero", { access: "free" });
const rule = entry("optical", { category: "utilities" });

const freeWs: VaultReader = { plan: { vault: "sample" }, partner: false };
const paidWs: VaultReader = { plan: { vault: "full" }, partner: false };
const partner: VaultReader = { plan: { vault: "sample" }, partner: true };

const hasCode = (x: unknown) => Object.values(CODE).some((c) => JSON.stringify(x).includes(JSON.stringify(c).slice(1, -1)));

describe("canReadVault", () => {
  test("a free workspace reads the free pieces and the rules, not the paid ones", () => {
    expect(canReadVault(freeWs.plan, free, false)).toBe(true);
    expect(canReadVault(freeWs.plan, rule, false)).toBe(true);
    expect(canReadVault(freeWs.plan, paid, false)).toBe(false);
  });
  test("a paid workspace and a partner read everything", () => {
    for (const e of [paid, free, rule]) {
      expect(canReadVault(paidWs.plan, e, false)).toBe(true);
      expect(canReadVault(freeWs.plan, e, true)).toBe(true);
    }
  });
});

describe("read_vault", () => {
  test("on a free workspace a paid piece is locked: what it is, its preview and the plans, no code anywhere", () => {
    const a = entryAnswer(paid, freeWs, ORIGIN);
    expect(a.code).toBe("locked");
    expect(a).not.toHaveProperty("documentation");
    expect(hasCode(a)).toBe(false);
    expect(a).toMatchObject({ what_it_is: "What paid-hero is", when_to_use: "When to use paid-hero", preview: `${ORIGIN}/api/vault/paid-hero/preview`, plans: `${ORIGIN}/settings/plan` });
    expect(a.do).toContain("Duo, Studio or Agency");
    expect(a.do).toContain(`${ORIGIN}/settings/plan`);
  });
  test("a locked piece with nothing to run gives no preview", () => {
    expect(entryAnswer(entry("still", { preview: false }), freeWs, ORIGIN)).not.toHaveProperty("preview");
  });
  test("on a free workspace a free piece and a rule come whole", () => {
    for (const e of [free, rule]) {
      const a = entryAnswer(e, freeWs, ORIGIN);
      expect(a.code).toBe("readable");
      expect(a).toHaveProperty("documentation", e.blocks);
    }
  });
  test("a paid workspace and a partner read every piece whole", () => {
    for (const r of [paidWs, partner]) for (const e of [paid, free, rule]) {
      const a = entryAnswer(e, r, ORIGIN);
      expect(a.code).toBe("readable");
      expect(hasCode(a)).toBe(true);
    }
  });
});

describe("search_vault", () => {
  const all = [paid, free, rule];
  test("each result says whether its code is readable for this workspace; the rules come along unchanged", () => {
    const a = searchAnswer(all, {}, { query: "hero" }, freeWs, ORIGIN);
    expect(Object.fromEntries(a.entries.map((e) => [e.entry, e.code]))).toEqual({ "paid-hero": "locked", "free-hero": "readable" });
    expect(a.always_apply).toEqual([{ entry: "optical", title: "optical", category: "utilities", what_it_is: "What optical is", tags: ["GSAP"], rule: true, url: `${ORIGIN}/?in=vault&entry=optical` }]);
    expect(a.plans).toBe(`${ORIGIN}/settings/plan`);
    expect(a.do).toContain("Duo, Studio or Agency");
    expect(hasCode(a)).toBe(false);
  });
  test("on a paid workspace nothing is locked and no plans page is offered", () => {
    const a = searchAnswer(all, {}, {}, paidWs, ORIGIN);
    expect(a.entries.every((e) => e.code === "readable")).toBe(true);
    expect(a).not.toHaveProperty("plans");
  });
});

describe("criterio.md's From the Vault", () => {
  test("marks the pieces whose code is locked for this workspace, and says where the code comes from", () => {
    const md = vaultMdOf([paid, free, rule], ["hero"], [], freeWs, ORIGIN);
    expect(md).toContain("`paid-hero` paid-hero: What paid-hero is (code locked)");
    expect(md).toMatch(/`free-hero` free-hero: What free-hero is\n/);
    expect(md).toMatch(/`optical` optical: What optical is\n/);
    expect(md).toContain(`${ORIGIN}/settings/plan`);
    expect(vaultMdOf([paid, free, rule], ["hero"], [], paidWs, ORIGIN)).not.toContain("locked");
  });
});
