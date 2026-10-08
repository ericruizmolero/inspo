---
title: La librería enseña cada familia de tokens en su propia página, con la muestra encima de las reglas
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** `/library` tenía una sola página de Tokens: un bloque de muestras arriba y después un Markdown largo con todas las tablas (color, tipografía, radios, movimiento, cortes, capas). Las decisiones visuales se leían más que se veían, y Botones y Marca no tenían sitio propio.

**Decisión.** Fundamentos se parte en una página por familia, cada una con su muestra viva encima y sus reglas debajo: `fundamentos/color.md` (paleta con el cambio de tema y las parejas texto sobre suelo), `tipografia.md` (familias y escala), `espaciado.md` (escala y la altura única de los controles), `radios-y-sombras.md` (radios, bisel, sombras), `movimiento.md` (curvas, keyframes, pulsar), `iconos.md` (los tres juegos) y `pantalla.md` (cortes a escala, capas en escalera, foco). `fundamentos.md` queda como índice de Tokens. En Componentes entran `botones.md` (la matriz de variantes y tallas, estados, el botón de icono) y `marca.md` (criatura, favicon, nombre, colores de marca) delante del catálogo. La clasificación sigue la de la librería de Neety (neety.treseiscero.app/library): Introducción, Fundamentos por familia, Componentes con Botones y Marca aparte, Mantenimiento. Las muestras las dibuja `PageSpecimen` (`components/design-library/Specimens.tsx`) por slug; `lib/design-system.ts` registra las páginas y `scripts/check-design-system.ts` también revisa `fundamentos/`.

**Por qué.** Eric: "en el sistema de diseño tiene que venir reflejado las decisiones visuales de diseño, paleta de colores, typo, y demás, de forma visual", y "te puedes basar en esta clasificación de espacios" de Neety, "para tener en cuenta contenido, no diseño". Interpretación nuestra: una familia por página deja ver cada decisión con su muestra al lado, sin bajar por una tabla de 40 filas.

**Cómo aplicarlo.** Un token nuevo va a su página de `fundamentos/` y, si cambia lo que se ve, a su muestra en `Specimens.tsx`. Una familia nueva es una página nueva con su muestra, no una sección más en otra. No volver a juntar todo en una sola página.
