---
title: La extensión y el MCP van juntos en un menú "Conectores" de la barra superior, que se va cuando los dos están conectados
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** El conector MCP nació con un botón "Conectar" en la cabecera del proyecto, y la barra superior ya tenía "Instalar extensión" como aviso mientras falta la extensión. Eric, 06-10: "¿no es mejor que Conectar MCP esté junto con instalar Extensión? dos botones de conexiones", y después: "que sea Conectar MCP mejor e igual agruparlo en apartado conectores; si están los dos instalados entonces se quita, si está solo 1/2 entonces un tic a ese", y sobre el icono: "el conectar mcp igual tiene que tener otro icono menos evidente".

**Decisión.** Un solo botón **Conectores** (`components/Connectors.tsx`, icono `Plug` de Lucide) en la barra superior, en el sitio del aviso de la extensión. Abre un menú (`.pp--menu.connectors__menu`, 220 px) con dos filas: **Extensión de Chrome** (lleva a instalarla o a conectarla, según falte) y **Conectar MCP** (abre `ConnectDialog`). Cada fila lleva el tic (`.ws__item-check`) cuando está conectada; cuando lo están las dos, el botón desaparece. La fila del MCP usa `Cable` de Lucide, no la chispa, que es la de la IA que genera. En un navegador que no puede llevar la extensión solo cuenta el MCP.

**Por qué.** Las dos son conexiones de la cuenta con el exterior, no acciones del proyecto: van juntas y fuera de la cabecera del proyecto. Principio 9 (menos elementos): un botón, no dos, y ninguno cuando ya no hay nada que conectar, como el aviso de la extensión ya hacía. La chispa en "Conectar MCP" prometía lo que no es.

**Cómo aplicarlo.** Una conexión nueva (otro cliente, otra integración) es una fila más de este menú, con su tic, no otro botón. Los iconos de conexión son de Lucide y quietos (`Plug`, `Cable`); la chispa se reserva a lo que genera con IA.
