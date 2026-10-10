# Mantenimiento técnico

Qué tocar y en qué orden cuando cambia algo de base.

## Lista

1. **Tokens**: en `app/globals.css` (`:root` y `:root[data-theme="light"]`), y la tabla de su página de [Tokens](fundamentos.md) (`fundamentos/color.md`, `tipografia.md`…) en el mismo cambio; la muestra de `/library` lee el valor del CSS vivo, así que se actualiza sola.
2. **Componentes reutilizables**: en `components/`, con su CSS propio, y su ficha en [Componentes](componentes.md).
3. **Textos**: en `lib/i18n/en` y `lib/i18n/es` a la vez.
4. **Base de datos**: cambiar `lib/db/schema.ts`, `npm run db:generate`, revisar el SQL en `drizzle/`. La migración corre en el build de Vercel: si falla, no se despliega. Añadir la tabla nueva a `scripts/seed.ts` (padres primero; si guarda correos de gente sin cuenta, a `MASKS` también) y, si lleva contenido de un espacio, a `scripts/copy-workspace.ts` (copia referencias, proyectos, comentarios y ficheros de un workspace a otro en producción; sin `--apply` solo cuenta).
5. **Decisiones**: un fichero en `docs/design-system/decisiones/` por cada una.
6. **Comprobar**: la CI corre en cada PR `npx tsc --noEmit`, `npm run build` y los `check:*` que no piden servidor ni datos reales (→ [Desarrollo](desarrollo.md#flujo-de-trabajo)). A mano, antes de subir, los del área que tocaste que la CI no corre: `check:system` (llama a un modelo y pide un proyecto real), `check:brand` (pide un workspace de `db:pull`), `check:invites` y `check:mcp` (piden el dev server y una sesión). Si tocaste `docs/design-system/` o `components/criterio/`, `npm run check:design-system` antes de subir: la CI también lo corre, pero tarda más en avisar.
7. **Desplegar**: push a `main` despliega producción (Vercel, Frankfurt); cada PR tiene su preview con su rama de Neon. La fusión del PR la hace una persona.

## Pendiente de limpiar

Código que existe pero no se ve. No construir encima sin una decisión nueva.

| Qué | Por qué sigue |
| --- | --- |
| Nombres viejos `--bg`, `--panel`, `--text-2` y `--surface`, `--surface-2`, `--surface-3` | No son alias puros: Board y la barra lateral del móvil los redefinen con otros valores, y `--surface*` no tiene nombre en el sistema (→ [Tokens](fundamentos.md)). Renombrarlos cambia la pinta; se retiran cuando no quede CSS que los lea |
| Tablas `design_why` y `design_revision` | Ya nadie las escribe (las rutas `why` y `revisions` se borraron el 10/10), pero el sistema lee los porqués guardados y `/api/design-md` superpone las revisiones guardadas |
| Unas 38 clases de `globals.css` sin uso literal (`topbar__*`, `picker-*`, `field__label`, `pn-bar*`, `ws__user`, `modal--sm`…) | Algunas se montan con plantillas (`cm-atts--${n}`, `pv__photos--${n}`, `cr-btn-${size}`); comprobar cada una antes de borrar |
