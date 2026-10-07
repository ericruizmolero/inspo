---
title: El atajo "/" del buscador va plano, sin fondo de papel ni bisel
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Al entrar el sistema de diseño, el "/" que recuerda el atajo del buscador pasó a ser `Key` (`.cr-key`): una tecla con fondo de papel y bisel. En el dock del tablón, sobre cromo oscuro, salía como un cuadrado claro al final del campo. Antes del sistema era un glifo apagado con una línea fina.

**Decisión.** Sigue siendo `Key` (misma pieza, misma talla de 20), pero `.search__kbd.cr-key` en `app/globals.css` le quita el fondo y el bisel: `background: none`, `box-shadow: none`, color `--muted-2` y borde `--border`; en el dock (`.sb--dock`), color `--chrome-muted` y borde `--chrome-border`. El `Key` con bisel sigue para el resto de atajos (Pulido, ayuda de teclas).

**Por qué.** Eric, 07-10, sobre el dock: "aquí el / ponlo como teníamos antes sin background blanco". Interpretación: la pista de atajo es secundaria y no debe pesar más que el placeholder del campo.

**Cómo aplicarlo.** Un atajo dentro de un campo se insinúa (glifo apagado, línea fina), no se pinta como tecla física. La tecla con bisel queda para listas de atajos y respuestas donde la tecla es la acción.
