---
title: Una sola fuente, Inter, con escala más pequeña
date: 2026-09-23
status: sustituida
kind: diseño
supersedes: Family Bold + Söhne (rediseño del 2026-09-20)
---
**Contexto.** El rediseño del 20-09 usaba Klim Family Bold (display) y Söhne (cuerpo), con Schibsted Grotesk de respaldo porque las fuentes de prueba de Klim solo traían A-Z, a-z y 0-9.

**Decisión.** Una familia en todas partes: Inter variable con eje óptico (`app/fonts.ts`), y una escala de tamaños más pequeña (commit b5f19da3).

**Por qué.** Las fuentes de prueba no servían para producción y la jerarquía se consigue con tamaño y peso; el eje `opsz` abre el texto pequeño y cierra los títulos solo.

**Cómo aplicarlo.** No añadir familias para UI. La mono solo para datos literales.

**Sustituida** el 2026-10-07 por [el sistema de diseño Criterio](2026-10-07-sistema-de-diseno-criterio.md).
