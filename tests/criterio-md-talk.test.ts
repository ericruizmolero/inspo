// A proposal the team turned down says why in criterio.md (#133), where the team and an agent reading the file see it.
import { expect, test } from "vitest";
import { renderCriterioMd } from "@/lib/criterio-md";
import { emptySystem, type SystemArea } from "@/types/system";
import es from "@/lib/i18n/es";

test("a rejected proposal carries its reason under its line; an open one carries none", () => {
  const md = renderCriterioMd({
    project: "Zernio", system: emptySystem("p1"), items: {}, labels: es.system.areas as Record<SystemArea, string>, strings: es.system.md,
    talk: { color: [
      { who: "Eric", text: "Lo medido de la web", proposal: { decision: "Fondo #FFFFFF", state: "rejected", reason: "Ningún blanco puro" } },
      { who: "Ana", text: "Otra idea", proposal: { decision: "Fondo #F4EFE6", state: "open" } },
    ] },
  });
  expect(md).toContain("Eric propone (descartada): «Fondo #FFFFFF»");
  expect(md).toContain("    - Por qué no: «Ningún blanco puro»");
  expect(md.match(/Por qué no/g)).toHaveLength(1);
});
