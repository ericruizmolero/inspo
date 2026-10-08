---
title: Importar vive en el menú Conectores, como tercera fila, hasta que Alberto diga dónde
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** Importar un tablero de Are.na, Pinterest o Cosmos solo se podía pegando su dirección en el primer arranque o en Añadir, y nadie lo descubría ahí. Los marcadores de X y del navegador solo se traían desde el popup de la extensión. Se pidió una sección "Importar" en la web que junte las dos cosas. Dónde ponerla no lo ha decidido nadie todavía: esto es el sitio por defecto, pendiente de que Alberto lo confirme o lo mueva.

**Decisión.**
- Una fila **Importar** en el menú Conectores (`components/Connectors.tsx`), debajo de Conectar MCP, con el icono `Import` de Lucide y sin tic (no es una conexión). Con `row` sale igual en el menú de móvil.
- Abre `ImportDialog` (`components/ImportDialog.tsx`, `.impd`), una ventana como `ConnectDialog`: "Trae lo que ya tenías guardado".
- Arriba, un campo para pegar un tablero y el botón primario "Importar tablero". Corre el mismo flujo que el primer arranque y Añadir (`useBoardImport` y `BoardProgress`, `components/BoardImport.tsx`; el `importBoard` de `InspoClient`): leer, el proyecto del tablero (`projectForBoard`), lotes y el aviso final por tipo. Al terminar se cierra y el usuario está en el proyecto.
- Debajo, Marcadores: con la extensión conectada (0.7.1 o más), "Importar de X" e "Importar marcadores del navegador" abren su página de importar en una pestaña al lado (`openExtensionImport`, `hooks/use-extension.ts`, que habla con `content.js`). Si falta, el paso que falta: instalarla, conectarla o actualizarla. Fuera de un navegador Chromium de escritorio, una línea que dice dónde funciona. Y una línea que avisa de que la extensión pone un botón "Importar a Criterio" en los tableros.
- Las plataformas solo con su nombre, sin logos, como pide [lo importado de X y Pinterest no sale del espacio](2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md).

**Por qué.** Interpretación mía: importar es otra forma de entrar desde fuera, como la extensión y el MCP, y Conectores ya es el único sitio de la barra para eso; así no se añade un botón nuevo arriba ([Conectores se queda siempre](2026-10-06-conectores-se-queda-siempre-en-la-barra.md)). Lo malo: "Conectores" no suena a importar, y quien busca traer sus tableros puede no mirar ahí. Por eso es un sitio por defecto y no una decisión cerrada.

**Cómo aplicarlo.** Si Alberto lo mueve (a Añadir, al primer arranque o a una vista propia), `ImportDialog` se monta donde diga y esta decisión pasa a `sustituida`. Lo que se pueda importar desde fuera entra en este diálogo, no en un sitio nuevo. Qué trae un tablero lo dice [importar un tablero trae todo lo que Criterio sabe guardar](2026-10-08-importar-un-tablero-trae-todo-lo-que-criterio-sabe-guardar.md).
