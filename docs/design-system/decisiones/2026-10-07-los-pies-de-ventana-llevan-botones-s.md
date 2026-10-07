---
title: Los pies de ventana llevan botones de talla s
date: 2026-10-07
status: vigente
kind: diseño
---

**Contexto.** La tabla de tallas decía "ventanas" en s y, a la vez, "pies de diálogo" en m. Las cuatro ventanas con pie de Cancelar y acción (nueva inspo `components/AddInspoModal.tsx`, mejorar con IA `ImproveModal.tsx`, nuevo equipo `CreateTeamDialog.tsx` y las confirmaciones de `useConfirm.tsx`) llevaban `Button` en m (44 px), y en la de nueva inspo los dos botones pesaban más que cualquier otra cosa de la ventana.

**Decisión.** En un pie de ventana (`.modal__footer`) los botones van en talla s (34 px): `size="s"` en los `Button` de las tres ventanas, y `AlertDialogCancel` y `AlertDialogAction` (`components/ui/alert-dialog.tsx`) lo llevan por defecto, así toda confirmación lo hereda. La fila de la tabla de `botones.md` pasa "pies de diálogo" de m a s; m queda para páginas y vistas.

**Por qué.** Eric, 07-10, con la ventana de nueva inspo: "aquí el botón de guardar/cancelar es muy grande creo no?". Interpretación: una ventana es una pieza compacta y sus controles siguen la talla de la ventana (ya lo hacían la equis, los chips y los menús); la regla de "pies de diálogo en m" era un resto de antes del sistema.

**Cómo aplicarlo.** Cualquier ventana nueva con pie usa `Button` en s para todas sus acciones (misma talla en la misma barra). Las acciones de página (empezar un proyecto, el héroe del login) siguen en m o l según la tabla.
