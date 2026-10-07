---
title: El botón "Conectores" se queda siempre en la barra superior, también con todo conectado
date: 2026-10-06
status: vigente
kind: diseño
supersedes: La parte de "se va cuando los dos están conectados" de El menú Conectores de la barra superior (06-10, por la mañana)
---
**Contexto.** Por la mañana se decidió que el botón Conectores desapareciera cuando la extensión y el MCP estuvieran conectados. Horas después Eric quitó el conector desde Claude y el botón no volvió: "he quitado el conector de mcp de claude y no me sale 'conectores' de vuelta en la app". Claude no avisa a Criterio al quitar un conector (no llama a la revocación), así que el permiso sigue vivo en `mcp_grant` hasta que caduca el refresh, 60 días. Y con el botón oculto no quedaba ningún sitio donde ver las apps conectadas ni desconectar una.

**Decisión.** El botón **Conectores** (`components/Connectors.tsx`) se pinta siempre, con el menú de dos filas de antes: **Extensión de Chrome** y **Conectar MCP**, cada una con su tic (`.ws__item-check`) cuando está conectada. Se quita la condición que lo ocultaba con las dos conectadas. Lo demás de la decisión anterior sigue igual: un solo botón con icono `Plug`, el MCP con `Cable` y no la chispa, conexiones de la cuenta y no del proyecto. La raya (`.topbar__actions-sep`) entre Conectores y el + se queda, porque el botón ya no falta nunca.

**Por qué.** Eric eligió "siempre visible" entre tres salidas (siempre visible, oculto con una lista en Ajustes, oculto solo si se usa). Interpretación mía: el tic dice lo que Criterio sabe, no lo que pasa en Claude, y puede quedarse puesto después de quitar el conector allí; por eso hace falta tener siempre a mano el sitio donde se ve y se corta el acceso.

**Cómo aplicarlo.** Un control que es la única puerta para ver o retirar un permiso no se oculta cuando "ya está hecho". Si se quiere avisar de que falta algo por conectar, se hace con el tic o con un estado del botón, no con su presencia. Una conexión nueva sigue siendo una fila más del menú.
