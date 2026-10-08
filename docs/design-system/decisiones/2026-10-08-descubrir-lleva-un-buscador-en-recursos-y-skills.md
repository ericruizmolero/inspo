---
title: Descubrir lleva un buscador en Recursos y en Skills, en la fila de controles
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** Recursos pasaba de cien webs en una decena de grupos y Skills de treinta tarjetas; solo se podían acotar por estantería (Todo, Recién llegados, Destacados) y por tipo o tema desde el menú. Encontrar una web concreta era hacer scroll.

**Decisión.** En la fila de controles de Descubrir (`.disc-bar__side`, `components/Discover.tsx`), delante de la estantería, un campo de búsqueda (`.disc-search`): el pozo de tamaño s (34, `.cr-input-s`) con la lupa dentro a la izquierda, el mismo que tiene el directorio (`.dir-search`), de 200 px y a todo el ancho en móvil. El mismo campo sirve a Recursos y a Skills y guarda lo escrito al cambiar de sección. Lo escrito estrecha lo que ya dejan la estantería y el tipo: cada palabra tiene que estar en el nombre, el dominio, la descripción o el nombre del grupo de un recurso, o en el nombre, qué hace, el autor o el comando de una skill, sin distinguir acentos ni mayúsculas (`plain`, `lib/directory.ts`). Sin resultados sale el vacío que ya había ("Ningún recurso aquí"). Esc vacía el campo; no hay atajo "/" porque ya es del buscador del dock.

**Por qué.** Eric, 08-10, con la captura de la fila de Recursos: "creo que ahí arriba hace falta un buscador", y después "lo mismo para skills creo yo". Reutilizar el campo del directorio y no inventar otro es aplicación del principio de resolver la interfaz nueva con lo que ya existe.

**Cómo aplicarlo.** Una lista que crece lleva un campo de búsqueda junto a sus filtros, no en lugar de ellos: la búsqueda estrecha lo que los filtros dejan. El campo es siempre el pozo del sistema con la lupa dentro, al tamaño de la fila donde va.
