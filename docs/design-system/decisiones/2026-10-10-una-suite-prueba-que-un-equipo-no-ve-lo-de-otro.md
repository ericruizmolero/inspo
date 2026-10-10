---
title: Una suite de vitest prueba que un equipo no ve ni toca lo de otro, en cada superficie
date: 2026-10-10
status: vigente
kind: desarrollo
---
**Contexto.** El proyecto no tenía ni un test, y el aislamiento entre espacios depende de que cada consulta se acuerde de filtrar por `organization_id`, a mano, sin RLS ni envoltorio (ericruizmolero/inspo#20).

**Decisión.** vitest como runner: `npm test` es `vitest run` (`vitest.config.mts`, `tests/`), y corre en el job `db-checks` del CI tras las migraciones. La suite `tests/isolation` siembra dos equipos y llama, como la persona de B y con los ids de A, a cada ruta, Server Action, herramienta del MCP y página con segmento dinámico. La tabla `tests/isolation/surfaces.ts` dice de cada superficie su prueba o por qué no la tiene (`exempt`), y `tests/isolation/guard.test.ts` falla si en disco hay una superficie que la tabla no nombra. Se simula solo el borde (`tests/setup.ts`): la sesión, las cabeceras, el almacenamiento (en memoria) y todo lo que sale de la máquina.

**Por qué.** Del issue: "Esto tiene que estar antes del primer cliente de pago. Es el fallo que se lleva la empresa por delante." El almacenamiento va en memoria porque las llaves de R2 en local escriben en el bucket de producción. Lo demás corre de verdad contra Postgres para que la prueba sea la de la app, no la de un doble (interpretación de quien lo construyó).

**Cómo aplicarlo.** Una superficie nueva entra en la tabla en el mismo trabajo, con su prueba (B pide lo de A y recibe 401, 403, 404, `{ ok: false }` o nada de A; en una escritura, la fila de A sigue igual). Una fuga se arregla con el filtro por espacio en el mismo trabajo. Detalle en [Desarrollo](../desarrollo.md#tests).
