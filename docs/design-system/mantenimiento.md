# Mantenimiento técnico

Qué tocar y en qué orden cuando cambia algo de base.

## Lista

1. **Tokens**: en `app/globals.css` (`:root` y `:root[data-theme="light"]`), y la tabla de [Fundamentos](fundamentos.md) en el mismo cambio.
2. **Componentes reutilizables**: en `components/`, con su CSS propio, y su ficha en [Componentes](componentes.md).
3. **Textos**: en `lib/i18n/en` y `lib/i18n/es` a la vez.
4. **Base de datos**: cambiar `lib/db/schema.ts`, `npm run db:generate`, revisar el SQL en `drizzle/`. La migración corre en el build de Vercel: si falla, no se despliega. Añadir la tabla nueva a `scripts/seed.ts` (padres primero).
5. **Decisiones**: un fichero en `docs/design-system/decisiones/` por cada una.
6. **Comprobar**: `npx tsc --noEmit` siempre; `npm run build` si tocaste configuración, rutas o `next.config.ts`; los `npm run check:*` del área que tocaste (`check:system`, `check:locale`, `check:usage`…).
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
