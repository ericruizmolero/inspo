---
title: Las migraciones solo añaden, y producción entra por el pooler de Neon
date: 2026-10-10
status: vigente
kind: desarrollo
---
**Contexto.** Las migraciones corren en el build de Vercel (`vercel.json`, `scripts/migrate.ts`), antes de `next build`. Si el build falla después de migrar, producción se queda con el esquema nuevo y el código viejo. Y nada comprobaba que `DATABASE_URL` fuera el host `-pooler` de Neon (ericruizmolero/inspo#111).

**Decisión.** Una migración solo añade: tablas, columnas que admiten vacío o traen valor por defecto, índices. Renombrar o borrar una columna o una tabla va en dos despliegues: primero el código deja de usarla, luego la migración la quita. Cambiar un índice puede ir en el mismo, porque el código viejo no depende de él. `lib/db/url.ts` lanza un error en producción (`VERCEL_ENV=production`) si el host de `DATABASE_URL` no lleva `-pooler`.

**Por qué.** Del issue: "Migraciones solo compatibles hacia atrás (añadir, nunca renombrar ni borrar en el mismo despliegue)" y "Exigir el host `-pooler` en producción (fallar al arrancar si no lo es)". Fallar al arrancar se nota en el primer despliegue. Llegar al límite de conexiones solo se nota con tráfico (interpretación de quien lo construyó).

**Cómo aplicarlo.** Antes de escribir una migración, preguntar si el código de ahora funciona con ella aplicada. Si no, partirla en dos despliegues. Detalle en [Desarrollo](../desarrollo.md#base-de-datos).
