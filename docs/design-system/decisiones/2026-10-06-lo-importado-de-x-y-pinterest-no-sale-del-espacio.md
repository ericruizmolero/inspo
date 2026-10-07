---
title: Lo importado de X y Pinterest no sale del espacio, y cada copia guarda de dónde viene
date: 2026-10-06
status: vigente
kind: producto
---
**Contexto.** Eric preguntó si se puede comercializar la importación de guardados de X y de tableros de Pinterest. Los términos de las dos plataformas prohíben el acceso automatizado y las imágenes son de terceros. Lo que más riesgo tiene no es importar, sino repartir después nuestras copias. Al revisar el código salieron dos huecos: un pin importado perdía la dirección de su pin (solo quedaba nuestro fichero) y un enlace compartido (`/s/<token>`) servía las copias a cualquiera que tuviera el enlace. Tampoco había términos, política de privacidad ni forma de atender una petición de retirada.

**Decisión.**
- Una referencia traída de X o de Pinterest (`staysInside` en `lib/url.ts`: un post, o una imagen o vídeo cuya página es de esas plataformas) nunca entrega nuestra copia por un enlace compartido. `lib/share-view.ts` la nombra y enlaza al original, sin imagen. Dentro del espacio se ve como siempre.
- Toda imagen o vídeo copiado guarda la página de la que salió en `inspo_item.source` (migración `0024_item_source`). La rellenan la importación por lotes, el guardado con el botón derecho de la extensión y el conector MCP. La tarjeta, la ficha, `criterio.md` y el MCP citan esa página en vez de nuestro fichero.
- Páginas públicas `/privacy` y `/terms` (`components/LegalDoc.tsx`, textos en `lib/i18n/{en,es}/legal.ts`, datos de la sociedad en `lib/legal.ts`). Son borrador: mientras `lib/legal.ts` no tenga razón social, NIF y domicilio dan 404 en producción y nada las enlaza.
- Las retiradas se piden por correo, como explican los términos, y se ejecutan con `npm run takedown <url>`, que borra la referencia y sus copias en todos los espacios (sin `--apply` solo lista).
- La importación se describe como traer lo que uno mismo ha guardado. Los nombres de X y Pinterest aparecen solo para decir de dónde viene, sin logos.

**Por qué.** Eric, tras leer el análisis: "Vale, hagamos las cosas que recomiendas". Interpretación mía del motivo: guardar referencias para estudiarlas dentro del equipo es defendible, y volver a publicar el trabajo de otros desde nuestros servidores no lo es.

**Cómo aplicarlo.** Cualquier superficie nueva que se vea sin sesión (enlaces, ejemplos, escaparate, tarjetas para compartir) pasa las referencias por `staysInside` antes de enseñar una copia. Cualquier forma nueva de guardar un fichero ajeno rellena `source`. Si cambian los textos legales, se cambia `LEGAL_UPDATED` en el mismo commit.
