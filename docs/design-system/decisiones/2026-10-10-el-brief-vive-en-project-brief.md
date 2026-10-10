---
title: El brief del proyecto vive en project.brief y los restos del Pulido antiguo se borran
date: 2026-10-10
status: vigente
kind: desarrollo
---
**Contexto.** El brief (qué es el proyecto, para quién, qué evitar, la web del cliente en un rediseño) se guardaba en `project.polish`, la columna del Pulido con IA retirado el 04/10, junto a su última partida (`run`), sus decisiones (`decisions`) y el porqué por referencia (`project_item.why`). Nada leía ya esas tres cosas. El issue #104 pedía decidir si renombrar antes de que haya datos de clientes.

**Decisión.** Se renombra ahora. La columna `project.brief` guarda solo el brief, con su tipo `Brief` en `types/brief.ts` (antes `PolishBrief` en `types/polish.ts`). La migración `0028` copia `polish->'brief'` a `brief` y borra `project_item.why`; la `0029` borra `project.polish`. El resto de `types/polish.ts` (partidas, duelos, `gapsOf`, `pendingOf`) se borra con él. El Pulido en equipo de hoy no cambia: sus votos viven en `polish_vote`.

**Por qué.** Interpretación de quien lo hizo: todavía no hay clientes, así que renombrar cuesta una migración y nada más; después costaría datos ajenos. Un nombre que apunta a una función retirada confunde a quien lee el esquema.

**Cómo aplicarlo.** Leer el brief como `project.brief`, nunca `project.polish?.brief`. Una columna cuyo único lector se retira se borra en el mismo trabajo, no se deja "por si acaso".
