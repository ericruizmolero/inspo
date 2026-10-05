---
title: Skills es una pestaña de Descubrir, con tarjetas y no con filas
date: 2026-10-05
status: vigente
kind: diseño
supersedes: 2026-10-05-skills-en-descubrir
---
**Contexto.** Las skills para agentes entraron primero como un grupo más del directorio, en la lista de Recursos. Pero una skill no se visita como una web: se instala.

**Decisión.** Descubrir tiene tres pestañas: Plantillas, Recursos y Skills (`?in=skills`). Las skills salen del directorio a su propia lista, `SKILLS` en `lib/directory.ts`, así que no aparecen en Recursos, en el modal del directorio ni en la portada de invitado. Se pintan con `components/DiscoverSkills.tsx` como tarjetas (`.disc-skill`, fondo `--panel`, radio `--radius-l`, sin borde) con el avatar y el usuario de GitHub del autor, el nombre, qué hace y el comando de instalación (`npx skills add …`, en mono porque es literal) en un botón que lo copia. Toda la tarjeta abre la página de la skill. La que también existe en criterio.md lleva la pastilla "En criterio.md" (`.disc-row__skill`), sin botón de activar porque en Descubrir no hay proyecto abierto. El catálogo de donde vienen (UI Skills) va como enlace en la cabecera.

**Por qué.** Eric: "las skills tiene ser un apartado más plantillas/recursos/skills" y "skills se tendrá que ver diferente que una lista". Que lo central de la tarjeta sea el comando para copiar es interpretación nuestra: es lo que se hace con una skill.

**Cómo aplicarlo.** Una skill nueva va en `SKILLS` con su página como `url` y su `install`; si la adaptamos a criterio.md (`lib/md-skills-more.ts`), gana `skill: "<id>"`. Las webs siguen en `DIRECTORY`.
