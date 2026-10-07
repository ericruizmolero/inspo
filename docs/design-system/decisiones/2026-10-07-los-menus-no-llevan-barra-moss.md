---
title: Los menús no llevan barra moss ni bisel, y su texto es de 14
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Con el sistema nuevo, el menú del espacio (`WorkspaceMenu`) y el de nuevo proyecto de la Isla abrían con una barra verde moss arriba ("Workspaces", "Nuevo proyecto"), la misma de las ventanas (`MenuLabel bar`, `.cr-menu-bar`).

**Decisión.** Los menús de la app no usan `bar`: su título es el encabezado discreto (`MenuLabel` sin `bar`, `.cr-menu-heading`, 12 px, `--text-2`). Cambiado en `components/WorkspaceMenu.tsx`, `components/Island.tsx` y en la muestra de `/library` (`Specimens.tsx`). La clase `.cr-menu-bar` sigue en `criterio.css` para la librería, pero no se usa en producto. Y el marco del menú (`.cr-menu`) pasa de 1,5 px con bisel (`--bevel` / `--bevel-dark`) a 1 px con solo la sombra (`--shadow-popover` / `--shadow-pop`), en los dos temas. Las filas (`.cr-menu-item`) bajan de `--fs-ui` (15) a 14 px en bruto, la única talla fuera de la escala 17/15/13/12 (13 se quedaba corto); encabezados, "Gestionar" y el plan ya estaban a 12 y 13. Va con la misma decisión del día sobre Añadir: tampoco lleva la ventana moss.

**Por qué.** Eric, sobre el menú del espacio: "aquí la pill verde arriba tampoco me gusta". Y después, sobre el marco: "el border retro está como muy pronunciado, ¿no?". Y sobre el cuerpo: "¿puede que los textos de menú sean un poco grandes?", y tras verlos a 13: "sube a 14 igual mejor". Antes, sobre Añadir: "lo verde de arriba no me convence".

**Cómo aplicarlo.** La barra moss queda para avisos y confirmaciones (`TipWindow`, `useConfirm`, Conectar MCP, ventanas de Ajustes). Un menú o un formulario que cuelga de la Isla se titula en pequeño y gris, nunca con la barra, su marco es una línea de 1 px con sombra, y sus filas van a 14 px; el bisel es de ventanas y botones.
