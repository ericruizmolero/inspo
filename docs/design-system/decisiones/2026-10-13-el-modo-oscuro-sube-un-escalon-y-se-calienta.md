---
title: El modo oscuro sube un escalón y se calienta
date: 2026-10-13
status: vigente
kind: diseño
---

**Contexto.** En la reunión del 13-10 Alberto vio el tema Board demasiado oscuro y sin personalidad, con el buscador sin llamar la atención. El suelo era casi negro (`#0F0F0F`) y todas las capas grises neutros (`#1A1A1A`, `#1C1C1C`, `#2A2A2A`), sin relación con el papel cálido de la marca.

**Decisión.** Cada capa del tema Board sube un escalón y toma un punto cálido, en `app/globals.css`: `--board` `#161614`, `--board-card` `#201F1C`, `--field` `#0F0F0E`, `--chrome` `#1D1C1A`, `--chrome-panel` `#24231F`, `--chrome-raised` y `--border` `#32302C`, `--chrome-border` `#2F2E2A`, `--surface-3` `#3B3A35`, `--border-strong` `#43413B`. El color de la barra del navegador (`themeColor` en `app/layout.tsx`) y el de la app instalada (`app/manifest.ts`) siguen al suelo. Los textos y la paleta de marca no cambian. Es una prueba: falta que la vean Alberto y Andoni.

**Por qué.** Alberto: "el modo este oscuro me parece como que le falta un poco de personalidad todavía", "para mí el modo oscuro me parece muy oscuro", "el buscador no llama la atención, no te invita". Eric: "podemos probar un dark mode un poco más aclarado", y al proponérselo: "si, dale". Interpretación mía: el punto cálido acerca el suelo al papel de la marca (`--paper` `#EDE6D6`), y subir todas las capas a la vez mantiene las distancias entre suelo, tarjeta y cromo, así que nada pierde contraste con su vecino.

**Cómo aplicarlo.** Los grises del tema Board se cambian juntos y al mismo paso, nunca uno suelto. Ninguno es neutro puro: llevan el tinte cálido de la marca. Si un gris oscuro aparece escrito a mano fuera de los tokens (`themeColor`, el manifiesto), cambia con ellos. La imagen de Open Graph (`app/opengraph-image.tsx`) mantiene sus colores hasta que se rehaga con la marca nueva.
