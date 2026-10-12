---
title: El proyecto vacío es una tarjeta plana, sin barra moss, con el nombre como título
date: 2026-10-12
status: vigente
kind: diseño
supersedes: la parte del asistente de proyecto vacío (`ProjectStart`) de "toda ventana lleva barra moss y sigue al tema"
---
**Contexto.** Un proyecto sin referencias abre `ProjectStart` (`components/ProjectStart.tsx`): era una `.cr-window` con barra moss y el nombre del proyecto, los pasos en un pozo hundido con la tecla de papel en relieve, un `h2` que repetía el paso ("¿De qué va?" bajo la pestaña "De qué va"), "Opcional" dos veces (en la entradilla y en una `StatusBar` del pie) y bisel en todo el marco.

**Decisión.** La pieza es una tarjeta plana: `cr-card cr-card-raised` (`--surface-raised`, línea de 1 px `--border`, `--radius-lg`, sin bisel), sin `.cr-window` ni sus tokens. El nombre del proyecto es el `h1` de la tarjeta en `t-title-m`. Los pasos van sin pozo ni borde: pastillas de 32 con radio `--radius-sm`, la actual en el cristal de la Isla (`--glass-on`, texto `--text` en 600) como la fila viva de Ajustes, las demás en `--text-2`. Sin `h2` por paso: los pasos ya nombran cada pantalla, queda solo la entradilla (`startAboutTitle` y `startRefsTitle` se borran de `lib/i18n`). El estado del pie es texto apagado `t-small` con `role=status`, sin `StatusBar`; "Opcional" solo está ahí. Rellenos de 24 a los lados (16 en móvil). `components/ProjectStart.module.css`.

**Por qué.** Eric, 12-10: "mejora estas cards. la banda verde out. mira sistema diseño". La lectura del sistema (interpretación): principio 1, las tarjetas son planas con una línea `--border` como mucho y nada de pastillas dentro de cajas; principio 5, la pastilla activa es de cristal; y el precedente de Ajustes, donde la barra moss ya se quitó por "too much".

**Cómo aplicarlo.** Una pantalla que se queda en la página (no un aviso que se cierra) no lleva barra moss: es una `Card` raised con su título dentro. La barra moss queda para lo que de verdad es una ventana (`DialogWindow`, `TipWindow`). Un selector de pasos o pestañas dentro de una tarjeta usa el cristal para el activo, no la tecla de papel en un pozo. No repetir en un título lo que ya dice el paso ni la misma palabra en entradilla y pie.
