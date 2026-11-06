---
title: Conectores se va de la barra cuando todo está conectado, y las apps conectadas se ven desde el menú de la cuenta
date: 2026-11-06
status: vigente
kind: diseño
supersedes: El botón "Conectores" se queda siempre en la barra superior (2026-10-06) e Importar vive en el menú Conectores (2026-10-08)
---
**Contexto.** Desde el 06-10 el botón Conectores se quedaba siempre en la barra, porque era el único sitio para ver las apps con acceso por MCP y desconectar una (Claude no avisa al quitar un conector), y desde el 08-10 llevaba una tercera fila, Importar. Eric, con el menú abierto: "de conectores que estén la extensión y el conectar mcp", "y que si el usuario tiene los 2 conectados entonces que se quite los conectores de ahí", "se quita conectores y la barrita de la izquierda".

**Decisión.**
- El menú de **Conectores** (`components/Connectors.tsx`) tiene dos filas: Extensión de Chrome y Conectar MCP. Importar sale.
- Cuando todo lo que ofrece está conectado (el MCP con al menos una app y la extensión conectada, o la extensión no se ofrece porque el navegador no puede instalarla), el botón no se pinta, ni en la barra ni en el menú de móvil. Hasta saber cuántas apps hay, tampoco: así entra una vez en vez de aparecer y desaparecer.
- La raya entre Conectores y el + (`PillBarSep`) la pinta ahora `Connectors`, así que se va con él; la barra queda con las vistas del proyecto, una raya y el +.
- Las apps conectadas siguen a mano: el menú de la cuenta (`components/WorkspaceMenu.tsx`) lleva una fila **Conectores** (icono `plug`) que abre `ConnectDialog`, con la lista y el botón de desconectar.
- Esa ventana, abierta desde el menú de la cuenta, es Conectores entero: dos pestañas arriba, **Conectar MCP** y **Extensión de Chrome**, la segunda con la misma guía de `/extension/install` (`InstallGuide`). Eric: "cuando hacemos click en conectores en el panel izquierdo tiene que aparecer las guías de MCP y de Extensión de Chrome". Desde el menú de la barra, Conectar MCP sigue abriendo solo la del MCP.
- `ImportDialog` se queda en el código sin entrada. Un tablero se importa pegándolo en Añadir (`AddInspoModal`, `useBoardImport`) o en el primer arranque, y los marcadores de X y del navegador desde la extensión.

**Por qué.** Eric lo pidió con esas palabras. Lo del menú de la cuenta es interpretación nuestra: el motivo de la decisión del 06-10 sigue en pie (sin el botón no quedaba dónde ver ni cortar un acceso), y así se cumplen las dos cosas.

**Cómo aplicarlo.** Un botón que solo sirve para conectar se va cuando no queda nada por conectar; lo que permita ver o retirar un permiso se queda en un sitio estable (la cuenta o Ajustes). Si Importar vuelve a tener entrada propia, se monta `ImportDialog` allí y se registra.
