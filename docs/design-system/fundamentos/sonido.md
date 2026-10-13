# Sonido

Dos cosas distintas que no se encienden la una a la otra: la música es ambiente y se elige en la pastilla de la esquina; los sonidos de la interfaz son respuesta a una acción y se encienden en Ajustes. Las dos arrancan calladas: nada suena sin un clic de la persona. → [solo en lo que decide](../decisiones/2026-10-07-la-interfaz-suena-solo-en-lo-que-decide-y-arranca-callada.md), [zoom y música en la pastilla](../decisiones/2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md)

## Fuente de verdad

`lib/ui-sounds.ts` (los sonidos de la interfaz: `cue`, `setUiSounds`, `useUiSounds`, `audition`) y `components/SoundControl.tsx` (la música: `TRACKS`, emisoras, volúmenes y fundidos). Nadie importa `cuelume` fuera de `lib/ui-sounds.ts`.

## Sonidos de la interfaz

| Qué | Valor |
| --- | --- |
| Material | [cuelume](https://cuelume-site.pages.dev) 0.2, catorce sonidos sintetizados con Web Audio (6 kB, sin ficheros), tema `press`: un clic seco sobre el golpe de lo que mueve; los resultados (`success`, `error`, `warning`, `ready`, `attention`) son una nota de mazo sin clic |
| Encendido | Apagados por defecto. Ajustes › Cuenta › Apariencia › Sonidos (`Switch`); se recuerda en este navegador (`inspo:ui-sounds`). Al encenderlos suena `toggle` |
| Cómo suena algo | `cue(nombre, opciones)` de `lib/ui-sounds.ts`: no hace nada con los sonidos apagados. Nunca `play` de cuelume, ningún `data-cuelume-*` ni `bind()` |
| Opciones | `emphasis`: `subtle`, `normal`, `strong`. `direction`: `forward` o `back` (da forma a `select`; `navigate`, `toggle` y `count` suenan al revés con `back`). `volume` 0 a 1 para esa vez |

### Los catorce sonidos y dónde suena cada uno

| Sonido | Para qué sirve | Dónde suena en la app |
| --- | --- | --- |
| `tap` | Pulsar, activar | Cada carta que pasa por delante del tornado de Pulido cuando lo gira la persona (scroll o arrastre): sutil, como la muesca de una rueda, con 70 ms de mínimo entre dos (`TICK_MS`). Nunca cuando se coloca solo ni cuando gira detrás de las palabras → [decisión](../decisiones/2026-10-08-el-tornado-de-pulido-hace-tic-al-girarlo.md). Pasar el ratón por una fila de recursos de Descubrir, sutil y con el mismo mínimo (solo ratón) → [decisión](../decisiones/2026-10-12-pasar-por-los-recursos-hace-tic.md) |
| `type` | Escribir | No suena (se probó en los recursos de Descubrir y se volvió a `tap`) |
| `select` | Elegir en una lista, decidir | Pulido: Conservar hacia delante, Olvidar hacia atrás. Sacar una carta de un proyecto al Inbox: hacia atrás, como Olvidar |
| `toggle` | Cambiar de estado | Encender los sonidos en Ajustes (para oír cómo son) |
| `open` | Abrir | No suena |
| `close` | Cerrar | No suena |
| `navigate` | Ir a otro sitio, volver | Deshacer en Pulido, hacia atrás |
| `success` | Hecho y confirmado | Guardar una referencia (URL, imagen o texto): sutil. Cerrar el pulido con todo decidido: normal |
| `warning` | Hecho, pero mira | No suena |
| `error` | Ha fallado | El aviso de error del tablero (`toast--error`) |
| `loading` | Empieza algo lento | No suena |
| `ready` | Hay un resultado | No suena |
| `attention` | Algo espera a la persona | Algo nuevo del equipo en la campanita de la Isla, sutil (Eric: "música si entra algo") → [decisión](../decisiones/2026-10-08-avisos-del-equipo-campanita-y-resumen-diario.md) |
| `count` | Una cifra que cambia | No suena |

### El viento (propio, no es de cuelume)

| Qué | Valor |
| --- | --- |
| Dónde | Al pasar del Tablón a Pulido, cuando las tarjetas empiezan a volar al tornado (`settleFromBoard` en `components/polish-tornado.ts`), no en el clic. Y de vuelta, de Pulido al Tablón, cuando las tarjetas vuelan a su sitio (efecto de `Grid.tsx`): el viento amaina, más grave (160 a 640 Hz frente a 220 a 920), al 80 % del volumen y de derecha a izquierda (`gust(ms, { back: true })`); el mismo viento al salir del Sistema hacia el Tablón o Pulido, en el clic. Al entrar al Sistema, desde cualquiera de las dos: un viento agudo, de 700 a 2800 Hz y al 70 % del volumen (`gust(ms, { bright: true })`), sin ping |
| Cómo | `gust(ms)` de `lib/ui-sounds.ts`: ruido suave por un filtro de banda; el volumen y el tono siguen la velocidad de `EASE_WIND` muestreada en 48 pasos, así que sopla más cuando las tarjetas van más rápido y calla cuando se posan. Volumen máximo `WIND_VOLUME` 0,06, por debajo de los demás sonidos. Dura `MORPH_MS` más el escalón de la última tarjeta. A la ida cruza de izquierda a derecha. Mismo interruptor que los demás |
| Por qué | Eric: "haz que suene viento al cambiar de tablon a pulido"; la primera versión, en el clic y con volumen 0,32: "suena demasiado, tiene que ser más suave y sincronizado con el movimiento"; la vuelta, a mi propuesta del viento al revés: "vale, dame"; el del Sistema: "más agudo como de gusto como de resultado, viento pero con piiiin"; probado el ping: "el pin quitamos, no tiene sentido pero me gusta ese viento más agudo" → [decisión](../decisiones/2026-10-12-el-paso-del-tablon-a-pulido-suena-a-viento.md) |

Nada más suena: ni los botones, ni las teclas, ni abrir o cerrar, ni pasar el ratón.

## Música

| Qué | Valor |
| --- | --- |
| Dónde | La pastilla de la esquina inferior izquierda (`ZoomPill` + `SoundControl`), en toda la app con sesión iniciada: el altavoz la enciende y la apaga; mientras suena, la flecha abre emisoras y canciones (`.sound-tracks`) |
| Pistas | Doce en `public/polish/<id>.mp3`, lista `TRACKS`: todas de HoliznaCC0 (CC0), igualadas en volumen. Nada se descarga hasta encenderla |
| Emisoras | Todas, Lo-fi (siete: "Lo-Fi And Chill") e Instrumental (cinco: "Relaxing Instrumentals"). Se elige emisora antes que canción; la lista no crece → [decisión](../decisiones/2026-10-07-la-musica-se-elige-por-emisora-y-la-lista-no-crece.md), [las pistas](../decisiones/2026-10-06-la-musica-de-pulido-se-elige-por-nombre.md) |
| Volumen y fundidos | Volumen 0,5 (`SOUND_VOLUME`). Entra y sale en 700 ms (`SOUND_FADE_MS`); al cambiar de canción la que se va baja en 260 ms (`SOUND_SWAP_MS`); al acabar una sigue la siguiente de la emisora sin fundido |
| Qué se recuerda | La emisora y la canción (`inspo:polish-station`, `inspo:polish-track`), no si estaba encendida: cada vez que se abre la página arranca apagada |
| Dónde vive | Fuera de React (un solo `Audio` para la página, en `globalThis`): cambiar de pantalla no la corta y otra pestaña del navegador tampoco (sigue detrás). Suena solo mientras uno de sus botones está en pantalla: sin ninguno durante 1,5 s (`LEAVE_MS`) se funde y para, y vuelve con el siguiente |
| Un vídeo con sonido | Mientras un vídeo suena en nuestro reproductor (`MediaPlayer`), la música baja en 260 ms y espera, encendida; cuando el último vídeo se calla (pausa o silencio) vuelve a entrar en 700 ms (`hush` en `SoundControl.tsx`) → [decisión](../decisiones/2026-10-13-en-la-ficha-el-video-se-ve-con-nuestro-reproductor-y-sonido.md) |

## Reglas

- Solo suena lo que cambia el sitio de una cosa o cierra una decisión: guardar, decidir, deshacer, fallar, y lo nuevo del equipo. Lo mismo suena igual en todas partes (sacar al Inbox suena como Olvidar).
- Un movimiento continuo que conduce la persona puede marcar sus pasos con `tap` sutil, siempre con un mínimo entre ticks; lo que se mueve solo, no.
- Un sonido nuevo entra en esta tabla y pasa por `cue`; una pista nueva entra en `TRACKS` con su emisora y en esta página.
- La muestra de arriba suena aunque la persona tenga los sonidos apagados (`audition`): es para oírlos aquí, no para la app.
