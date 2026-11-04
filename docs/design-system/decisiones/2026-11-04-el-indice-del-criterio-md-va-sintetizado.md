---
title: El índice del criterio.md va sintetizado, una línea por parte y solo las áreas desplegadas
date: 2026-11-04
status: vigente
kind: diseño
---
**Contexto.** Con el criterio.md guiado por fases, el índice lateral de la página Sistema (`.sdoc-toc` en `components/SystemDoc.tsx`) listaba cada sección bajo cinco grupos: Empieza aquí (Empieza aquí, Cómo usar este archivo), El proyecto (El proyecto, Brief, Contenido, En un párrafo), Las 8 áreas, Construir (Por página, Skills para todo el sistema y cada skill encendida) y Apéndice. Más de veinte líneas para un archivo.

**Decisión.** Una línea por parte: Empieza aquí, El proyecto, y tras un hueco Construir, Skills (con cuántas hay encendidas) y Referencias (con cuántas). Solo las 8 áreas se despliegan, bajo su etiqueta "Las 8 áreas", con el punto de estado y las propuestas abiertas como hasta ahora. Cada línea lleva a la primera sección de su parte y sale solo si el archivo la tiene. Fuera las etiquetas de grupo que repetían la primera línea y las filas con chispa de cada skill (`.is-skill`, `.sdoc-toc__spark`).

**Por qué.** Eric, viendo el índice: "ahora veo muchas cosas, hay que hacerlo más sintetizado creo yo". Que las áreas sean lo único desplegado es interpretación mía: son lo que el equipo decide y donde caen las propuestas.

**Cómo aplicarlo.** Una sección nueva del criterio.md no añade línea al índice: cae dentro de la parte a la que pertenece. Solo una parte nueva del archivo (al nivel de Construir o Referencias) gana su línea.
