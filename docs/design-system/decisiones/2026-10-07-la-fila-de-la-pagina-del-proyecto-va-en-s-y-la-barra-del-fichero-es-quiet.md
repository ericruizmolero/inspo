---
title: La fila de la página del proyecto va en talla s y la barra del fichero vuelve a ser quiet
date: 2026-10-07
status: vigente
kind: diseño
---

**Contexto.** Tras fusionar el sistema Criterio, la página del proyecto (`components/SystemView.tsx`) llevaba las pestañas Markdown, Documento y Presentación, "Mejorar con IA" y el "…" en talla m (44 px), y la barra del fichero (`components/SystemMarkdown.tsx`, `FileMenu.tsx`, `SkillsMenu.tsx`) había pasado de los botones sin contorno de la víspera a `Button` secundario de papel: Proponer, Comentar, Skills y Copiar en blanco sobre el chrome oscuro.

**Decisión.** La fila entera de la cabecera va en s: `SegmentedControl size="s"`, los `Button` de la fila con `size="s"` (icono 16) y el "…" como `cr-iconbtn-s`. Los botones de la barra del fichero son `Button` quiet s (`btn btn--sm btn--quiet mdv-btn`): sin contorno ni papel, con un relleno suave en reposo (`--md-fill`, 7 % de la tinta del chrome) y más fuerte en hover o cuando el modo está activo (`--md-fill-2`, 13 %), definidos en `components/SystemMarkdown.css` con los tokens del fichero y redefinidos en claro sobre `--text` (6 % y 11 %). El botón partido de Copiar separa sus dos mitades 1 px, como ayer.

**Por qué.** Eric, 07-10, con la captura: "los tabs de arriba tienen que ser más pequeños y el mejorar con la IA también" y "las chips dentro de la card de markdown creo que no tienen que ser con fondo blanco, mejor algo parecido a como teníamos ayer". Interpretación: dentro de una tarjeta de chrome los controles son del chrome (quiet), y el papel se reserva para las acciones de la página; la cabecera no debe pesar más que el nombre del proyecto.

**Cómo aplicarlo.** Dentro de un panel de chrome (la barra del fichero, el dock, la Isla) los botones son quiet y leen los tokens de ese panel; el `Button` de papel no entra en el chrome. En una misma fila, todos en la misma talla; la fila de una cabecera de página va en s.
