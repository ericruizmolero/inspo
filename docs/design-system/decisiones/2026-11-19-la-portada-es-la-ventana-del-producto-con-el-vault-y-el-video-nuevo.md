---
title: La portada es la ventana del producto en marcha, con el Vault, y abre el vídeo nuevo
date: 2026-11-19
status: vigente
kind: diseño
---
**Contexto.** La portada de la lista de espera (17/11) era el héroe con el vídeo de Criterio debajo. Con el giro al Vault (18/11) el Sistema sale del relato y el vídeo anterior ya no cuenta el producto: la tesis pasa a ser «Entrena tu gusto» (crear ya es fácil; lo difícil es que lo que crees sea tuyo).

**Decisión.** `/` y `/es/` son la landing de `criterio-landing/prueba-vault` (v108), servida como página estática: `marketing-site/public/index.html` (inglés) y `public/es/index.html` (castellano), con lo que solo usa ella en `public/assets/vault/`. Fuentes, icono y Tino salen de los `/assets/` que ya tenía la web.
- Mismo titular, subheadline y formulario. Debajo, en lugar del vídeo, **la ventana del producto funcionando**: Tablón, comentarios, Pulido (la referencia centrada y rodeada por las demás; Tino pregunta «¿Te la quedas?»), Vault, Conectores y la IA construyendo una web con lo decidido. La ventana es una tecla: al pulsarla se maximiza con la transición retro y empieza el vídeo.
- **Vídeo nuevo**, un minuto, en castellano (voz Emilio) e inglés (voz Jessica): entrada de marca, los seis pasos (Guarda, Comenta, Pule, Vault, Conecta, Crea) y cierre «Entrena tu gusto». Música: «Keeping Cool», de HoliznaCC0 (CC0), una de las lo-fi de la app. `public/assets/vault/video/criterio-{es,en}.mp4`.
- **El Vault de la portada** enseña piezas vivas: las nuestras y las dos que Eric subió el 19/11, «Brick Helix Work Index» y «Cascading Case Slider», tal como las sirve su vista previa pública (`public/assets/vault/vault/*.html`, con las fotos en local).
- El icono de la app en la ventana es Tino en píxeles, oscuro sobre claro.
- El formulario hace lo mismo que el anterior: sin `POST /api/waitlist` (#119), lleva al acceso de la app.
- `src/pages/index.astro` y `src/pages/es/index.astro` salen; `WaitlistPage.astro` y `scripts/waitlist.ts` se quedan en el repositorio por si hay que volver. `scripts/check-dist.mjs` no cuenta como página un documento bajo `assets/` (son piezas que una página enmarca).

**Por qué.** Andoni: «en la landing parezca el propio producto funcionando pero si clicas ves el vídeo»; «el vault no quiero que se abra ninguno en detalle»; «Eric ha subido al vault dos nuevas animaciones que me gustaría incluir tanto en el vídeo como en la landing»; «subir a criterio.design», sustituyendo la portada.

**Cómo aplicarlo.** La fuente de la portada y de su vídeo está en `marketing-site/video/` (20/11): `landing/plantilla.html` se construye con `landing/construir.py`, que escribe `public/index.html` y `public/es/index.html`; no se editan a mano. El vídeo se regenera con `grabar.cjs` y `montar.cjs`. Los pasos, lo decidido y lo rechazado están en `marketing-site/video/README.md`, pensado también para dárselo a la IA con la que se trabaje. El vídeo y la ventana enseñan el Vault solo como rejilla. Música de otros vídeos del estudio no se repite aquí.
