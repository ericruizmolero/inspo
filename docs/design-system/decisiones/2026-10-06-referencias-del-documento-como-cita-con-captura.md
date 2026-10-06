---
title: En el Documento una referencia es una cita con su captura grande, sin aro ni barra
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** En el aspecto Documento de criterio.md, cada referencia citada en un área llevaba una miniatura de 84×56 con un aro claro y sombra, el código (R132) en negrita igual de fuerte que el nombre, el nombre subrayado y cada comentario con su barra vertical. La captura no se reconocía y todo pesaba lo mismo. Eric, 06-10: "cómo se muestran las imágenes en documento hay que mejorar el diseño".

**Decisión.** En `components/SystemDoc.css` (bloque `.mdv--doc .mdv-ref`):
- La captura pasa a 144×90 (16:10, la proporción de una primera pantalla), radio 10, con solo la línea `--border`; sin aro claro ni sombra. Tamaños en variables (`--ref-w`, `--ref-h`, `--ref-gap`, `--ref-in`); en móvil 96×60.
- Jerarquía por peso y color: el código es una etiqueta callada (12 px, `--muted`), el nombre es el título de la fila (550, `--text`, sin subrayar hasta pasar el ratón) y lo que se toma va en `--text-2`.
- Lo que se dijo sobre la referencia va debajo, a 14 px en `--muted`, alineado con el nombre y sin barra vertical: las comillas ya dicen que es una cita.
- La captura es un `float` metido en el padding de la fila y la fila siguiente lleva `clear`: una referencia con poco texto nunca se monta sobre la de abajo, se diga lo que se diga. Sigue pintándola la propia línea desde `--pic`, sin añadir nada al texto.

**Por qué.** La cita de Eric. La forma es propuesta mía, pendiente de que la vea: principio 1 (jerarquía con peso y color, no con bordes) y principio 9 (menos elementos, cada uno pulido). Comprobada en una maqueta con el CSS real, en oscuro, claro y ancho de móvil.

**Cómo aplicarlo.** Una imagen que acompaña a un texto se enseña a un tamaño en el que se reconoce, o no se enseña. En una fila con imagen manda un solo elemento (el nombre); el resto baja de peso o de color. Lo que la app dibuja sobre el fichero sale del CSS de la línea, nunca de texto añadido.
