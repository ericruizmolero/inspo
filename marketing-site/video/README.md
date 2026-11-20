# La portada y su vídeo: cómo se hacen y cómo se cambian

Este documento es para quien vaya a tocar la portada de criterio.design (`/` y `/es/`) o el vídeo de un minuto que abre, **y para la IA con la que lo haga**. Si eres esa IA: léelo entero antes de cambiar nada, sigue los pasos tal cual y respeta la lista de «Decidido» y «Rechazado». Ante una duda de gusto, pregunta a la persona; no la resuelvas tú.

Por qué existe así: [decisión del 19/11](../../docs/design-system/decisiones/2026-11-19-la-portada-es-la-ventana-del-producto-con-el-vault-y-el-video-nuevo.md).

## Qué hay aquí

```
marketing-site/video/
  README.md            este documento
  grabar.cjs           graba la demo de la portada (la ventana del producto) a 1920×1080
  montar.cjs           monta el vídeo: ajusta la imagen a la voz, pone títulos, entrada, cierre y música
  voz-eleven.cjs       genera la locución con ElevenLabs y la corta en bloques
  compas.py            mide el pulso de una canción, para cuadrar los cortes
  musica.py            música sintetizada de reserva (no se usa)
  probar.sh            regenera un idioma de punta a punta, en borrador
  voz/es, voz/en       la locución publicada: siete bloques por idioma y las marcas de tiempo de la toma
  landing/
    plantilla.html     LA FUENTE de la portada: marcado, estilos, textos y la demo
    construir.py       plantilla.html → src/pages/index.astro y src/pages/es/index.astro
    traer-vault.py     trae una pieza del Vault a la portada
    revisar.cjs        revisión completa en Chrome y WebKit, escritorio y móvil
```

Lo que se genera y **no** se sube (`.gitignore`): `rec-*/` (grabaciones), `hf-*/` (composición y renders) y `entrega/`.

Las páginas que sirve la web, **generadas** por `construir.py` y que no se editan a mano: `marketing-site/src/pages/index.astro` y `src/pages/es/index.astro`. Son la plantilla tal cual, con cada `<script>` y `<style>` en `is:inline` para que Astro no los empaquete ni los reescriba.

### Lo que la portada toma de la web

Lo que no puede escribirse en la plantilla sin desincronizarse de la app va como marca `%%…%%`, y `construir.py` la cambia por código de la web:
- `%%WAITLIST%%`, el `action` de los dos formularios: `POST /api/waitlist` de la app (`WAITLIST_URL` en `src/i18n.ts`). El formulario manda el correo con el consentimiento y el campo trampa, y dice «Ya estás en la lista» sin salir de la página.
- `%%LOGIN%%`, la tecla «Empieza gratis» de cada formulario: el login de la app (`copy.<idioma>.login.href`).
- `%%SIGNUP_MODE%%`, antes de `</body>`: `src/scripts/signup-mode.ts`, empaquetado por Astro. Si `GET /api/access/mode` de la app dice `open`, pone `.signup-open` en `<html>` y cada formulario es solo su «Empieza gratis».
- `%%PRICING%%`, entre la ventana del producto y criterio.md: los planes, `src/components/HomePlans.astro`, que lee `src/plans.ts` (los mismos de `/pricing/` y de la app; un test avisa si se separan). Los precios y lo que incluye cada plan no se escriben en la plantilla. Sus estilos están en el componente y usan los tokens de la plantilla (`--paper-l`, `--ink`, `--display`, `--r`…): si cambian ahí, cambian también en los planes. Sus clases son `pricing*` y `plan-*`; la plantilla no debe usar esos nombres (ya tiene un `.plans` en la demo).
- `%%PRICING_NAV%%`, el enlace «Precios» de la cabecera (`#pricing`): el nombre de la página en `PAGES` de `src/i18n.ts`.
- Los planes y el enlace «Precios» van en la página **en los dos idiomas**, cada uno con su `data-locale` y el que no es el de la página con `hidden`. Como `?lang=` cambia los textos al cargar, el script de la plantilla enseña también el `data-locale` de ese idioma y oculta el resto (en la misma línea que rellena los `data-t`). Algo nuevo que venga de la web y dependa del idioma se pinta igual, con `data-locale`.

Lo que la portada usa y ya está en `marketing-site/public/`:
- `assets/vault/`: imágenes, piezas del Vault (`vault/`), la web de ejemplo que construye la IA en la demo (`altura/`) y el vídeo (`video/criterio-es.mp4`, `criterio-en.mp4` y sus pósteres).
- La música es una de las de la app: `public/polish/keeping-cool.mp3` (HoliznaCC0, CC0).

## Qué hace falta instalado

- Node 20 o superior y las dependencias del repositorio (`npm install` en la raíz).
- `ffmpeg` y `ffprobe`.
- Google Chrome. Si no está en `/Applications`, pasar su ruta en `CHROME`.
- `playwright-core`: `npm i --no-save playwright-core` en la raíz. Para la revisión en WebKit, además `npx playwright-core install webkit`.
- Hyperframes, que hace el render: se descarga solo con `npx hyperframes@0.9.37`. Usar esa versión.
- Python 3, sin paquetes, para `construir.py` y `traer-vault.py`. Solo `compas.py` necesita `uv` (`uv run --with numpy --with scipy python compas.py …`).
- **Solo para cambiar la voz:** la clave de ElevenLabs del proyecto (ver «La clave de ElevenLabs», más abajo).

## La clave de ElevenLabs

Solo hace falta para generar voz nueva (apartado 3). Regrabar, remontar, cambiar la música o tocar la portada **no la necesitan**: las tomas publicadas ya están en `voz/`.

- **Existe una clave del proyecto**, creada por Andoni el 20/11 en su cuenta de ElevenLabs. Las voces del vídeo (Emilio y Jessica) están en esa cuenta, así que con esa clave funcionan los comandos de este documento tal cual; comprobado el 20/11 con `node voz-eleven.cjs voces`, que las lista y no gasta créditos. **Se le pide a Andoni**, que la pasa por un canal privado. Si todavía no te la ha pasado, pídesela: no uses otra cuenta ni otra voz.
- **Para guardarla**, con la clave copiada en el portapapeles: `pbpaste > marketing-site/video/clave-elevenlabs.local` (en macOS, desde la raíz del repositorio).
- **Dónde se pone**, una de dos:
  - en la variable de entorno `ELEVENLABS_API_KEY`, o
  - en el archivo `marketing-site/video/clave-elevenlabs.local`, con la clave en una sola línea. Ese nombre está en `.gitignore`.
- **Este repositorio es público.** La clave no se escribe en este documento, ni en un script, ni en un commit, ni en el texto de un PR o de una incidencia. Si eres una IA: no la muestres en tus respuestas, no la copies a otro archivo y, antes de un commit, comprueba que `git status` no lista `clave-elevenlabs.local`.
- **Si se filtra** (aparece en un commit, una captura o un mensaje público), avisar a Andoni ese mismo momento para que la revoque y cree otra. Borrarla del archivo no basta: queda en el historial.
- **Cada toma gasta créditos** de esa cuenta: unos 800 caracteres por idioma. Antes de generar, confirmar el texto con la persona; no generar para «probar a ver».

## 1. Cambiar la portada

1. Editar `landing/plantilla.html`. Los textos están en el objeto `COPY` (`es` y `en`): cualquier texto se cambia en los dos idiomas.
2. `python3 marketing-site/video/landing/construir.py`
3. `npm run dev:marketing` y mirar `http://localhost:4321/?landing` y `http://localhost:4321/es/?landing`.
4. `node marketing-site/video/landing/revisar.cjs http://localhost:4321/ revision largo`. Tiene que acabar en `TODO BIEN`.
5. `npm run build:marketing` y `npm run check:dist -w @criterio/marketing-site`.

La demo de la ventana es un bucle (`loop`) que recorre Tablón → comentarios → Pulido → Vault → Conectores → la IA construyendo la web. El vídeo es una grabación de ese bucle: **si cambia la demo, hay que regrabar el vídeo** (apartado 2).

## 2. Regenerar el vídeo (sin cambiar la voz)

Con la web servida en local (`npm run dev:marketing`):

```bash
BASE=http://localhost:4321/ bash marketing-site/video/probar.sh es
```

```bash
BASE=http://localhost:4321/ bash marketing-site/video/probar.sh en
```

Eso graba, monta, comprueba y saca un borrador en `hf-<idioma>/renders/prueba-<idioma>.mp4`. Debe durar unos 66 s y medir entre −15 y −13 LUFS.

Para la versión buena, dentro de `marketing-site/video/hf-<idioma>/`:

```bash
npx hyperframes@0.9.37 render -q delivery -o ../entrega/criterio-es.mp4
```

Y para ponerla en la web (versión ligera y póster), desde `marketing-site/video/`:

```bash
ffmpeg -y -i entrega/criterio-es.mp4 -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart ../public/assets/vault/video/criterio-es.mp4
```

```bash
ffmpeg -y -ss 9.5 -i entrega/criterio-es.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 4 ../public/assets/vault/video/poster-es.jpg
```

Lo mismo con `en`. **Siempre los dos idiomas.**

Cómo funciona por dentro, para no romperlo:
- `grabar.cjs` deja correr el bucle de la demo una vez y apunta cuándo empieza cada parte (`marks.json`).
- `montar.cjs` corta la grabación en siete tramos y da a cada uno la duración de su bloque de voz. Si un tramo tendría que ir a menos de 0,8×, se queda en su último fotograma en vez de ralentizarse.
- La entrada (Tino, «Criterio» y el visor que se abre hasta ser la ventana) dura lo que la primera frase de la voz.
- Los cortes caen en el compás de la música: la ventana llega en tiempo fuerte y cada cambio de paso en un tiempo.

## 3. Cambiar el guion o la voz

1. El guion está en `montar.cjs`, en `T.es.blocks` y `T.en.blocks`: siete bloques por idioma. Los títulos de la columna izquierda, en `steps`.
2. Generar la toma del idioma que cambie (cuesta dinero; hace falta `ELEVENLABS_API_KEY`):

```bash
node marketing-site/video/voz-eleven.cjs es ZCh4e9eZSUf41K4cmCEL eleven_v4 0.6 0.08
```

```bash
node marketing-site/video/voz-eleven.cjs en cgSgspJ2msm6clMCkdW9 eleven_v4 0.55 0.25
```

(20/11) En inglés, con stability 0.3 la voz se quedaba «trabada»: estiraba y congelaba sílabas a mitad de frase («a post **you** saw», «a **button**»). Con 0.55 / 0.25 desaparecen. No bajar de 0.5.

3. Comprobar que dice el texto, **bloque a bloque** (`voz/<idioma>/b1.mp3` … `b6b.mp3`) y no sobre la toma entera.
4. Regenerar el vídeo (apartado 2).

Voces: castellano, Emilio (`ZCh4e9eZSUf41K4cmCEL`), con estabilidad 0,6 y estilo 0,08; inglés, Jessica (`cgSgspJ2msm6clMCkdW9`), con 0,55 y 0,25. Modelo `eleven_v4`, una sola toma por idioma.

Al escribir guion: frases cortas, segunda persona, como contado a alguien. Nada de siglas («inteligencia artificial», no «IA»: se pronuncia mal).

## 4. Cambiar la música

1. Elegir una pista con pulso claro. Antes que buscar fuera, mirar las de la app (`public/polish/`, todas CC0).
2. Medir su compás: `ffmpeg -i pista.mp3 -t 80 -ar 22050 -ac 1 pista.wav` y `uv run --with numpy --with scipy python compas.py pista.wav auto`. Da `beat` (segundos por tiempo) y `bar0` (primer tiempo fuerte).
3. Montar con ella: `MUSICA_FILE=/ruta/pista.mp3 BEAT=<beat> BAR0=<bar0> node montar.cjs es rec-es`.

## 5. Añadir una pieza del Vault a la portada

```bash
python3 marketing-site/video/landing/traer-vault.py <slug de la pieza> <nombre>
```

Luego, en `plantilla.html`, añadir `vLive("<nombre>")` a `PIECES` y su título y categoría a `comps` y `cc`, en los dos idiomas y **en la misma posición los tres**. Construir, revisar y regrabar el vídeo.

## 6. Publicar

Rama y PR, como cualquier cambio de la web. Publicar es `npm run deploy -w @criterio/marketing-site` y lo hace quien tenga acceso a Cloudflare; fusionar en `main` no publica. Después, repetir la revisión contra la web real:

```bash
node marketing-site/video/landing/revisar.cjs https://criterio.design/ publicada largo
```

## Decidido (no cambiar sin preguntar)

- Tesis: **«Entrena tu gusto»**. Crear ya es fácil; lo difícil es que lo que crees sea tuyo.
- El vídeo abre con una entrada de marca corta y entra al producto. **No** abre explicando el problema.
- Sin subtítulos. Los pasos llevan título y una frase, sin numeración.
- El Vault se enseña **solo como rejilla**: no se abre ninguna pieza en detalle, ni en el vídeo ni en la portada.
- El Pulido es como en la app: la referencia centrada y rodeada por las demás, Tino **pregunta** («¿Te la quedas?») y el pie lleva título y comentario.
- El icono de la app en la ventana es Tino en píxeles, oscuro sobre claro.
- La voz en castellano es tranquila, no entusiasta.
- Música: «Keeping Cool». **No usar «2 Hour Delay» ni «Laundry On The Wire»**: son las de los vídeos de casos de savvia.
- Nivel de sonido: en torno a −14,5 LUFS, pico por debajo de −1 dBFS. La música va unos 15 dB por debajo de la voz y se agacha cuando se habla.

## Rechazado (no volver a proponer)

- Un gancho con «webs moradas» o cualquier arranque sobre el problema.
- Música sintetizada por código, y pistas con licencia que no se pueda descargar.
- Piezas hechas para un cliente enseñadas como propias.
- Tino recomendando qué referencia quedarse.

## Trampas que ya nos costaron una ronda

- **Todo va encadenado.** Cambiar una frase cambia la duración de la voz, y con ella los cortes y el compás. No se alarga un tramo suelto: se remonta.
- **Al grabar, lo que se inyecta en la página corre también dentro de sus `iframe`.** `grabar.cjs` empieza por `if (window !== window.top) return;`. Sin eso, la web de ejemplo del final sale sin menú ni lista.
- **Se mira la hoja de fotogramas de cada tramo** del vídeo ya renderizado, no solo del tramo que se tocó: `ffmpeg -i video.mp4 -vf "fps=2,scale=320:-2,tile=12x12" -frames:v 1 hoja.jpg`.
- `hyperframes check` avisa de `nested_structure_needs_subcomposition`: son avisos, no bloquean.
- `hyperframes check` y `render` dejan procesos de Chrome vivos: `pkill -f chrome-headless-shell; pkill -f warmCheck`.
- WebKit sin pantalla no pinta la perspectiva CSS: el giro de las tarjetas del Pulido solo se ve bien en Chrome y en un Safari real.
- `scripts/check-dist.mjs` lee cualquier `src="…"` del HTML, también dentro del JavaScript. `construir.py` ya lo resuelve; por eso no se edita `src/pages/index.astro` a mano.
- En la plantilla, lo que lleva `%%…%%` lo rellena `construir.py` con código de la web (ver «Lo que la portada toma de la web»). No se escribe a mano ninguna dirección de la app (`app.criterio.design`): con `npm run dev:marketing` la web apunta a la app local y en la publicada a la de producción.

## Pendiente

- Probar en un iPhone y en un Safari reales. En WebKit móvil los controles del vídeo rozan el botón «Cerrar».
- El tablón de la demo enseña capturas de webs de terceros.
