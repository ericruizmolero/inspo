---
title: La demo de la landing es una sección por paso, sin scroll atrapado
date: 2026-11-10
status: vigente
kind: diseño
---
**Contexto.** La portada de marketing era un bloque fijado de unas siete pantallas: la página se quedaba quieta y el scroll movía la importación, el Tablero, el Pulido y el Sistema. Un primer arreglo la reprodujo sola en una sola pantalla, pero si bajabas rápido no se veía nada: el producto aparecía solo al reproducirse, y el manifiesto seguía fijado y empezaba en blanco.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro` nada se fija. La portada (`.flow` > `.hero`) es una pantalla como se diseñó: titular, frase, formulario, el río de referencias y Tino en el centro leyéndolas; los pasos no la tocan. Después, `.steps4` (`#pasos`) tiene cuatro secciones normales, cada una con su titular y su elemento: 1, las referencias encima y debajo de su fuente (Are.na, Pinterest, Cosmos, X, extensión, archivos; `.src4`, copiadas del río), que salen del logo al llegar; 2, el Tablero; 3, el Pulido; 4, el Sistema con criterio.md. En 2 a 4, `snapSteps` deja una copia quieta de la ventana real al final de su paso, así todas están desde el principio, y la ventana viva (`#win`) entra en la sección que más ocupa la pantalla y reproduce su paso por tiempo (`SEGS`: 4, 12 y 8 s); no se sincronizan, cada una espera a que llegues. El manifiesto tampoco se fija: el texto entero está desde el principio, tenue, y se enciende al bajar. Se quita la ventana que se abría para "Every decision" (tapaba "Read the manifesto"); la de entrada al manifiesto y la del pie se quedan.

**Por qué.** Alberto: "can we remove the trapped scroll in the landing and liberate all the animations"; y después: "all sections should be there from the beginning and while you scroll you see the animations"; "we need to just have every step with their correspondent element"; "still you are mixing the hero with the 1 section… they need to be separate"; "tino should be in the center always in the hero like it was". Eligió una sección por paso frente a una sola sección movida por el scroll o que se reproduce sola.

**Cómo aplicarlo.** Nada en la landing retiene el scroll ni empieza vacío. Lo que cuente un proceso tiene una sección por paso, visible desde el principio, y se anima cuando la miras.
