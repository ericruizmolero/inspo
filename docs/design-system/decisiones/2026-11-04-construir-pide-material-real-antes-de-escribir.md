---
title: Construir una landing pide material real antes de escribir, aunque la puesta en marcha no pida referencias
date: 2026-11-04
status: vigente
kind: producto
---
**Contexto.** En la prueba del 04-11 las páginas hechas solo con texto salían flojas por los dos lados, con y sin el fichero. Al darle al agente las imágenes de las referencias, los textos reales y las fotos de la marca, con el mismo modelo, Xabier y Zernio dieron un salto grande.

**Decisión.**
- La puesta en marcha sigue sin exigir referencias: alguien puede querer solo guardar su marca.
- Al construir, si no hay referencias, el agente pide 2 o 3 antes de empezar, y avisa una vez si la persona quiere seguir sin ellas.
- Antes de escribir, el agente reúne el material: `read_reference` por cada referencia, los textos del proyecto y las fotos de la marca. `measure_site` devuelve las direcciones de las imágenes de la web.

**Por qué.** Alberto: "without the reference (or multiple ones) it would be more difficult to get this result". Interpretación nuestra: el gusto vive en cómo se ven las referencias, y el fichero solo lo describe.

**Cómo aplicarlo.** Lo que mejora una página llega antes por el material que por el modelo. `measure_site` mide siempre y no guarda nada.
