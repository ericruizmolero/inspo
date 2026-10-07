# Añadir un componente

1. **Busca antes** en [Componentes](../componentes.md), primero en la pestaña Sistema Criterio (`components/criterio/`, una ficha por export). Si algo se parece, extiéndelo con una variante en vez de crear otro; las piezas pequeñas nuevas copian el bisel, el pozo o la línea grabada de las que ya existen.
2. **Primitivas**: para diálogos, popovers, sheets y comandos usa `components/ui/` (shadcn `base-nova` sobre Base UI), que ya visten las piezas del sistema (`DialogWindow`, `cr-menu`). Los tooltips son `data-tip` (`TipLayer`), nunca `title` ni el tooltip de shadcn.
3. **Fichero**: `components/Nombre.tsx` + `components/Nombre.css` importado desde el propio componente, con un prefijo de clase corto y único (`.sysdoc-`, `.ds-`, `.gbar-`). Comprueba que el prefijo no exista ya (`polish-` existe porque `pl-` chocaba con planes).
4. **Cliente o servidor**: servidor por defecto; `"use client"` solo si hay estado, efectos o eventos.
5. **Iconos**: lucide para lo genérico; si el concepto es nuestro, dibújalo en la misma mano (16 px, trazo 1,5, `currentColor`) en `area-icons.tsx` o `section-icons.tsx`.
6. **Movimiento**: CSS para hover y entradas cortas; transición CSS de `transform` para recolocar muchos elementos; WAAPI para lo que nace de un punto o necesita control. GSAP no está en el proyecto. Siempre con las curvas de los tokens.
7. **Listas grandes**: ventanea. El React Compiler memoiza solo; no añadas `useMemo`/`memo` a mano salvo que midas que hace falta.
8. **Acciones**: si el componente añade una acción nueva (archivar, mover, borrar…), añádela también al catálogo del agente en `lib/agent.ts`.
9. **Documéntalo** en `componentes.md`: nombre en castellano, nombre técnico, fichero, qué es y detalles clave. Si es una pieza del sistema, su ficha lleva `muestra: nombre` y la muestra se dibuja en `components/design-library/Specimens.tsx` con el componente real, nunca una captura; `npm run check:design-system` comprueba que las dos cosas casan.
