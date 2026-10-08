---
title: La extensión pone un botón para importar un tablero de Are.na, Pinterest o Cosmos con todo lo que Criterio sabe guardar
date: 2026-10-08
status: vigente
kind: producto
---
**Contexto.** La extensión ya importaba tableros de Pinterest, pegando su dirección en la página de importar, y cada pin entraba como imagen aunque enlazara a una web. Are.na y Cosmos no se podían traer. Alberto pidió que, dentro de esas tres plataformas, la extensión ofrezca importar el tablero que se está mirando.

**Decisión.**
- Un registro, `extension/chrome/boards.js`, dice qué direcciones son un tablero en cada plataforma, qué permisos se piden (el sitio y su API) y qué colector lo lee (`arena-collect.js`, `pinterest-collect.js`, `cosmos-collect.js`). Lo usan la página de importar, el popup, el service worker y el botón. Todos los colectores hablan con un solo formato (`board-found` y `board-done`, en `board-collect.js`).
- Entra todo lo que Criterio sabe guardar, con la misma regla que pegar un tablero en la web ([importar un tablero trae todo lo que Criterio sabe guardar](2026-10-08-importar-un-tablero-trae-todo-lo-que-criterio-sabe-guardar.md)): webs, imágenes (copiadas, con la página de origen en `source`), vídeos por dirección y textos (sus palabras, con la página del bloque o del elemento en `source`). Se quedan fuera archivos y canales, y el final lo dice por tipo: "38 websites, 12 images and 2 texts imported. 3 skipped (file)."
- Lo importado va a un proyecto con el nombre del tablero; si ya existe de una importación anterior, se reutiliza. Lo decide el servidor (`projectForBoard`, `lib/projects.ts`, por `POST /api/ext/v1/projects`), el mismo que usa la web: importar desde la extensión y desde la web llena el mismo proyecto.
- El botón (`board-button.js`) es una píldora de papel con bisel abajo a la derecha, "Import to Criterio" con la marca, en un Shadow DOM cerrado. Solo aparece en un tablero y solo después de que la persona conceda esa plataforma (`chrome.scripting.registerContentScripts`), nunca al instalar. El popup, sobre un tablero, ofrece lo mismo ("Import this board").
- Los nombres de las plataformas solo dicen de dónde viene algo; sin logos, también en el popup, que ya no lleva los de X y Pinterest.

**Por qué.** Alberto: "Inside Cosmos, Are.na and Pinterest, the Chrome extension shows a button to import the board you're looking at into Criterio." Interpretación mía: el momento de importar es cuando uno está mirando su tablero, no cuando recuerda copiar su dirección; y pedir el permiso antes de poner nada en páginas ajenas mantiene la extensión callada hasta que se la invita.

**Cómo aplicarlo.** Una plataforma nueva es una entrada en `boards.js` y un colector que llama a `window.__criterioBoard`. Lo que se copia de ella rellena `source` con la página del elemento, como pide la decisión de [lo importado de X y Pinterest](2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md); si sus copias no deben salir del espacio, `staysInside` (`lib/url.ts`) tiene que conocer sus dominios. Ningún botón en páginas de terceros sin el permiso de ese sitio concedido a propósito.
