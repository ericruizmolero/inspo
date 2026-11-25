---
title: Apuntarse a la lista se confirma con confeti, y el formulario se vuelve su confirmación
date: 2026-11-25
status: vigente
kind: diseño
---
**Contexto.** Al apuntarse en la portada, el formulario se vaciaba y debajo salía una línea gris de 12,5 px ("Ya estás en la lista. Te escribimos cuando te toque."), fácil de no ver.

**Decisión.**
- Los dos formularios de la portada (`form.invite`, en `plantilla.html`) se vuelven su confirmación (`.is-joined`, `.joined`) en el mismo sitio y a la misma altura: el pozo crema con una casilla ember marcada, la del sistema en grande, y "Ya estás en la lista"; debajo, "Te iremos informando en" y el correo, para ver si se escribió mal. El foco pasa ahí y el lector de pantalla lo lee.
- El pozo no se mueve: la tecla se encoge hasta ser la casilla, la casilla cruza el campo y destapa el texto a su paso, y al dibujarse el tic salta el confeti (180, 420 y 160 ms; `clip-path`, `transform` y `opacity`).
- Desde la casilla salta una ráfaga de confeti de píxeles con los colores de la portada, y una de cada siete piezas es el Tino del titular (`marketing-site/src/scripts/confetti.ts`, un `canvas` que se quita al acabar, 2,8 s como mucho). Tino salta y dice "Te guardo el sitio.".
- Con movimiento reducido no hay confeti ni cruce: lo viejo se funde en 150 ms.
- El formulario lanza el evento `waitlist:joined` con el correo, y `src/scripts/waitlist-joined.ts` hace el resto. `construir.py` lo mete en la marca `%%JOINED%%`.
- La línea `.form-note` queda solo para los errores. La pantalla no dice que haya salido un correo, porque a quien ya tiene cuenta o ya estaba no se le manda y la respuesta es la misma (interpretación nuestra).

**Por qué.** Alberto: "el mensaje ese que sale es muy feo que caigan un confeti o algo cuando añadan para confirmar". Y del texto: "'Cuando te toque' no sería el tema, si no más bien algo tipo: 'Te iremos informando'. También usa /animate para animar esta transición, el confeti, etc".

**Cómo aplicarlo.** El confeti es solo para esto: entrar en la lista. Quien quiera celebrar otra cosa, lo pregunta antes. `/landing/`, aparcada, sigue con su línea.
