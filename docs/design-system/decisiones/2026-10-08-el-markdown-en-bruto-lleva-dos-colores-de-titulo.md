---
title: El criterio.md en bruto lleva dos colores de título, moss para el fichero y sus áreas y ember para las referencias
date: 2026-10-08
status: vigente
kind: diseño
supersedes: El panel de Markdown sigue el tema (06-10), solo en lo que toca a que todos los títulos fueran del mismo color y a que no hubiera color cálido dentro del fichero
---
**Contexto.** El criterio.md en bruto (`SystemMarkdown`, `.mdv`) pintaba todos los títulos, del `#` al `####`, en el mismo moss. Con las referencias dentro del fichero (`### R2 · Tono de la marca` y su `####` debajo), cuatro niveles del mismo verde se leían planos. Eric, 08-10, con una captura del panel oscuro: "el diseño de texto del markdown tiene que ser más atractivo, sumale un color más a substitles".

**Decisión.** Los títulos del fichero en bruto tienen dos colores (`components/SystemMarkdown.css`): `#` y `##`, el fichero y sus áreas, siguen en `--md-head` (moss-light en oscuro, moss en claro); `###` y más hondos, las referencias y lo que cuelga de ellas, van en `--md-head-2`, que es `--ember-glow` en oscuro y `--warning` en claro (el ember del tema Paper, `#94640C`: `--ember` a secas queda por debajo de 3:1 sobre blanco). Las marcas (`###`) llevan el color de su título, como en un editor. El aspecto Documento no cambia: ahí los títulos van en `--text` por tamaño.

**Por qué.** Lo pidió Eric con las palabras de arriba. Que el segundo color sea ember y no otro verde es interpretación nuestra: la paleta no tiene otro color frío, y en el fichero el ember marca lo que entra del tablón (las referencias) frente a lo que es estructura (las áreas). Es una excepción medida a "un punto cálido por vista": dentro del panel el ember es texto de título, no un botón, y el primario de la vista (Mejorar con IA) sigue siendo el único cálido que se pulsa.

**Cómo aplicarlo.** Dos colores de título como mucho, repartidos por lo que significan, no por nivel decorativo: estructura en moss, contenido traído en ember. Un color nuevo dentro de `.mdv` se define en los dos temas a la vez y con un token del sistema, nunca con un valor suelto; sobre blanco se usa la versión del tema Paper del mismo color.
