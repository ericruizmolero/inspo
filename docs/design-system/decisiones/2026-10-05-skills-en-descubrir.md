---
title: Descubrir tiene un apartado de skills, una ficha por skill
date: 2026-10-05
status: sustituida
kind: producto
---
**Contexto.** Llegaban skills de diseño para agentes (las de ui-skills.com, iso-figure) y no tenían sitio en Descubrir: como web, todas se quedaban en una sola ficha de UI Skills. Además criterio.md ya tiene sus propias skills activables (ver `decisiones/2026-10-04-skills-dentro-del-md.md`) y no había que confundirlas.

**Decisión.** Grupo `skills` ("Skills para agentes") en `lib/directory.ts`, con una ficha por skill aunque varias compartan dominio (es la única excepción a "un dominio, una ficha"). La skill que también existe en criterio.md lleva el campo `skill` con su id de `MD_SKILLS`, y su fila en Descubrir muestra la etiqueta `.disc-row__skill` ("En criterio.md"). No hay botón de activar, porque en Descubrir no hay proyecto abierto: se activa desde el menú Skills del proyecto. El grupo queda fuera de "Barajar" de la barra lateral, igual que desarrollo, modelos y agentes.

**Por qué.** Eric lo propuso ("dentro de descubrir tenemos que tener un apartado de skills") y aprobó una ficha por skill con la marca de criterio.md ("dale si"). Que la etiqueta sustituya al botón es interpretación nuestra: activar necesita un proyecto, y Descubrir no lo tiene.

**Cómo aplicarlo.** Una skill nueva va en el grupo `skills` con su página propia como URL. Si la adaptamos a criterio.md (`lib/md-skills-more.ts`), su ficha gana `skill: "<id>"`.
