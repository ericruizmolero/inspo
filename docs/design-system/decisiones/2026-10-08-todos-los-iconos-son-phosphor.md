---
title: Todos los iconos son Phosphor
date: 2026-10-08
status: vigente
kind: diseño
supersedes: 2026-10-03-iconos-propios-por-area.md, 2026-10-07-cada-icono-conserva-su-trazo.md
---
**Contexto.** La app mezclaba tres juegos dibujados a mano (el `Icon` del sistema a trazo 2 sobre 24, los de área y los de sección a 1,5 sobre 16), Lucide para lo que faltaba y SVG sueltos en cada componente.

**Decisión.** Un solo juego: Phosphor (`@phosphor-icons/react`, entrada `/ssr`), peso `regular`. `Icon` en `components/criterio/index.tsx` traduce cada `IconName` a su glifo de Phosphor; `areaIcon` (`components/area-icons.tsx`) y `sectionIcon` (`components/section-icons.tsx`) también. Lucide sale del proyecto. Las flechas de los `select` en CSS y los iconos de la extensión de Chrome usan los mismos trazados de Phosphor. Quedan fuera las marcas de terceros (Google, Apple, X, Pinterest) y los dibujos que no son iconos (anillos de progreso, gráficas, miniaturas de área, la curva de movimiento, la construcción del logo).

**Por qué.** Alberto: "replace all icon with phospor icon".

**Cómo aplicarlo.** Un icono nuevo se añade como entrada de `ICONS` (o de `areaIcon` / `sectionIcon`) con su glifo de Phosphor; nunca un `<svg>` a mano. El peso se cambia con la prop `weight`, solo como excepción: `fill` en `play` y en el brillo de Polish, `bold` en las marcas de casilla pequeñas.
