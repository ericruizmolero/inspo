---
title: Si le pides a Tino un cambio sin decir hacia dónde, pregunta con opciones en vez de inventarlo
date: 2026-11-04
status: sustituida
kind: producto
---
**Contexto.** En la página Sistema, lo que se le escribe a Tino en la caja va a `/api/system/edit` y vuelve como propuestas bajo cada área. La instrucción del modelo (`EDIT_SYSTEM`) le pedía seguir el cambio sin negarse y sin añadir nada que no se pidiera. Con una frase como "cambia la iconografía", que nombra el área pero no la dirección, el modelo o se inventaba una (iconos rellenos, por ejemplo) o devolvía que no había nada que cambiar, y en los dos casos se gastaba una pasada de IA. Se le propuso a Eric que Tino preguntara, y contestó: "eso es. perfecto".

**Decisión.**
- En la misma llamada (sin gastar otra), `EditSchema` (`lib/system/edit.ts`) trae `ask`: cuando el cambio nombra un área pero no dice qué debe ser, no hay `edits` y sí una pregunta (`question`, 10 palabras como mucho), cómo está el área ahora (`now`, con sus valores concretos) y de 2 a 4 direcciones (`options`: `label`, la decisión entera tomada por ese camino y su porqué), sacadas de las referencias y del brief. Las reglas están en `EDIT_SYSTEM` (`lib/system/prompts.ts`, "When the change does not say which way").
- Tino lo dice desde la caja (`DockSay.options` en `components/TinoDock.tsx`): la pregunta de título, cómo está ahora debajo y las opciones como `Chip` de papel. Al pulsar una, `pick` en `components/SystemDoc.tsx` la deja como propuesta suya bajo el área ("Rellenos. Así quedaría iconografía.", `t.tino.whichPicked`), con las líneas de Nunca del área tal cual, y la página baja hasta ella. Se acepta o se deja como cualquier propuesta.
- Un cambio que sí dice hacia dónde sigue como antes: propuesta directa.

**Por qué.** Eric: "eso es. perfecto", a la propuesta de que Tino preguntara "¿hacia dónde?" con opciones sacadas del área y del tablón. Interpretación nuestra: un cambio inventado que nadie pidió es peor que una pregunta, y las opciones enseñan lo que se puede pedir.

**Cómo aplicarlo.** Cualquier petición en palabras a un modelo que pueda llegar sin dirección se resuelve igual: la misma llamada devuelve la pregunta con opciones listas para usar, nunca una suposición.
