---
title: En los correos Tino lleva su baldosa blanca, y el de la lista de espera habla de tú a tú
date: 2026-11-25
status: vigente
kind: diseño
---
**Contexto.** El logo de los correos era un PNG de tinta con fondo transparente. Fastmail en oscuro cambia el blanco del correo por negro, pero no toca las imágenes, y Tino no se veía. El correo de la lista de espera eran dos párrafos de aviso.

**Decisión.**
- `LOGO_URL` (`lib/mail-layout.ts`) es `assets/correo/tino.png`: Tino en tinta sobre una baldosa blanca redondeada, dibujada en la propia imagen, a 40 px. Es igual en todos los correos. Nombre nuevo para que las cachés de los clientes no sirvan el viejo; `marca/conejo-icono.png` se queda porque lo cargan los correos ya enviados.
- `npm run mail:images` (`scripts/mail-images.ts`) hace las imágenes de los correos: `tino.png`, `equipo.png` (los tres socios) y `video-es.jpg` y `video-en.jpg` (el póster del vídeo con su tecla).
- El correo `on-the-list` (en Resend): la primera frase del manifiesto en Georgia de 26 px, qué es Criterio en un párrafo que tutea, el póster con enlace al vídeo, una pregunta que se contesta respondiendo ("¿cuál es la última landing que te hizo pensar "ojalá fuera mía"?"), las novedades y el enlace, y las caras antes de la firma. El asunto es "Ya estás en la lista (y una pregunta para ti)". No hay testimonios de clientes porque aún no hay; el manifiesto hace ese papel (interpretación nuestra de "la parte del testimonial").

**Por qué.** Alberto: "todos los emails llegan con el icono oscuro, quizás tenemos que añadir un background blanco siempre por defecto" y "este email de welcome tendría que ser más bonito [...] hablar directamente one on one in a more direct and casual way".

**Cómo aplicarlo.** Una imagen de correo lleva dibujado su fondo: no se cuenta con el del correo. Si cambian el dibujo de Tino, las caras o el póster, `npm run mail:images`, desplegar la web y, si cambia el nombre de un fichero, `npm run mail:templates layout`.
