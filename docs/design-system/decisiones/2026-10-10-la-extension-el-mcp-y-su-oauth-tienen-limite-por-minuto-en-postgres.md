---
title: La extensión, el MCP y su OAuth tienen límite por minuto contado en Postgres, y el tope diario va con los planes
date: 2026-10-10
status: vigente
kind: desarrollo
---
**Contexto.** `allow()` (`lib/rate-limit.ts`) solo cubría la biblioteca, las capturas, los comentarios y el enlace mágico. Las rutas de la extensión solo tenían la cuota del plan, el MCP contaba en memoria (cada instancia de Vercel por su cuenta) y el registro de clientes y el token del OAuth no tenían límite (ericruizmolero/inspo#102).

**Decisión.** `requireExtCtx` (`lib/ext-keys.ts`) cuenta 120 peticiones por minuto por llave, 300 por espacio y 30 lotes de `items/batch` por espacio, y responde 429 con `Retry-After: 60`. `extension/chrome/import.js` espera ese tiempo y manda el mismo lote otra vez. `app/mcp/route.ts` cuenta 120 peticiones por minuto por persona (429) y `lib/mcp/server.ts` 40 escrituras, dichas al modelo como error de la herramienta. `/api/mcp/register` admite 60 registros por hora por IP y `/api/mcp/token` 120 peticiones por minuto, con `ipOf()`. Todo con `allow()`, en la tabla `rate_limit`. El tope diario de elementos de un espacio gratis no va aquí.

**Por qué.** Alberto, en #102: "Con los precios de #89, el 'tope diario de elementos guardados por workspace gratis' de esta issue pasa a ser el tope de 200 elementos / 1 GB del plan Gratis, y va en #124. Aquí quedan solo los límites por minuto contra el abuso (extensión, MCP, OAuth), que valen para todos los planes." Las cifras son interpretación de quien lo construyó: una importación manda un lote cada pocos segundos y queda por debajo de 30, y un agente trabajando no llega a 120.

**Cómo aplicarlo.** Una ruta nueva que acepta una llave, un token o a nadie lleva su `allow()` y una prueba en `tests/rate-limits.test.ts`. Ningún contador vive en memoria del módulo. Si Claude.ai empieza a chocar con el límite por IP del OAuth, se sube: registra desde sus servidores. Las cifras están en `seguridad.md`.
