---
title: La música de Pulido se elige por nombre en un menú, no con un botón de saltar pista
date: 2026-10-06
status: vigente
kind: diseño
supersedes: Vuelve Pulido como fase (06-10), solo en lo que toca a que hubiera una única pista que se cambiaba sustituyendo el fichero
---
**Contexto.** Pulido tenía una sola pista (`public/polish/ambient.mp3`) detrás del botón Sonido. Eric pidió traer varias canciones de sus descargas y poder cambiar entre ellas. La primera versión puso un botón con el icono de saltar pista (`SkipForward` de Lucide) al lado del altavoz.

**Decisión.** Hay seis pistas, todas de HoliznaCC0 (CC0), en `public/polish/<id>.mp3` y listadas en `TRACKS` al principio de `components/PolishView.tsx`: Laundry On The Wire, First Snow, Snow Drift, Keeping Cool, Night Driving y Windows Down. Están codificadas a 128 kb/s y bajadas al mismo volumen (unos -17,9 LUFS) para que cambiar de una a otra no dé un salto. Con el sonido apagado la pastilla (`.polish__sound`) es como antes: el altavoz y "Sonido". Con el sonido encendido, el altavoz lo apaga (`.polish__sound-toggle`) y a su lado aparece el nombre de la canción que suena (`.polish__sound-track`), que abre un menú `.pp .pp--menu` (`.polish__tracks`) con las seis por su nombre y un tic en la que suena. Al elegir otra, la que suena se funde en 260 ms y entra la nueva; cuando una termina sigue la siguiente. La última escuchada se recuerda en el navegador (`inspo:polish-track`). El botón de saltar pista se quitó.

**Por qué.** Eric, 06-10, sobre el botón de saltar pista: "el boton de pasar de cancion no sé si se entiende, para que es el de play/pause". Interpretación nuestra: el icono de saltar, pegado al altavoz, se lee como un segundo play/pausa, y con seis canciones elegir por nombre se entiende sin explicación y deja ir a la que se quiere sin pasar por las demás.

**Cómo aplicarlo.** Un control de música lleva como mucho un icono (el altavoz); lo demás se dice con el nombre de lo que suena. Para añadir una canción: el fichero en `public/polish/` y una línea en `TRACKS`, igualada de volumen con las otras (medir con `ffmpeg -af ebur128` y bajar con `volume=`). Solo música con licencia que lo permita (CC0 o propia). El estado del botón solo lo cambia el audio que está sonando: un `play()` interrumpido de un audio ya descartado (la vista montada dos veces, la pestaña oculta mientras carga) no apaga el botón.

**Después.** El mismo día la música pasó a compartir pastilla con el zoom y a sonar también en el Tablón y el Sistema: el nombre de la canción ya no se escribe en la pastilla, el menú cuelga de una flecha junto al altavoz, y `TRACKS` y el audio viven en `components/SoundControl.tsx`. Las pistas y cómo añadirlas siguen igual. → [zoom y música en la misma pastilla](2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md)
