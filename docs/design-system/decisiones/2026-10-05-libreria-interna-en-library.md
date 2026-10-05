---
title: El sistema de diseño interno vive en /library, en castellano
date: 2026-10-05
status: vigente
kind: desarrollo
---
**Contexto.** Las decisiones de diseño y desarrollo estaban repartidas entre memorias de agentes, handoffs y commits.

**Decisión.** Un sistema de diseño interno en `docs/design-system/` (Markdown) que `criterio.design/library` pinta como librería visual: tokens y componentes en vivo con el CSS real, catálogo con capturas, guías para construir y el registro de decisiones. Solo para socios (el acceso de `/admin`), con enlace en el menú de espacio y en la paleta. Estructura por bloques al estilo de la librería de Neety (Introducción, Fundamentos, Componentes, Construir, Mantenimiento), sin la parte de "conectar con Claude".

**Por qué.** "tiene que ser una librería que esté en criterio.design/library, que la podamos ver de forma visual también". Agentes y personas leen la misma fuente. Idioma: "en castellano bien".

**Cómo aplicarlo.** Cada sí o no del equipo se registra con la skill `registrar-decision`. Una página nueva de la librería se añade a `DS_GROUPS` en `lib/design-system.ts`; una captura nueva va a `docs/design-system/capturas/` (servida solo a socios por `/library/capturas/[name]`).
