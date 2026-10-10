---
title: Las imágenes del tablero llegan firmadas en la respuesta de la biblioteca
date: 2026-10-10
status: vigente
kind: desarrollo
---
**Contexto.** Cada imagen del tablero pasaba por `/api/files/[...key]`: una función, la sesión, los espacios y, para una clave fuera del prefijo del espacio, `ownsAnyThumbnail`, antes de redirigir a R2. Un tablero de 200 tarjetas eran 200 funciones al abrirlo (ericruizmolero/inspo#114). Las copias de las capturas de página ya llegaban firmadas (`signCanvasCopies` en `lib/page-shots.ts`).

**Decisión.**
- `ItemsBundle` (`types/inspo.ts`) lleva `signed`: por ruta guardada (`/api/files/<clave>`), su enlace firmado de R2. Lo llena `bundleOf` (`lib/library.ts`) con las miniaturas, las imágenes subidas y la portada y la tira del DESIGN.md de las filas de esa página o de ese pulso. En disco va vacío.
- `thumbnailMap` y `designMdIndex` siguen con las rutas: otro código las lee (`postThumbKind`, el vídeo de un post, los permisos de `setThumbnail`).
- La tarjeta (`components/InspoCard.tsx`) pide primero el enlace firmado y, si falla, la ruta una vez (`signedThumbnail`, `designCoverFallback`, `designScrollFallback`). `smallImageOf`, `miniImageOf` y `largeImageOf` (`components/InspoClient.tsx`) devuelven el enlace firmado sin reserva, como ya hacían con las capturas.
- `/api/files` se queda para los originales, las descargas, la vista compartida, las exportaciones y como reserva.

**Por qué.** Opción elegida en el issue: "URLs firmadas en la respuesta". Cero funciones por imagen sin tocar el modelo de privacidad: solo se firman las filas del propio espacio, así que otro espacio sigue sin verlas. La firma ya se guarda una hora en el driver de R2, y un enlace dura una hora o más (interpretación de quien lo construyó: la reserva por la ruta cubre una pestaña que vive más que el enlace).

**Cómo aplicarlo.** Una imagen nueva que el tablero enseña en cada tarjeta entra en `signed` desde `bundleOf` y la tarjeta la pide con su ruta como reserva. Nunca se sustituye la ruta guardada por el enlace en los mapas. Detalle en [Desarrollo](../desarrollo.md#biblioteca-y-pulso) y [Seguridad](../seguridad.md).
