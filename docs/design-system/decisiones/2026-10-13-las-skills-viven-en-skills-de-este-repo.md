---
title: Las skills de criterio.design viven en skills/ de este repo y se instalan desde él
date: 2026-10-13
status: vigente
kind: desarrollo
supersedes: dónde viven y cómo se publican las skills en 2026-10-06-todas-las-skills-son-de-agentes.md (el resto de esa decisión sigue)
---
**Contexto.** La [decisión del 06-10](2026-10-06-todas-las-skills-son-de-agentes.md) sacó las trece skills de criterio.md a un repo público aparte, `ericruizmolero/criterio-skills`, escrito por `scripts/build-skills.ts` desde un checkout vecino. Publicar era regenerar, cambiar de repo y hacer commit allí; ese checkout no estaba en esta máquina. La skill del conector `bring-brand` (ver [la marca por el conector](2026-10-13-el-conector-trae-la-marca-a-la-presentacion.md)) nació como carpeta en `skills/` de este repo, y `npx skills add` lee `skills/<id>/SKILL.md` en la raíz de cualquier repo.

**Decisión.** Todas las skills viven en `skills/` de este repo: las trece las escribe `npm run skills:build` (`scripts/build-skills.ts`, sin argumento, junto a `skills/README.md`), la del conector está escrita a mano en su carpeta con sus scripts. `SKILLS_REPO` (`lib/md-skill-ids.ts` y su copia en `marketing-site/src/skills.ts`) apunta a `https://github.com/ericruizmolero/inspo`, así que el comando que enseñan Descubrir y `/skills/` es `npx skills add https://github.com/ericruizmolero/inspo --skill <id>` y la página de cada skill es `skills/<id>` de este repo. `build-skills` ya no copia nada a otro sitio ni acepta un directorio; comprueba que cada skill del conector tenga su `SKILL.md`. El repo `criterio-skills` queda sin uso.

**Por qué.** Alberto, 13-10: "deploy this, and i'm going to try (add criterio-skills inside this monorepo)", y al elegir entre generar aquí, un submódulo o hacerlo él, eligió generar aquí. Interpretación nuestra: un solo repo, un solo commit, y la skill generada y la escrita a mano se instalan igual.

**Cómo aplicarlo.** Cambiar el texto de una skill de criterio.md es cambiarlo en `lib/md-skills*.ts` y correr `npm run skills:build` en el mismo commit; `skills/<id>/SKILL.md` generado nunca se edita a mano. Una skill del conector se escribe en `skills/<id>/` y se lista en `CONNECTOR_SKILLS` de `scripts/build-skills.ts` y de `marketing-site/src/skills.ts`. Antes de subir, `git status` no debe enseñar `skills/*/scripts/node_modules`.
