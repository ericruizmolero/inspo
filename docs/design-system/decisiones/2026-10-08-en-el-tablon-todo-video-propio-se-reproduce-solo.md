---
title: En el tablón todo vídeo propio se reproduce solo, en bucle y sin botón
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** En la tarjeta del tablón solo las grabaciones de Screen Studio hacían bucle solas mientras estaban a la vista. Un fichero de vídeo subido y el vídeo o gif de un post de X enseñaban un fotograma quieto con el triángulo de reproducir (`.tile__play`) y solo se movían bajo el puntero. Eric, con la captura de un vídeo de un post con su triángulo: "aquí en el tablón podemos hacer que se reproduzca automáticamente o hace falta botón?".

**Decisión.** En `components/InspoCard.tsx` toda grabación nuestra hace bucle sola en su tarjeta, muda, mientras la tarjeta está en pantalla (`LoopVideo`, que solo reproduce lo que está a la vista): un fichero de vídeo guardado, una grabación de Screen Studio y el vídeo o gif de un post de X (`loopSrc`). Sin triángulo: solo lo llevan los vídeos que no son nuestros (YouTube, Vimeo), que siguen con su fotograma y se ven en la ficha. Si alguien eligió una miniatura para un vídeo, esa imagen manda y la grabación solo corre bajo el puntero (`hoverSrc`). Tampoco hay barra de reproducido: `.tile__scrub` se retira de la tarjeta (Eric, al verlo: "sin barra de progreso los vídeos aquí!!"). `LoopVideo` conserva `progressRef` por si otra pieza quiere una línea.

**Por qué.** Propuesta mía, aprobada por Eric ("Dale"): el triángulo no era un botón sino una marca, el vídeo ya corría bajo el puntero, y un muro de referencias vive del movimiento, como hacen las grabaciones y como hace Mymind. Los navegadores permiten el bucle sin sonido, y al correr solo lo que está en pantalla el coste queda acotado; el precio conocido es que un tablón con muchos vídeos a la vista descarga y decodifica varios a la vez.

**Cómo aplicarlo.** Un vídeo nuestro en una tarjeta se mueve solo y en silencio; no se pide un clic para ver lo que ya es una imagen en movimiento. La marca de reproducir se reserva a lo que de verdad hay que abrir en otro sitio. Si el tablón se resiente con muchos vídeos, la salida es limitar cuántos corren a la vez, no volver al botón.
