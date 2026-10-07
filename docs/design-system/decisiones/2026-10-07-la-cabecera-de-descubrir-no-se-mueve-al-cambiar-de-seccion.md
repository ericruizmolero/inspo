---
title: La cabecera de Descubrir no se mueve ni un píxel al cambiar de sección
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Las tres secciones de Descubrir comparten la misma cabecera (título, entradilla y fila de pestañas), pero cada una la monta en su propia columna. En Ejemplos la columna de las tarjetas (`.tpls-inner`) separa sus piezas con un hueco de 18 px y anulaba los márgenes de la fila; en Recursos y Skills la fila lleva 24 px por arriba y 32 por abajo. Al pasar de Ejemplos a Recursos la barra entera bajaba 6 px.

**Decisión.** En `components/Discover.css`, la fila dentro de la columna de Ejemplos devuelve el hueco de la columna (`--tpls-gap`, definido en `components/SystemMarkdown.css`) con `margin: calc(var(--space-5) - var(--tpls-gap)) 0 calc(var(--space-6) - var(--tpls-gap))`, de modo que título, entradilla y fila quedan a la misma altura en las tres secciones. Las tres columnas ya compartían el mismo relleno superior (132 px).

**Por qué.** Eric, 07-10: "cuando pasamos de ejemplos a recursos parece que la barra entera se baja unos píxeles, eso hay que tener cuidado". Interpretación: una cabecera compartida es una sola pieza; si se mueve, las pestañas parecen otra página.

**Cómo aplicarlo.** Cuando varias vistas comparten cabecera y cada una vive en su contenedor, se comprueba que relleno, huecos y márgenes den la misma altura en todas; cambiar de pestaña no mueve nada por encima del contenido. Si una entradilla puede ocupar dos líneas en una sección y una en otra, se acorta o se reserva su altura.
