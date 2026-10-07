---
title: El comando de instalar una skill va en un pozo hundido, sin papel ni en Copiar
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Al entrar el sistema, la línea `npx skills add …` de cada tarjeta de Skills en Descubrir pasó a ser un `Button` secundario de papel entero (`.btn .btn--sm`). En Board, nueve bloques de papel por pantalla pesaban más que los propios nombres de las skills. Antes del sistema era una tira plana del color del fondo con el comando apagado y un "Copiar" pequeño sobre `--surface-2`.

**Decisión.** Un intermedio, en `components/Discover.css` (`.disc-skill__install`): un pozo hundido en la tarjeta (fondo `--field`, línea de 1 px `--border`, radio `--radius-md`, 34 de alto, sin bisel) con el comando en mono apagado (`--muted`, `--fs-label`), y la palabra Copiar como tecla pequeña en el gris de la propia tarjeta (24 de alto, `--surface-2` con `--text-2`, radio `--radius-sm`), sin papel. Hover: línea `--border-strong`, comando en `--text-2` y la tecla sube a `--surface-3` con `--text`; copiado: la tecla pasa a moss (`.is-copied`). Una primera versión dejó Copiar en papel y Eric la corrigió en el acto. El botón deja de llevar las clases `.btn`.

**Por qué.** Eric, 07-10: "de esta view veo mucho tag blanco que hace que a nivel diseño no de placer, busquemos un intermedio con respecto a lo que teníamos antes" y, sobre la tecla, "el botón de copiar no tiene que ser blanco tampoco". Interpretación: en una cuadrícula de tarjetas, el papel no se repite; lo que es secundario en cada tarjeta se queda en los grises de la tarjeta.

**Cómo aplicarlo.** Cuando algo se repite en cada tarjeta de una cuadrícula, no lleva papel: ni el bloque ni su acción. Una fila de contenido con una acción dentro = pozo (`--field` y `--border`) + tecla pequeña en `--surface-2`. El papel queda para la acción única de la vista o de la tarjeta destacada.
