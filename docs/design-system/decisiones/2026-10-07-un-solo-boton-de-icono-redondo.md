---
title: Un solo botón de icono, redondo, en toda la app
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** La app tenía botones de solo icono de varias formas: `.btn-icon` de 32 px transparente, botones de las barras hechos a mano, cerrar de los diálogos. El sistema trajo `IconButton`.

**Decisión.** Todos los botones de solo icono son `IconButton` (`components/criterio`, `.cr-iconbtn`): siempre redondo, un icono y su `label`, que es también el tooltip. Tres variantes: quiet (sin relleno hasta el hover, dentro de barras), default (relleno con línea fina), strong (papel, borde de tinta y bisel, la más importante de su fila). Tallas xs 24, s 32, m 40, l 48. En una tarjeta del tablero todo va en la talla s (botón 34, círculos 32) y el panel del selector es compacto (320 de ancho, 15 px de letra): las tallas del sistema (44, 48, 440) se pensaron para el visor y en la tarjeta se veían enormes.

**Por qué.** Alberto, sobre la tarjeta con las tallas del sistema: "why everything is huge".

**Cómo aplicarlo.** Nada de botones de icono a mano ni `.btn-icon` nuevos. Sobre el cromo, el contenedor lleva `cr-on-chrome`. En una tarjeta, s como mucho.
