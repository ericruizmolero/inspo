---
title: El selector de proyecto es primario cuando la referencia ya tiene proyecto
date: 2026-10-07
status: vigente
kind: diseño
supersedes: "don't make the project selection orange" (misma mañana): el botón "En 1 proyecto" y los chips elegidos iban invertidos con el cromo, nunca ember
---
**Contexto.** Por la mañana, Alberto pidió que la selección de proyecto de la tarjeta no fuera naranja: el botón "En 1 proyecto" y los chips elegidos se invertían con el cromo. Por la tarde el sistema trajo su propio `ProjectPicker`.

**Decisión.** El botón del selector (`components/ProjectPicker.tsx`, `.cr-picker`) es primario (ember, con la carpeta) cuando la referencia está en algún proyecto y secundario "Añadir a un proyecto" cuando no. Los chips elegidos siguen invertidos a tinta, nunca ember. El panel es compacto en la tarjeta (320 de ancho, letra de 15).

**Por qué.** Lo decidió Alberto en el propio sistema, al añadir el componente; eso sustituye a lo de la mañana.

**Cómo aplicarlo.** El estado "tiene proyecto" se dice con el primario; "elegido" dentro de una lista se dice invirtiendo a tinta. No mezclar los dos.
