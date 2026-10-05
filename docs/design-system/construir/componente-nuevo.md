# Añadir un componente

1. **Busca antes** en [Componentes](../componentes.md). Si algo se parece, extiéndelo con una variante en vez de crear otro.
2. **Primitivas**: para diálogos, popovers, tooltips, sheets y comandos usa `components/ui/` (shadcn `base-nova` sobre Base UI). Se añaden con `npx shadcn add <pieza>` y toman color de los tokens solos.
3. **Fichero**: `components/Nombre.tsx` + `components/Nombre.css` importado desde el propio componente, con un prefijo de clase corto y único (`.sysdoc-`, `.ds-`, `.gbar-`). Comprueba que el prefijo no exista ya (`polish-` existe porque `pl-` chocaba con planes).
4. **Cliente o servidor**: servidor por defecto; `"use client"` solo si hay estado, efectos o eventos.
5. **Iconos**: lucide para lo genérico; si el concepto es nuestro, dibújalo en la misma mano (16 px, trazo 1,5, `currentColor`) en `area-icons.tsx` o `section-icons.tsx`.
6. **Movimiento**: CSS para hover y entradas cortas; WAAPI para recolocar muchos elementos; GSAP para cascadas y gestos. Siempre con las curvas de los tokens.
7. **Listas grandes**: memoiza, pasa handlers por ref y ventanea.
8. **Acciones**: si el componente añade una acción nueva (archivar, mover, borrar…), añádela también al catálogo del agente en `lib/agent.ts`.
9. **Documéntalo** en `componentes.md`: nombre en castellano, nombre técnico, fichero, qué es y detalles clave.
