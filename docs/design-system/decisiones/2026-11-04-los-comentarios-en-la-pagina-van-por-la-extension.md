---
title: Los comentarios en la página van por la extensión, sin tocar el repo del cliente
date: 2026-11-04
status: vigente
kind: producto
---
**Contexto.** Había que comentar una landing corriendo: localhost, previews o la web real. Un script en el repo del cliente pedía paquete, lista de orígenes y tokens.

**Decisión.** "Comentar esta página" en la extensión inyecta un selector solo tras el clic. El comentario va a `system_area_comment` con `area: "page"`. Un agente lo lee y lo cierra con `list_comments` y `resolve_comment`, sin aprobación, porque un comentario no cambia ninguna decisión. Comentar pide cuenta.

**Por qué.** Alberto: "we can add it using the extension". Interpretación nuestra: la extensión ya tiene sesión, proyecto, permiso por clic y captura.

**Cómo aplicarlo.** La llave nunca pasa por la página: solo `background.js` llama a la API. Los comentarios no entran en criterio.md.
