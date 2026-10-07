---
title: El cromo de arriba vuelve a 44 px, con 14 px de letra y pastillas de cristal
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Con el sistema Criterio, la Isla y el selector de vista pasaron a pestañas de 38 px con Archivo a 15 px (`--fs-ui`) dentro de una pastilla de 5 px de relleno y borde: 50 px de alto, frente a los 44 de antes (pestañas de 34, Inter a 14). Y el relleno de la pestaña activa y del hover pasó a un gris sólido (`--chrome-raised`), sin el cristal que tenían.

**Decisión.** Solo en el cromo de arriba (`.island` y `.topbar__switch`, en `app/globals.css`): pestañas, avatar del espacio y botones de icono de 34 px, letra a `--fs-chrome` (14 px, definida en `.topbar`), relleno de 4 px y radio 14: 44 px en total. Las pastillas de `Liquid` (hover y activa) llevan cristal: `--glass-hover` y `--glass-on` (luz translúcida sobre el cromo, oscura en Paper), `--glass-blur` (desenfoque y saturación) y `--glass-line` (una línea de luz arriba); con las pastillas corriendo, el segmento no pinta su propio fondo. Las barras siguen sólidas: el cristal es de las pastillas, no del contenedor. El resto del producto queda en la escala del sistema (controles de 44).

**Por qué.** Eric, 07-10: "la tipografía igual es demasiado grande comparado con antes", "hace que el navbar quede bastante más alto", "aproximémonos a lo de antes en tamaños" y "recuperemos el liquid glass que teníamos antes en los hoverings de pastillas". Interpretación mía: la barra se lee a diario y un paso más de escala ahí pesa más que en un botón; el cristal del hover era parte de la sensación de fluidez de la Isla.

**Cómo aplicarlo.** Lo que se añada a la Isla o al selector mide 34 y usa `--fs-chrome`; su hover y su activo son las pastillas de `Liquid` con los tokens `--glass-*`. Matiza el "sin cristal" de [sistema Criterio](2026-10-07-sistema-de-diseno-criterio.md): sigue valiendo para barras y superficies, no para estas pastillas.
