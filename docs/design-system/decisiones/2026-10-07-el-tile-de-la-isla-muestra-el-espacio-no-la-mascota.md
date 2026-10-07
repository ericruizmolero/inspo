---
title: El tile de la Isla muestra el espacio en el que estás, no la mascota del producto
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Al traer el sistema de diseño del equipo (commit "new design", 4b0aef69), el botón de la izquierda de la Isla pasó a pintar la mascota del producto (`Logo`, el marciano) en vez del avatar del espacio que tenía antes. Eric lo vio el 07-10 con el menú de espacios abierto: la lista enseñaba el logo de Savvia y el botón, el marciano.

**Decisión.** El tile `.island__logo` (26 px, radio 8, sobre `--chrome-raised`) pinta `WorkspaceFace` del espacio activo: su logo si lo tiene, la inicial en su tono si no, y en el personal tu foto. `WorkspaceAvatar` y `WorkspaceFace` (`components/WorkspaceMenu.tsx`) aceptan `size` en px, que manda sobre `small` (20) y el 28 por defecto; la Isla pasa 26. `Logo` sale de `components/Island.tsx`. La marca del producto se queda en la cabecera pública (`/`, `/login`) y en el menú móvil no cambia nada: ya mostraba el espacio.

**Por qué.** Eric, 07-10: "ahí tiene que aparece el logo del espacio en el que estás". Interpretación: la Isla dice dónde estás (espacio y proyectos abiertos); la marca del producto no aporta dentro de la app, donde ya se sabe en qué producto estás.

**Cómo aplicarlo.** Dentro de la app, el cromo representa el espacio (logo o foto), no el producto. El marciano solo en las páginas públicas y en el icono de la app. Cualquier avatar de espacio pasa por `WorkspaceFace`, nunca por `Logo` ni por una imagen a mano.
