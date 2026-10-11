// The marketing site (marketing-site/) cannot import the app, so it keeps copies of what it shows from it. These
// fail when a copy and the app's own data drift apart.
import { expect, test } from "vitest";
import { MD_SKILLS, SKILLS_REPO } from "@/lib/md-skill-ids";
import { ui as enUi } from "@/lib/i18n/en/ui";
import { ui as esUi } from "@/lib/i18n/es/ui";
import { OWN_SKILLS, SKILLS, SKILLS_REPO as SITE_SKILLS_REPO } from "@/marketing-site/src/skills";
import { PLANS } from "@/lib/plans";
import { plans as enPlans } from "@/lib/i18n/en/plans";
import { plans as esPlans } from "@/lib/i18n/es/plans";
import { fmtPrice } from "@/lib/i18n/format";
import * as site from "@/marketing-site/src/plans";

test("the site's plans have the app's figures: prices, people, workspaces, AI actions, searches, references, storage", () => {
  expect(site.PLANS).toEqual(PLANS);
});

test("the site says what the app says about each plan and about payment, in both languages", () => {
  expect(site.PLAN_TEXT).toEqual({ en: enPlans, es: esPlans });
  for (const [locale, ui] of [["en", enUi], ["es", esUi]] as const) {
    const lines = site.PLAN_LINES[locale];
    expect({ forGood: lines.forGood, perMonth: lines.perMonth, foot: lines.foot }).toEqual({ forGood: ui.plans.forGood, perMonth: ui.plans.perMonth, foot: ui.plans.foot });
    expect(lines.orYearly("X")).toBe(ui.plans.orYearly("X"));
    for (const p of PLANS) for (const n of [p.price.month, p.price.year]) expect(site.fmtPrice(n, locale)).toBe(fmtPrice(n, locale));
  }
});

test("the site lists criterio.design's own skills as the app has them: same ids, order, names and text", () => {
  expect(OWN_SKILLS.map((s) => s.id)).toEqual([...MD_SKILLS]);
  expect(SITE_SKILLS_REPO).toBe(SKILLS_REPO);
  for (const s of OWN_SKILLS) {
    expect({ en: s.name.en, es: s.name.es }).toEqual({ en: enUi.system.skillsList[s.id].name, es: esUi.system.skillsList[s.id].name });
    expect({ en: s.what.en, es: s.what.es }).toEqual({ en: enUi.system.skillsList[s.id].what, es: esUi.system.skillsList[s.id].what });
  }
});

test("another author's skill marked as in criterio.md names one of the app's skills", () => {
  const marked = SKILLS.filter((s) => s.inCriterio);
  expect(marked.length).toBeGreaterThan(0);
  for (const s of marked) expect(MD_SKILLS).toContain(s.inCriterio);
});
