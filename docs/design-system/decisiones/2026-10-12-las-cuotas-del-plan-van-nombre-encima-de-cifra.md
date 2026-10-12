---
title: Las cuotas del plan van con el nombre encima de la cifra
date: 2026-10-12
status: vigente
kind: diseño
---
**Contexto.** En Plan y uso, cada cuota ponía su nombre y su cifra en la misma línea, en un tercio de la fila. Con un nombre largo ("Acciones de IA este mes") los dos se partían en dos líneas y quedaban montados. Eric: "mejora diseño de elementos que están encima de otros".

**Decisión.** Cada cuota (`.pl-quota`, `app/settings/plan/page.tsx`) va en columna: el nombre pequeño y apagado (`.pl-quota__label`, `t-small`, `--text-muted`), la cifra debajo en tinta (`.pl-quota__nums`, `t-ui`, `--text`, cifras tabulares) y la barra al final. Ninguno de los dos parte línea: si no cabe, puntos suspensivos.

**Por qué.** Interpretación: la cifra es lo que se viene a mirar, así que lleva la tinta, y el nombre la etiqueta. En columna, todas las cuotas empiezan a la misma altura, tengan barra o no.

**Cómo aplicarlo.** Una cifra con su nombre en una rejilla estrecha va nombre encima y cifra debajo, nunca a los lados.
