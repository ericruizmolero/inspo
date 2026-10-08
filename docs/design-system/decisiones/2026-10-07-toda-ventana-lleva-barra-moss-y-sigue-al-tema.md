---
title: Las ventanas de aviso y confirmación llevan barra moss y siguen al tema
date: 2026-10-07
status: vigente
kind: diseño
supersedes: "los menús son ventanas de papel siempre" (misma tarde)
---
**Contexto.** Los diálogos eran paneles de shadcn. El sistema trae `TipWindow`: barra moss con título corto, cerrar con bisel, cuerpo y pie. Primero se adoptó para todos los modales y para los menús, en papel siempre; después Alberto pidió la versión oscura y Eric quitó la barra moss de los menús y de Añadir.

**Decisión.** Los avisos y las confirmaciones tienen la forma de `TipWindow`: `DialogWindow` (`components/ui/dialog.tsx`, `.modal--window`) con barra moss (`bar`) y cerrar en `IconButton` strong xs, `heading` en display 700, cuerpo y `footer` con como mucho dos botones; las confirmaciones (`useConfirm`) son ventanas con `Button` danger cuando destruyen; Conectar MCP (680 de ancho), las secciones de Ajustes y Actividad (`SettingsWindow`) y el asistente de proyecto nuevo también. Las ventanas siguen al tema: en Paper son papel y tinta; en Board un panel oscuro con texto papel, el bisel oscuro y un borde que se ve sobre el velo. La barra moss, el cerrar strong y los botones de papel no cambian; el tooltip sigue de mantequilla. Los menús (`.cr-menu`) comparten el suelo de la ventana (papel en Paper, oscuro en Board) pero no la barra: su título es discreto. Un formulario largo (Añadir) no es una ventana moss: va en el modal plano.

**Por qué.** Alberto: "make a dark mode of the modal". Eric, sobre los menús: "la pill verde arriba tampoco me gusta"; sobre Añadir: "lo verde de arriba no me convence".

**Cómo aplicarlo.** Un aviso o una confirmación nueva es `DialogWindow`; un menú nuevo lleva `cr-menu` y `MenuLabel` sin `bar`; un formulario largo es `DialogContent` con `.modal__header`. Dentro de una ventana o un menú, los textos usan los tokens que la ventana redefine (`--text`, `--text-2`, `--surface-2`), nunca `--ink` ni `--disabled`. → [los menús sin barra](2026-10-07-los-menus-no-llevan-barra-moss.md), [Añadir en el modal plano](2026-10-07-anadir-es-el-modal-plano-con-el-formulario-empaquetado.md), [dentro de un menú](2026-10-07-dentro-de-un-menu-el-texto-usa-los-tokens-del-menu.md)

**Nota (misma tarde).** Las secciones de Ajustes y Actividad (`SettingsWindow`) dejaron de ser ventanas: van planas, sin barra moss. → [Ajustes planos](2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md)
