---
title: El enlace comparte solo el tablón, tal cual se ve en la app
date: 2026-11-06
status: vigente
kind: producto
supersedes: 2026-11-06-el-enlace-del-proyecto-comparte-tambien-el-tablon
---
**Contexto.** El enlace `/s/<token>` tenía dos pestañas, Tablón y Sistema. El tablón era una lista propia (`.sboard`): sin zoom, y muchas webs sin captura salían como tarjetas de texto. El Sistema daba la marca y criterio.md para copiar o descargar. Eric, al verlo: "que es esto... el tablón se tiene que ver tal y como es con sus dinámicas de zoom y todo tal cual, solo que es modo preview que no puedes editar nada", "el tablero se tiene que ver igual con todas sus características y todo igual que en la app", "también se podrá abrir los ficheros de cada inspo", y "que se comparta solo el tablero, el MD no".

**Decisión.**
- El enlace enseña solo el tablón: fuera la pestaña Sistema, la presentación, criterio.md, el zip y las fuentes. Se borran sus rutas (`app/s/[token]/md`, `download`, `font`, `fonts`), la ruta de ficheros ya no sirve los de la marca (`shareMayServe`) y el diálogo pasa a "Compartir el tablón".
- El tablón es el de la app: `Grid` y `InspoCard` en modo `readOnly` (`components/brand/ShareBoard.tsx`), con los datos de `loadShareBoard` (`lib/share-board.ts`): capturas por nivel de zoom, portadas, miniaturas y sus copias de tarjeta, todo por el propio enlace.
- Cada tarjeta abre su ficha (`ItemPanel`) de solo lectura; sin conversación, la ficha es solo la referencia.
- Una web sin captura guardada pide su og:image por `app/s/[token]/og` (la misma lógica que `/api/og`, ahora en `lib/og-image.ts`), solo para referencias de ese tablón. Nunca se pide una captura nueva desde un enlace.

**Por qué.** Quien recibe el enlace tiene que ver lo mismo que el equipo; el fichero es para el equipo y sus agentes (palabras de Eric arriba). Lo de no capturar desde el enlace es interpretación nuestra: una captura cuesta y un enlace público no debe poder lanzarla.

**Cómo aplicarlo.** Lo que cambie en el tablón de la app se ve también en el enlace, porque es el mismo componente. Un control nuevo de una tarjeta que edite algo se esconde con `readOnly`.
