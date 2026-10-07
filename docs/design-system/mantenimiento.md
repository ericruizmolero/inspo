# Mantenimiento técnico

Qué tocar y en qué orden cuando cambia algo de base.

## Lista

1. **Tokens**: en `app/globals.css` (`:root` y `:root[data-theme="light"]`), y la tabla de su página de [Tokens](fundamentos.md) (`fundamentos/color.md`, `tipografia.md`…) en el mismo cambio; la muestra de `/library` lee el valor del CSS vivo, así que se actualiza sola.
2. **Componentes reutilizables**: en `components/`, con su CSS propio, y su ficha en [Componentes](componentes.md).
3. **Textos**: en `lib/i18n/en` y `lib/i18n/es` a la vez.
4. **Base de datos**: cambiar `lib/db/schema.ts`, `npm run db:generate`, revisar el SQL en `drizzle/`. La migración corre en el build de Vercel: si falla, no se despliega. Añadir la tabla nueva a `scripts/seed.ts` (padres primero).
5. **Decisiones**: un fichero en `docs/design-system/decisiones/` por cada una.
6. **Comprobar**: `npx tsc --noEmit` siempre; `npm run build` si tocaste configuración, rutas o `next.config.ts`; los `npm run check:*` del área que tocaste (`check:system`, `check:locale`, `check:usage`…); si tocaste `docs/design-system/` o `components/criterio/`, `npm run check:design-system` (muestras, fichas, enlaces y decisiones).
7. **Desplegar**: push a `main` despliega producción (Vercel, Frankfurt); cada PR tiene su preview con su rama de Neon. La fusión del PR la hace una persona.

## Pendiente de limpiar

Código que existe pero no se ve. No construir encima sin una decisión nueva.

| Qué | Por qué sigue |
| --- | --- |
| Prop `onOpen` de `SystemDoc` | Se pasa pero nunca se llama |
| Variante `drawer` de `CommentsPanel` | Solo se usa `column` |
| `ui/tooltip.tsx`, `ui/skeleton.tsx` y varios exports de `ui/sidebar` | Vinieron con shadcn; nadie los pinta |
| Atajo "/" de `SearchBox` | Nadie pasa la prop `shortcut` |
| CSS que quizá quedó huérfano en `globals.css` (`.sysn-*`, `.sysv-*`, `.card-item`) | Del mar de nodos y del masonry anterior; comprobar antes de borrar |
| `lib/canvas.ts` y la tabla `canvas_position` | Del canvas infinito, sustituido por `Grid` |
| `lib/design-md`, `/api/design-md`, rutas de "En vivo" | DESIGN.md retirado; las portadas antiguas aún pintan tarjetas |
| Columna `anchor` de comentarios | De los post-its retirados |
| "savvia.studio" en `GuestStart` y un comentario a `LoginGate` en `LoginForm` | Restos del nombre y de una versión anterior del login |
| Dos sistemas de botón: `.btn` y sus variantes en `globals.css` (los usa `components/ui/button.tsx` y una docena de componentes) y `Button` del sistema (`cr-btn`) | Misma pinta, dos CSS; lo nuevo va en `Button` del sistema y lo viejo se migra al tocarlo |
| `.btn-icon` (`globals.css`) y la variante `icon` de `ui/button.tsx` | Sustituidos por `IconButton`; ya no los pinta nadie |
| `.input` y `.pill` en `globals.css` | Dos usos cada uno; `TextField` y `Chip` del sistema los sustituyen |
| `Avatar` y `hueFor` de `CommentsPanel.tsx` | Un segundo avatar al margen de `Avatar` y `toneFor` del sistema (tonos moss, butter, ember); unificar |
| Alias de tokens viejos (`--bg`, `--panel`, `--surface*`, `--text-2`, `--dock-*`) | Apuntan a los tokens del sistema; lo nuevo usa los nombres del sistema y los alias se retiran cuando no quede CSS que los lea |
| `cr-tabbar`, `cr-tab`, `cr-cmdbar`, `cr-composer`, `cr-art` en `criterio.css` | Portados del bundle del sistema sin uso en la app (la Isla, el dock y el compositor tienen su propio CSS) |
