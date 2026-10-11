// The marketing site (marketing-site/) cannot import the app, so it keeps copies of what it shows from it. These
// fail when a copy and the app's own data drift apart.
import { expect, test } from "vitest";
import { MD_SKILLS, SKILLS_REPO } from "@/lib/md-skill-ids";
import { ui as enUi } from "@/lib/i18n/en/ui";
import { ui as esUi } from "@/lib/i18n/es/ui";
import { OWN_SKILLS, SKILLS, SKILLS_REPO as SITE_SKILLS_REPO } from "@/marketing-site/src/skills";

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
