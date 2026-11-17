---
title: El paso 1 de la landing es un corro de fuentes alrededor de Tino
date: 2026-11-17
status: vigente
kind: diseño
---
**Contexto.** El paso 1, "Bring in what you already saved", ponía las seis fuentes en una fila con sus referencias encima y debajo, sueltas. Se exploraron cuatro direcciones (`design-explorations/paso-1-fuentes.html`): todo cae en un tablero, Tino en el centro, una tarjeta por fuente con cómo se trae, y la frase como menú.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`, `.src4` es un círculo de verdad: un círculo discontinuo de radio `--R` (`clamp(230px, 20vw, 350px)`) con Tino en el centro, y las seis etiquetas sobre él, tres a cada lado, por ángulo (`--a`: Are.na 220°, Pinterest 180°, Cosmos 140° a la izquierda; X 320°, Extensión 0°, Archivos 40° a la derecha; colocadas con `cos()` y `sin()` de CSS). Cada fuente (`.src4-node`) es su etiqueta (`.src4-ic`, logo y nombre, de relleno sin borde como pide la landing) y, a su lado hacia fuera (`--side`, `--off`), sus dos referencias del río en abanico (`.src4-pair`), que salen de la etiqueta al llegar. Las referencias van sin la barra de dirección de arriba (`.rc-bar` oculta): solo la imagen, su etiqueta y, en las impresas, su pie. En el centro hay un hueco (`#src-slot`) y el Tino 3D que baja contigo se planta en él, como en las preguntas: la ruta de Tino trata los dos huecos igual y le atrae el que está en pantalla. Al llegar te mira y dice su frase, que vive en el HTML (`data-s`): "Everything in one place. I read every one." y "Todo en un solo sitio. Me las leo todas.". En teléfono, Tino arriba y las fuentes en dos columnas debajo.

Dos arreglos que salieron al probarlo: callar la frase de un paso (`speak("")`) ya no borra una réplica suelta que Tino esté diciendo, y el aviso del río que lo hace callar solo actúa en la portada.

**Por qué.** Alberto eligió la dirección B ("let's try B"), con el Tino de verdad en el centro y no una imagen ("one Tino on screen, never two"), y las seis fuentes con referencias, no cuatro. Después: "make this section a bit bigger (a real circle) and remove the top address that every item has".

**Cómo aplicarlo.** Un sitio nuevo donde Tino tenga que plantarse al bajar es otro hueco en la ruta (`pull`), no otra animación aparte. Nunca dos Tinos en pantalla.
