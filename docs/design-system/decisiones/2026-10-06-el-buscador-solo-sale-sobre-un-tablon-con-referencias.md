---
title: El buscador solo sale sobre un tablón con referencias
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** En un proyecto recién creado, sin ninguna referencia, el dock pintaba el buscador igual que en un tablón lleno. Estaba hecho a propósito (`spaceItems.length > 0 || !!currentProject` en `components/InspoClient.tsx`), pero ahí no había nada que buscar: la pantalla ya es la caja de `ProjectStart` para pegar un enlace o traer referencias de la biblioteca, y el buscador no filtraba esa lista.

**Decisión.** El buscador del dock (`SearchBar` con `.sb--dock`) solo se monta cuando el espacio abierto tiene referencias: `searchHere && spaceItems.length > 0`. Un proyecto vacío empieza por su propia caja (`ProjectStart`) y nada más. La respuesta del agente sí puede seguir en el dock mientras habla.

**Por qué.** Andoni lo señaló al probar producción en la reunión del 6 de octubre: el buscador del proyecto aparecía con el tablón vacío y solo debería estar cuando hay referencias (resumido de las notas de la reunión, no es cita literal). Interpretación nuestra: una caja de búsqueda sin nada que recorrer se lee como algo roto, y compite con la única acción que toca en ese momento, que es añadir.

**Cómo aplicarlo.** Un control que actúa sobre una lista no se pinta mientras la lista está vacía: el estado vacío enseña cómo llenarla y nada más. Antes de añadir algo al dock, comprobar qué se ve con cero referencias.
