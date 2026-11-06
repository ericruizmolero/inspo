---
title: Las ventanas de diálogo no llevan barra moss
date: 2026-11-06
status: vigente
kind: diseño
supersedes: 2026-10-07-toda-ventana-lleva-barra-moss-y-sigue-al-tema
---
**Contexto.** Los menús, Añadir, Mejorar con IA, Traer una marca, Ajustes y el proyecto vacío ya habían perdido la barra moss, uno a uno. Quedaba en `DialogWindow` (Conectar MCP, Importar, Compartir la marca, Nuevo equipo, las preguntas de arranque, los comentarios de la página, elegir imágenes de ejemplo) y en las confirmaciones (`useConfirm`). En Conectar MCP la barra repetía el título: "Conectar MCP" encima de "Conecta tu IA".

**Decisión.** `DialogWindow` (`components/ui/dialog.tsx`) lleva la cabecera del modal plano: `.modal__header` con el título (`heading`, ahora obligatorio) en `t-title-s` y cerrar en `IconButton` default s, con la línea `--border` debajo. Desaparece la prop `bar` y la clase `.modal-window__bar`. `AlertDialogContent` (`components/ui/alert-dialog.tsx`) tampoco lleva barra: la pregunta en `t-title-m` es lo primero. Lo demás de la ventana (`.modal--window`: suelo, bisel, tallas, pie con botones s, sigue al tema) no cambia.

**Por qué.** Eric, 06-11, sobre Conectar MCP: "esta banda verde dijimos que a nivel diseño tenía que desaparecer". Interpretación: cada vez que se revisó una pieza con barra moss se quitó; ahora es la regla de todos los diálogos y no una excepción por pieza.

**Cómo aplicarlo.** Un diálogo nuevo es `DialogWindow` con un solo título, o `DialogContent` con `.modal__header` si es un formulario largo; ninguno lleva barra de color. El ejemplo de criterio.md de la portada de invitado (`GuestStart`) tampoco: va en el panel `.mdv`, como el fichero en un proyecto (Eric, 06-11: "que se ajuste al md"; provisional hasta la landing de Andoni). La barra moss (`.cr-window-bar`) solo sigue en `TipWindow` y sus parientes (la ventana del login, el panel de feedback, la tarjeta del agente) mientras no se revisen.
