# De 31 entregas a una receta

Cómo se hizo el rediseño de la home de Multiverse Computing trabajando con una IA: qué se pidió en
cada iteración, **con las palabras exactas**, qué falló de verdad detrás de cada petición, y —lo que
importa— **qué prompt habría que dar para llegar al mismo sitio en muchas menos vueltas**.

El documento tiene tres partes: **el registro** de lo que pasó (§1–§5), **la especificación
completa** de la web —valores reales, sección a sección, con la que se puede reconstruir de una
tirada— (§6), y **la receta**: el prompt maestro y los de cada fase (§7–§10).

Fuente única: el `CLAUDE.md` del proyecto, donde cada ronda quedó registrada en el momento con la
frase textual de quien la pidió, la interpretación, el cambio y lo medido, más el propio `src.html`
para los valores del §6. Nada de este documento es reconstruido de memoria; lo que no quedó anotado
aparece marcado como tal.

**El recuento, exacto:** 23 rondas numeradas más 22b, 22c y 22d = **26 rondas de diseño**, y cinco
entregas de proceso el último día (GitHub + Vercel, colaboradores, la skill destilada, las skills
actualizadas y este documento) = **31 entregas**. Contando mensajes de feedback sueltos serían más
—la ronda 22 llevó dos tandas de instrucciones en la misma sesión—, pero la unidad que el registro
tiene medida es la ronda.

## Cómo leer esto

| Si quieres… | Ve a |
|---|---|
| **reconstruir esta web de una tirada** | **§6** (la especificación completa) |
| el prompt para pegar en un encargo nuevo | **§7** |
| los prompts de las rondas siguientes | **§8** |
| saber en qué se fue el esfuerzo y qué se pudo evitar | **§4** y **§5** |
| las palabras exactas de cada petición | **anexo A** |
| las reglas duras que salieron del proyecto | **anexo B** |
| cómo se midió cada cosa | **§3** y **anexo C** |

---

## 1. Qué se construyó

Una home completa de una empresa de compresión de modelos de IA. Sin CMS y sin framework: **un solo
`site/src.html`** de 3.188 líneas que un script de 60 convierte en el HTML final, con los SVG
incrustados como data-URI percent-encoded.

- **11 secciones** (más el footer), tres de ellas atadas al scroll con ScrollTrigger (el hero, donde una esfera de
  ~3.000 puntos se comprime en el isotipo; «How CompactifAI works», con su matriz de pesos; y
  `#results`).
- **15 ilustraciones isométricas dibujadas por código** (`tools/iso.py`, en unidades de mundo, 13
  fragmentos `_iso-*.html` generados), no iconos de stock.
- **4 escenas en canvas 2D**: la esfera del hero, el perfilador de `#how`, el tensor de 8×8×8 del
  footer cuyos cubos se reordenan en el isotipo, y los separadores con bloques que se levantan y
  giran al pasar el ratón.
- **~670 KB** de HTML autocontenido; los únicos archivos externos son `og.png` y los cuatro retratos
  del equipo (WebP con hash de contenido en el nombre).
- **83 archivos en `tools/`**: generadores y, sobre todo, instrumental de medición propio — captura en
  Chrome y WebKit reales, histogramas de frame time, mapas de repintado, atribución de layouts
  forzados, muestreo de animaciones por progreso real.
- **73 reglas** en la lista «Rechazado — NO VOLVER», que no se poda nunca (anexo B).
- Publicada en Vercel; desde la ronda 23, desplegada por Git desde un repositorio privado.

---

## 2. Cronología: cinco días de trabajo

El proyecto no se hizo en semanas. Se hizo en cinco jornadas, y el reparto dice mucho:

| Día | Entregas | Qué pasó |
|---|---|---|
| **2026-09-10** | rondas 1–6 | De la auditoría inicial a la sección nueva `#stack`. El día del sistema: ritmo de secciones, hovers, tarjetas como hoja técnica, fuera el modo claro. |
| **2026-09-11** | rondas 7–20 | **Catorce rondas en un día.** El día de la ilustración (kit nuevo, perspectiva, el logo real) y del motion (fuera los rebotes, el tensor del footer, los CTA). Dos publicaciones. |
| **2026-09-12** | ronda 21 | Agentation. Un día entero para montar el modo revisión y, de paso, descubrir que el titular del hero no se podía seleccionar. |
| **2026-09-13** | rondas 22–22d | El feedback de Eric: tipografía, material de las ilustraciones, retratos, copy. Cuatro publicaciones seguidas por el tinte de los retratos. |
| **2026-09-14** | ronda 23 + P1–P5 | Logo y rendimiento medido. Después: GitHub, Vercel por Git, y destilar el proyecto en skills y en este documento. |

Dos lecturas de esta tabla:

- **El grueso del trabajo de diseño cabe en un día** cuando el sistema ya está en pie y el feedback
  llega por puntos numerados. Las catorce rondas del día 11 no son ineficiencia: son el ritmo natural
  de «te enseño, me dices, lo cambio» cuando el ciclo dura minutos en vez de días.
- **Lo que se llevó días enteros fue el instrumental**, no el diseño: montar Agentation, montar la
  medición de rendimiento. Es exactamente donde una receta ahorra tiempo, porque eso sí se puede
  llevar hecho de un proyecto al siguiente.

---

## 3. Las 31 entregas

**26 rondas de diseño** (1–23, más 22b, 22c y 22d) y **5 entregas de proceso** (P1–P5) el último día.
Quien pide: **A** = Andoni · **E** = Eric (socio; desde la ronda 21 anota con pins sobre la web
publicada).

La columna que más vale es la tercera: **lo que de verdad fallaba**, que casi nunca es lo que decía
la petición.

| # | Quién | Lo que se pidió | Lo que de verdad fallaba | Lo que salió |
|---|---|---|---|---|
| 1 | A | «pásale skills para mejorar/pulir el diseño» | El ritmo entre secciones estaba escrito en el marcado pero **no existía en CSS**: 8 secciones con idéntico fondo y padding. Y había `id` duplicados, así que las anclas del nav resolvían al elemento equivocado | Diez iconos de stock fuera (−12 KB), `.more`/`.quasar`/`.company` con CSS por primera vez, ids arreglados, ritmo de fondos implementado |
| 2 | A | 10 puntos: chip del hero, hover del menú, hover de CTAs, tarjetas, Quasar, `#how`, «una sola ilustración que se transforma», AI Suite, Expertise, testimonios | El crossfade de cuatro SVG en `#deploy` mentía: el modelo *desaparecía* y aparecía otro. Y la banda del chip tenía ancho fijo con la flecha al final de un raíl vacío | Los diez. Nace el traspaso **medido** de `#deploy`: se mide la caja real del sólido en el dibujo que sale y en el que entra, y el nuevo aterriza sobre el píxel exacto del anterior |
| 3 | A | 9 puntos: cuadrados en los CTA, degradado del menú, flecha del chip, dashed que sobresale, pulso de las cards, loops | Los degradados de hover eran bandas rectangulares a altura completa: se cortaban por los lados y tocaban las hairlines | Los nueve. Radiales que mueren antes del canto. **Se introducen rebotes `elastic`** — que habrá que quitar en la ronda 10 |
| 4 | A | «fuera los cuadrados de los CTA, por el momento» + perspectiva de dos ilustraciones | Una pieza apoyaba **fuera del plato** (x=8,45 con el plato acabando en 8,3): es *el* error que hace que un isométrico «no se sostenga» | Retirados y archivados en `tools/shelf/`. La huella se corrige en el generador, en unidades de mundo, no en el SVG |
| 5 | A | tres capturas de Mistral: una sección de bloques que caen del cielo | Nada: trabajo nuevo | Sección `#stack`, la única centrada de la página. 6 bloques con nombre + rellenos + rombos, cada uno enlazando a su sección |
| 6 | A | «fuera el modo claro» + variedad de ilustraciones | Dos ilustraciones **contaban lo mismo con el mismo objeto**, y llevaban seis rondas ahí sin que nadie lo viera | Un solo tema (fuera tokens, botón y `localStorage`). Nace la **hoja de contactos**: las 16 juntas, que es la única manera de ver la repetición |
| 7 | A | «más detalle y más variadas» · «se repite mucho un cubo rojo rayado, ¿tiene motivo?» · footer con cubo de Rubik | Sí tenía motivo (era el modelo comprimido), pero repetido en catorce dibujos era monotonía. La coherencia tenía que venir del **material**, no del sujeto | Kit nuevo de piezas mecanizadas en `iso.py`; 15 dibujos y ninguno cuenta su historia con el mismo objeto. Cubo de Rubik en CSS 3D |
| 8 | A | «fallos de perspectiva» · «pon el logo de Multiverse directamente» · «las nubes tienen un efecto raro por debajo» | Cuatro **errores de orden de pintado** del mismo tipo: un objeto pintado antes que otro que está detrás. Y el contorno de las nubes se construía ordenando puntos por ángulo: con formas cóncavas el polígono se cruza y salen picos | Los cuatro corregidos en coordenadas de mundo. Nubes con contorno trazado y volumen barrido. El isotipo real (`#mark-s`, 9 bandas) impreso en las tapas |
| 9 | A | «adelante con lo que has respondido, dale caña» | — (tres propuestas mías aprobadas) | El cubo de Rubik se cambia por la matriz que se comprime en el logo; CTAs más serios; la luz del hero |
| 10 | A | «quitamos animaciones bouncing, le quitan seriedad» · «el footer, mismo color que el resto» · «la matriz la quería en 3D» | **Dos lecturas mías erróneas**: en la ronda 8 leí «el footer tiene el mismo color que la web» como queja y lo puse negro — era el requisito; y la matriz la hice plana cuando pedía un tensor 3D | Fuera todo rebote (3 `elastic`, squash-and-stretch, overshoot). Footer en `--bg`. Tensor 8×8×8 cuyos cubos rehacen el logo |
| 11 | A | puntitos en los CTA · «no cortamos los gradientes» · «se dibuja el contorno y luego se colorea» · separadores con estela | Los gradientes del hero y del footer estaban **cortados por construcción**: eran bandas que no cabían en su sección | Círculo entero con radio calculado (el mayor que cabe), no a ojo. `drawIn` en todas las ilustraciones. Separadores con cuadrícula y estela |
| 12 | A | «los CTAs no cambian de color» · «fuera la línea roja que escanea» · «los dividers, que no aparezcan tanto» | Nada roto: decisión de gusto, y coherente — la línea de escaneo era el mismo recurso decorativo en bucle que ya se había quitado de otras partes | Solo los puntos junto al cursor (radial de 24 px). Borrados `modelRead`/`modelLoop`/`modelPulse`. Tres separadores distintos |
| 13 | A | «los separadores, como estaban, todos iguales» · «los iconos de CompactifAI y SentinelAI son inventados» | Cierto: había glifos inventados para dos productos **cuyo logotipo real ya estaba en la página**, dos secciones más arriba | Separadores iguales otra vez, solo dos y lejanos, con los cubos girando. Símbolos reales recortados de sus propios logotipos |
| 14 | A | «última pasada: ¿todo tiene criterio? ¿huele a IA? ¿algo fuera de lugar?» | **Ocho radios distintos** (2,4,6,7,8,12,14 px) en la misma página; bucles infinitos que seguían corriendo pese a haberlos «quitado» (cazados con `getAnimations()`); y tres fotos de prensa que eran lo único fuera de paleta | Auditoría de 23+29 capturas. Un radio único `--r-box`. Noticias solo texto (−37 KB). Logos igualados por tinta medida. Copy contradictorio resuelto. **Publicado** |
| 15 | A | línea del mega-menú · hover de Singularity · «que se fuesen intercalando las últimas noticias» | El hover de Singularity **sí funcionaba**: lo que no respondía eran los logos en imagen de los otros dos, que se quedaban grises mientras el nombre de Singularity, al ser texto, sí cambiaba | Rotación de noticias medida: pausa bajo el cursor, con foco, fuera de pantalla y con la pestaña oculta; alto fijo para que no salte |
| 16 | A | «que parezca que los bloques caen, como si tuviesen físicas» · «el estado final que se parezca aún más al logo» | Los bloques caían con `power3.out`: **frenaban al llegar, como una pluma**. Y el estado final del footer no tenía que parecerse al logo: tenía que *ser* el logo | Gravedad real (`power2.in`, g=2400 px/s², y=½gt²) y el peso contado con lo que hay debajo cediendo 3,2 px. El footer termina en `#mark`, las rutas reales |
| 17 | A | «el hover del CTA que haga un pulso que devela los puntos según por dónde entras» | Nada: efecto nuevo | Anillo radial centrado en el punto exacto donde el cursor cruza el borde, con `@property` para poder animar el radio. Los cuatro `.pill` de `#for` pasan al lenguaje del AI Suite |
| 18 | A | «el pulso un pelín más lento y notable, sobre todo en rojo» | — (ajuste de grado) | 0,72 → 1,05 s, y la trama más opaca con la máscara del cursor compensada para que el reposo no cambie. **Publicado** |
| 19 | A | «corrige esas 3 cosas que dices. Las fechas no las tengo» | Copy propio contradictorio: «Compact AI» (que no es ningún producto) y «cuatro productos» listando tres | Las tres resueltas. **Ninguna fecha inventada**: las noticias sin fecha se quedan con «Tipo · nombre» |
| 20 | A | «la animación de Quasar no me gusta, ¿podemos hacerla más orgánica y con más sentido?» | **Dos bucles infinitos sin significado**: una luz barriendo el peine cada 8 s y la marca de Quasar latiendo de opacidad (de ahí el granate de la captura) | La escalada: Quasar entra el 178.º y sube al 13.º con la etiqueta contando su ordinal, los adelantados cediendo y volviendo. Pasa una vez y para |
| 21 | A | «Eric dice si podemos poner Agentation, que te permite dar feedback clicando en el elemento» | Agentation es un **componente React**, y esta web es HTML estático. Y al probarlo, destapó que el canvas decorativo del hero tenía `pointer-events:auto` encima del texto: **el titular no se podía seleccionar** | Modo revisión tras `?feedback=1` (sin el flag, cero bytes pedidos). El bug del hero corregido con dos declaraciones CSS |
| 22 | E | 5 pins: tipografía de las cifras · «que parezcan menos 3D de dibujo, parecen de juguete» · retratos a trazo como los de Olivetti · + copy original | La tipografía: las cifras iban en Geist Mono, pero **Multiverse usa JetBrains Mono** en su propia web. El material: caras planas de un color + contorno negro de 1 px = plástico. El copy: el problema no era la calidad, era la **autoría** | `--mono` a la mono de la marca. Material con luz única, degradado por cara, cantos en sombra, sombra de contacto, reflejo del acento, barrido especular. 17 bloques de copy restaurados a sus palabras |
| 22b | A | «las fotos del equipo tienen que mimetizarse mejor con el fondo, llaman demasiado la atención» | El techo de la rampa era rosa pálido sobre un fondo casi negro, a 220 px | Tres grados enseñados **a la vez en la misma página**; se elige el hundido (180 px). Nombres con hash de contenido, porque la CDN los sirve inmutables |
| 22c | A | «ponles algo de opacidad para que se mimeticen, un 50 % o así» | — (ajuste de grado) | Una línea de CSS, no un reprocesado de los archivos |
| 22d | A | «vuelve al 100 % pero otro tinte, un gris que contraste pero no demasiado» | El rojo no era el camino: al 100 % llamaba, al 50 % se apagaba | Rampa con los grises de la propia página, techo `#A6ADB5`. Y la lección de despliegue: **el alias tarda segundos**, la primera lectura devolvió el HTML anterior |
| 23 | A | «el logo del nav algo más grande» · «el scroll a veces va lento, optimízalo al máximo» | El JS no era el cuello (2 ms por frame). Era que **la página no se quedaba quieta nunca**: aparcado en cualquier punto había ~120 repintados por segundo, porque tres bucles de CSS seguían corriendo a diez pantallas de distancia | Logo +30 % sin mover el header ni un píxel. Hilo principal **−30 % escritorio, −32 % móvil**; pintado móvil −56 %; layouts forzados 805 → 315 ms. Tres optimizaciones «obvias» medidas y **descartadas** |
| **P1** | A | «¿podemos conectarlo a nuestra URL de Vercel?» | El repositorio entero se habría servido en la web pública (herramientas, fuente, registro interno) si el *Root Directory* no apunta a `dist` | Repo privado por SSH + `vercel git connect` sobre el proyecto existente, así que **la URL no cambia**. Comprobado en vivo que `/CLAUDE.md`, `/tools/iso.py` y `/site/src.html` dan 404 |
| **P2** | A | «¿cómo invito a alguien al repositorio?» | — | El procedimiento, y por qué el repo es privado a propósito: este registro lleva feedback interno textual |
| **P3** | A | «proyecto terminado, ¿qué hemos aprendido y qué podemos convertir en skill?» | Lo aprendido estaba atrapado en un `CLAUDE.md` de un solo proyecto | Skill `iso-diagrams`: el kit autónomo, el generador de material para cualquier paleta, la hoja de contactos y **las trampas ordenadas por lo caras que salen**. Probada en frío por un agente sin contexto, que destapó 12 clases sin estilo |
| **P4** | A | (misma petición) | Dos skills existentes tenían el hueco exacto que este proyecto rellenó | `andoni-design/learning-log.md` con las cuatro lecciones de criterio; `web-perf-forensics/fixes.md` con el caso «La página que nunca se queda quieta» |
| **P5** | A | «extráeme en un MD todos y cada uno de los pasos para sacar la receta mágica» | — | Este documento. Al verificar el conteo apareció un error en mi propia cuenta anterior (decía 27 entregas; las rondas de diseño son 26) |

---

## 4. Dónde se fue el esfuerzo

Clasificando las 31 entregas por lo que las causó:

| Causa | Entregas | % |
|---|---|---|
| **Decisión legítima del cliente** — cambiar de opinión, pedir algo nuevo, afinar un gusto | 13 | 42 % |
| **Ambigüedad no resuelta** — una frase admitía dos lecturas y elegí la equivocada | 6 | 19 % |
| **Defecto mío** — algo que debí detectar antes de entregar | 5 | 16 % |
| **Trabajo nuevo** — secciones o funciones que no existían | 4 | 13 % |
| **Proceso e infraestructura** — publicar, versionar, destilar | 3 | 10 % |

Casi la mitad eran inevitables y sanas: así se dirige un proyecto de diseño. **El 35 % restante
—ambigüedades y defectos— es lo que esta receta intenta recortar.**

### Las seis ambigüedades que costaron una ronda entera

Son el patrón, y vale la pena verlas juntas: **en cinco de las seis, la lectura equivocada fue la
opuesta exacta de lo que se pedía.** No fueron matices; fueron inversiones de signo.

1. **«El footer tiene el mismo color que la web»** (ronda 8). Lo leí como queja y lo puse negro. Era
   un requisito: lo quería igual. Corregido dos rondas más tarde.
2. **«Una matriz que se reordena formando el logo»** (ronda 9). La hice plana. La quería en 3D.
3. **«Trazos menos definidos, que no parezcan tan 3D de dibujo»** (ronda 22). Lo leí como *menos*
   material —construí dos variantes a línea, «Plano» y «Alambre»— cuando pedía *más*: volumen,
   reflejos, material.
4. **«Lo mismo que la sección 2»** (ronda 3). Podía significar el degradado o la animación al hover.
   Elegí una, lo dije explícitamente en el log, y acerté por suerte.
5. **El tinte de los retratos** (rondas 22 → 22d). Cuatro pasadas hasta dar con el gris. Se resolvió
   en cuanto dejé de enseñar un grado por ronda y empecé a enseñar **tres a la vez en la misma
   página**.
6. **«Que parezca que tienen físicas»** (ronda 16). Físicas *sin rebote*, porque el rebote estaba
   prohibido desde la ronda 10. Dos reglas que en apariencia se contradicen y que había que conciliar:
   la salida fue gravedad (`power2.in`) y peso transmitido, nunca elasticidad.

La regla que sale de aquí, y que está en el prompt maestro: **cuando una frase admita dos lecturas
opuestas, no elijas — enseña las dos o pregunta.** Una pregunta cuesta un minuto; una inversión de
signo cuesta una ronda y a veces dos.

### Los cinco defectos que no debí entregar

- **CSS que no existía** para clases que sí estaban en el marcado: `.more`, `.quasar`, `.company`
  (ronda 1). El ritmo de secciones estaba *escrito* pero nunca llegó a existir.
- **Dos ilustraciones que contaban lo mismo** con el mismo objeto (ronda 6). Llevaban seis rondas ahí.
  Lo cazó la hoja de contactos, no una mirada más atenta.
- **Cuatro errores de orden de pintado** en los isométricos (ronda 8): un tambor tapado por un
  servidor que está delante, una bandeja dibujada entera por delante de la ranura de la que sale.
- **Bucles infinitos que seguían corriendo** tras haberlos «quitado» en dos rondas anteriores
  (ronda 14, medido con `getAnimations()`). Y todavía quedaban tres en la ronda 23.
- **El titular del hero no se podía seleccionar** (ronda 21). Llevaba así desde el principio; un
  canvas decorativo con `pointer-events:auto` se comía la selección, el clic derecho y cualquier
  herramienta que identifique elementos por `elementFromPoint`. Lo destapó un pin de Eric.

**Los cinco tienen el mismo origen: falta de verificación, no falta de criterio.** Ninguno se habría
encontrado pensando más; los cinco se encuentran mirando con un instrumento. De ahí que la receta
dedique tanto espacio a cómo se comprueba.

### Los tres anti-patrones de proceso

No son errores de diseño, son de método. Cuestan más que los otros porque se repiten.

1. **Insistir por código en algo que necesita otra herramienta.** Los retratos «a trazo» se
   intentaron tres veces por algoritmo (bandas, filtro posterizado, render por pinceladas, cuatro
   iteraciones de la última) y el veredicto fue «muy cutres» las tres. Con una acuarela como
   referencia, un retrato pintado lo pinta un modelo de imagen o un ilustrador. **La segunda vez que
   un enfoque falla, hay que cambiar de enfoque, no de parámetros.**
2. **Un grado por ronda.** Cada iteración de tinte, tamaño u opacidad gastada de una en una es una
   ronda tirada. Tres variantes en la misma página resuelven en una lo que tardó cuatro.
3. **Medir con un instrumento que miente.** `frames.mjs` hacía scroll con saltos de 90 px, que no
   pasan por el smooth-scroll de la página: daba resultados contradictorios entre pasadas y llegó a
   justificar conclusiones opuestas. Hasta que se escribió una herramienta con rueda real
   (`scrollprof.mjs`), «va fluido» no significaba nada.

---

## 5. Lo medido, de punta a punta

La única forma de que «terminado» signifique algo. Estas son las cifras que el proyecto dejó
registradas, no estimaciones.

### Rendimiento (ronda 23, rueda real, pares intercalados contra la versión en vivo)

| | antes | después |
|---|---|---|
| Trabajo de hilo principal, escritorio | 33,1 / 40,1 / 46,6 s | **28,2 / 26,4 / 31,7 s** (−30 %) |
| Trabajo de hilo principal, móvil (cpu×4) | 52,3 s | **35,4 s** (−32 %) |
| Pintado / composición de capas, móvil | 11,6 / 11,6 s | **5,1 / 5,3 s** (−56 % / −54 %) |
| Frames > 20 ms, escritorio | 2,5 / 2,9 / 1,2 % | **0,9 / 2,0 / 0,9 %** |
| Frames > 20 ms, móvil | 0,8 % | **0,2 %** |
| Repintados aparcado, 2 s sin tocar nada | hero 417× · quasar 189× · footer 242× | **91× · 118× · 96×** |
| Layouts forzados por JS, página entera | 805 ms | **315 ms** |
| Frames largos en `#contact` | 6,9 % | **0,3 %** |

### Peso del documento, ronda a ronda

576 KB (inicio) → 564 (r1, fuera los iconos de stock) → 625 (r7, el detalle de las ilustraciones) →
653 (r11) → 623 (r14, fuera las fotos de prensa) → 682 (r22, el material) → **670 KB** con los
retratos como archivos externos en vez de incrustados.

La lección: el peso no bajó por comprimir, bajó por **quitar lo que no defendía nada** (iconos de
stock, fotos de prensa) y por sacar fuera lo que no tenía que viajar en el HTML.

### Lo que se midió en cada ronda, sin excepción

Chrome **y** WebKit, a 1440×900 y 390×844, con `reduced-motion`: consola limpia, 0 respuestas ≥400,
0 desborde horizontal, 0 imágenes rotas. Más, según lo que se tocara: histograma de frame times, las
animaciones muestreadas **por progreso real** (no por scroll a ojo), los hovers capturados en su
estado real, las caídas muestreadas frame a frame, el traspaso de ilustraciones en vuelo.

### Tres optimizaciones «obvias» que se midieron y se tiraron

- **Quitar el `backdrop-filter` del header.** Sin el blur salió *igual o peor* (GPUTask 3,32 → 3,63 s
  y 3,20 → 3,71 s en dos pares). Se queda el cristal.
- **Promocionar cada ilustración a capa mientras se dibuja.** Las SVG pasaban a pintarse aparte, pero
  el total no bajaba: 31,7 vs 23,5 s a favor de *no* hacerlo.
- **Componer la escena sticky de `#deploy`.** Sin diferencia medible.

Por eso el prompt maestro dice: *antes de aplicar una optimización obvia, mídela.*

---

## 6. La especificación completa

Las secciones anteriores cuentan **cómo** se llegó. Esta cuenta **qué hay que construir**, con los
valores reales, para llegar al mismo sitio sin las 31 vueltas. Es la parte del documento que se pega
junto al prompt del §7 cuando lo que se quiere es reconstruir *esta* web, no una equivalente.

### 6.1 Arquitectura y build

```
site/src.html          la única fuente que se edita (3.188 líneas: CSS, marcado y JS en un archivo)
site/_*.html           parciales incluidos con {{include:…}}  (_panels, _symbols, _review, _iso-*)
site/_iso-*.html       13 fragmentos SVG generados — NO se editan a mano
site/build.py          resuelve {{include:…}} y {{asset:…}} (SVG → data-URI percent-encoded)
  → site/index.html    documento completo, ~670 KB, autocontenido
  → site/artifact.html head+body, para publicar como Artifact
tools/iso.py           genera los _iso-*.html (escenas isométricas en unidades de mundo)
dist/                  lo único que se publica: index.html, og.png, robots.txt, team/, vercel.json
```

Reglas del sistema, todas aprendidas a golpes:

- **Nunca editar `index.html` a mano.** Se edita `src.html` y se reconstruye.
- **Nunca editar los `_iso-*.html` a mano.** Se toca la función de la escena en `iso.py` y se
  regenera todo.
- `vercel.json`: el HTML con `must-revalidate`, los estáticos inmutables a un año. Por eso los
  retratos llevan **hash de contenido en el nombre** (`team/roman-orus.b8e29ef1.webp`).
- Vercel conectado al repo con *Root Directory* = `dist`. Sin eso se serviría el repositorio entero.
- Dependencias externas: **ninguna en producción**. GSAP 3.15 + ScrollTrigger + Lenis 1.3 por CDN
  pinned, y el modo revisión (React + Agentation, 553 KB) solo tras `?feedback=1`.

### 6.2 Tokens — literal

Un solo tema, oscuro. Este bloque es el contrato de color de toda la página:

```css
:root{
  --bg:#15181C; --bg-2:#1B1F24; --bg-3:#22272D; --bg-4:#2A3037;
  --ink:#F8FAFC; --ink-2:#C9CED5; --mute:#8E959E;
  --line:rgba(248,250,252,.12); --line-2:rgba(248,250,252,.22);
  --red:#F01438; --red-2:#FF3D5C; --red-ink:#FF5C77; --red-dim:rgba(240,20,56,.14);
  --on-red:#fff; --logo-filter:grayscale(1) brightness(1.8) contrast(.85);
  --glass:rgba(21,24,28,.82); --shadow:0 30px 80px rgba(0,0,0,.55);
  --glow:rgba(240,20,56,.15);
  --sans:"Schibsted Grotesk","Helvetica Neue",Arial,sans-serif;
  --mono:"JetBrains Mono","SFMono-Regular",Menlo,Consolas,monospace;
  --gutter:clamp(20px,4vw,64px); --maxw:1440px;
  --r:2px; --r-box:6px;      /* --r: marcas pequeñas · --r-box: TODA caja y control */
  color-scheme:dark;
}
```

- **Cuatro fondos, no dos.** El ritmo de la página se hace con `--bg` y `--bg-2` alternando por
  secciones, con hairline `--line` arriba y abajo de las elevadas.
- **Tres rojos con oficio distinto**: `--red` es el relleno y la regla; `--red-2` el rojo un paso más
  claro para cuando el rojo va sobre rojo; `--red-ink` el rojo de texto (contraste suficiente sobre
  `--bg`); `--red-dim` los fondos teñidos.
- **Dos radios y solo dos.** `--r-box:6px` en CTA, pills, burger, readout, paneles, tooltip, imagen
  del mega-menú. `--r:2px` en tiles de icono y etiquetas. Ocho radios distintos fue el defecto de la
  ronda 14.
- `--logo-filter` es lo que iguala los logos de clientes a tinta monocroma.

### 6.3 Tipografía

```html
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **Sans: Schibsted Grotesk** (400/500/600 + itálica 400) para todo el texto.
- **Mono: JetBrains Mono** (400/500) para cifras, kickers, etiquetas y specs — **porque es la mono
  que usa la web real de Multiverse.** Este dato salió de mirar sus hojas de estilo, no una captura.
- Kickers y etiquetas: mono, versalitas, tracking abierto. Los titulares en **caja baja**, también
  los que vienen en caja alta del cliente (eso es tipografía, no copy).
- `text-wrap:balance` en titulares de escritorio; **`pretty` por debajo de 720 px** (medido: da mejor
  rag en 3 de 4 titulares problemáticos a 390 px). `tabular-nums` en cifras y contadores.
- El punto decimal de las cifras mono va con `margin:0 -.13em`: en JetBrains Mono el glifo avanza
  `.6em` y en una caja de `.34em` se desborda («97 .4%» era el síntoma).
- Prohibido en este proyecto y en general: Inter, Roboto, Arial y Space Grotesk por defecto.

### 6.4 Retícula, breakpoints y maquetación

- Ancho máximo `--maxw:1440px`, gutter fluido `clamp(20px,4vw,64px)`.
- Breakpoints reales, por lo que rompe en cada uno (no por convención): **900** (mega-menú y modo
  revisión), **860** (la escultura de `#stack` pasa a columna), **820**, **800**, **760** (se apaga la
  luz del hero: halo detrás de texto), **759/720** (`text-wrap`), **620**, **560** (equipo y nombres
  largos a una columna).
- Altos de pantalla en `dvh`/`lvh`, **nunca `vh`**. Cualquier denominador de progreso en la misma
  unidad que su pista, medido con una sonda real en el DOM.
- Lo que sangra fuera de un contenedor se deriva del gutter (`var(--gutter)*.34`), nunca en px fijos.
- Rejillas de información: celdas **unidas**, cantos rectos, divisiones en dashed que **sobresalen**
  del bloque (utilidad `.sheet`: cuatro tiras en los márgenes cuyos bordes caen sobre las reglas, con
  `top:-1px`/`left:-1px` porque los offsets absolutos van contra la caja de padding).
- Escala de z-index fija y documentada; el modo revisión en 100000.

### 6.5 Header y mega-menú

- Header fijo, fondo `--glass` con `backdrop-filter` (**medido: quitar el blur no mejora**, se queda).
  Altura 71,5 px escritorio / 69 px móvil, y **esa altura no se mueve nunca**: el logo creció de 40 a
  52 px con `margin:-6px 0` para que la caja siga midiendo lo mismo.
- Hover de los ítems: regla roja + un **radial** que sube desde la regla y muere antes del canto, con
  la distancia derivada del padding real del header (`--hpad`), no a ojo.
- Mega-menú: panel con hairline `--line` arriba y abajo (nunca una regla roja debajo), reglas
  horizontales bajo cada cabecera de columna y **ninguna vertical**. El resaltado que viaja entre
  filas es el mismo radial desde su canto rojo.
- Menú móvil: mismo lenguaje; el CTA que genera el JS es `.btn-ghost` (secundario, **sin icono**).

### 6.6 Las secciones, en orden

Once `<section>` más el footer. Lo que cada una hace es tan parte de la especificación como su copy.

| # | `id` | Titular | Qué es |
|---|---|---|---|
| 1 | `hero` | **«Pioneering the era of efficient & secure AI.»** (suyo, literal) | Canvas con la esfera de puntos que se comprime en el isotipo, atado al scroll. Halo rojo en bandas detrás del modelo, círculo entero con radio calculado. Chip de noticias que rota. Dos CTA: «Explore our AI models» / «Contact us» |
| — | (tira) | — | Tira de prueba: tres cifras en mono + un logo de cliente que cambia, revelado en tajadas |
| 2 | `for` | «Built for whoever pays the compute bill.» | Cuatro públicos (digital natives, corporaciones, data centers, fabricantes) como **una sola hoja**: sin gap, cantos rectos, divisiones dashed, marcas rojas en las esquinas. Cada card con su ilustración que se redibuja al hover y su enlace `.more` |
| 3 | `quasar` | «Europe's highest-scoring model. Built by compressing, not by adding.» | Fondo elevado `--bg-2`. Tira de ranking de 178 modelos: **la escalada** — Quasar entra el 178.º y sube al 13.º, una vez. Tablero de benchmarks y línea de la API con su cursor |
| 4 | `how` | «A 4096×4096 matrix, and the third of it that carries information.» | Pinada. Canvas en tres estaciones atadas al scroll: la matriz se perfila, dos tercios se descartan, el tren de tensores se forma y el resultado se **dibuja** (contorno y luego color). Barra de progreso con su `%` en capa propia |
| 5 | `deploy` | «One model. Four places to run it.» | Escena sticky con **una sola ilustración que se transforma** entre los cuatro lugares: se mide la caja real del modelo en el dibujo que sale y en el que entra, y el nuevo aterriza sobre el píxel exacto del anterior. El modelo nunca desaparece |
| 6 | `suite` | «Compress it. Run it. Host it. Govern it.» | Fondo elevado. Acordeón de tres productos, uno abierto a la vez; luz de hover que nace del centro de la regla inferior de la fila con `inset:0`. Wordmarks reales que suben a blanco pleno |
| 7 | `foundry` | «Pick a model. Pick where it runs. Watch what it costs.» | Panel de cuatro pasos que se recorre solo, con gráfica de 30 días. Altura fija para que no salte entre pasos |
| 8 | `stack` | «One stack. A fraction of the weight.» | **La única sección centrada de la página** — la ruptura de ritmo. Rejilla de 6×6 `--u`: seis bloques con nombre + tres rellenos + dos rombos, que **caen con gravedad** al entrar. Hover: cada pieza se aleja del centro de la masa; la de la derecha vuelca 14° y se queda de canto |
| 9 | `industries` | «Trusted by leading efficiency-driven industries.» | Bento de celdas de altura igual (`minmax(150px,1fr)`), diez sectores con su icono real, sin hover (no son clicables). Solo la celda enlazable responde. Muro de logos igualados por **tinta medida** |
| 10 | `results` | «Validated by global leaders.» | Cuatro medidas que se turnan **por click, nunca por hover**. La animación interpola `flex-grow` con `flex-basis` fijo (interpolar hacia `auto` daba un salto) |
| 11 | `company` | «The biggest quantum software provider in Europe.» | Párrafo fundacional suyo íntegro, cifras en mono, el linaje en tres ilustraciones, los cuatro retratos del equipo (WebP, rampa gris techo `#A6ADB5`, 180 px, opacidad plena) y las noticias que **rotan** una columna a la vez |
| — | `foot` | «Unlocking the quantum AI software revolution.» | Fondo `--bg` (el mismo que la página), halo en bandas, y el **tensor 3D cuyos cubos rehacen el isotipo**. Dos CTA: «Start building» / «Contact us». Reloj de Donostia. Punto de «API operational» en `transform`/`opacity` |

Separadores: **exactamente dos**, lejos uno de otro (antes de `#stack` y antes del footer), donde dos
secciones comparten fondo. Nunca seguidos ni justo después del hero.

### 6.7 Las quince ilustraciones: qué afirma cada una

Esto es lo primero que hay que escribir, antes de dibujar nada. Son las líneas reales del generador:

| escena | lo que afirma |
|---|---|
| `deploy_cloud` | un modelo comprimido en una capa alojada sobre tus propios servidores, con una sola llamada entre ellos |
| `deploy_rack` | racks sobre una placa; el modelo comprimido ocupa un slot más, sin hardware nuevo |
| `deploy_edge` | un recinto vallado con su propia planta y el modelo dentro; la ruta de salida está cortada |
| `deploy_device` | un móvil boca arriba; un volumen a trazos es su presupuesto de memoria, y el modelo cabe dentro |
| `suite_compactifai` | tres capas: modelos comprimidos con nombre arriba, la red tensorial en medio, la rejilla de hardware abajo |
| `suite_sentinel` | las peticiones viajan de tus apps a los modelos por una puerta que escanea; una queda retenida |
| `suite_singularity` | una retícula 5×5 de decisiones sirviendo depósito, turbina y almacén, con una ruta óptima en rojo |
| `lin_lattice` | física cuántica de muchos cuerpos: una retícula de espines, unos cuantos volteados |
| `lin_train` | la misma descomposición como una cadena de núcleos; el último es el que se entrega |
| `lin_compact` | nueve capas entran, tres salen; las seis retiradas se levantan como cristal |
| `seg_scale` | un modelo pequeño, y toda la demanda que le eches encima |
| `seg_extend` | entra deslizándose en el rack que ya compraste |
| `seg_capacity` | dos inquilinos en cada slot que antes sostenía uno |
| `seg_device` | el modelo llega como un chip |
| `green_transition` | menos cómputo es menos energía: el mismo trabajo, dos facturas |

Ninguna repite sujeto, y en cada una el rojo marca **una** cosa: el modelo. Material: una sola luz
arriba-izquierda-delante, degradado por cara, cantos en sombra de su propia cara a .55 px, sombra de
contacto corrida hacia el lado contrario a la luz, reflejo del rojo sobre la placa, barrido especular
en las placas. El isotipo real (`#mark-s`, variante de 9 bandas) impreso en la tapa del modelo.

### 6.8 Las cuatro escenas de canvas

Todas 2D, ortográficas, **con `pointer-events:none`** (la que necesita ratón se lo pone desde el JS y
solo si hay `hover:hover`).

1. **La esfera del hero.** ~3.000 puntos que se comprimen en el isotipo, atados al scroll. Los puntos
   se pintan **por lotes**: agrupados en 16 tintes × 40 alfas, un `fill()` por cubo (~40 cambios de
   estado por frame en vez de 3.000). El halo y su radio (`--hx/--hy/--hr/--hl`) los escribe la
   propia escena en su `resize`, no están a ojo.
2. **El perfilador de `#how`.** La matriz de 4096², sus dos tercios descartados con rampa `clear`
   (p 0,30→0,46, para que el paso dos no arrastre el paso uno), el tren de tensores sin patas
   verticales, y la pieza final **dibujándose** con su charco de contacto y su reflejo.
3. **El tensor del footer.** 8×8×8 = 512 cubos girando despacio (balanceo 19°–53°). Un plano rojo lo
   atraviesa y marca **exactamente los 210 cubos que tiene el logo** (las celdas de `#mark-s`: una
   fila por banda, un cubo por grosor de banda). Salen en orden de lectura, reconstruyen el logo como
   un muro que gira **hasta quedar de frente**, se cierran en barras y hacen crossfade a `#mark` — las
   rutas reales del isotipo. Ciclo de 12 s sin salto. Como todos los cubos comparten orientación, se
   proyecta **un** cubo por frame y cada uno son tres caras trasladadas.
4. **Los separadores.** Cuadrícula de 5 filas de 16 px (13 en móvil), ajustada por JS a cuadrados
   enteros, con 10 px de margen para que el bloque girado no se recorte. Al pasar el ratón cada
   cuadrado que cruzas se levanta 5 px y **gira hasta 12°** hacia un lado sorteado al marcarlo;
   altura y color bajan juntos en 0,9 s. Pintados de atrás adelante. Sin efecto en táctil.

### 6.9 Inventario de motion

Lo que se mueve, y con qué ley. Todo con `prefers-reduced-motion` y estado final válido.

| Dónde | Qué hace | Ley |
|---|---|---|
| Hero | la esfera se comprime en el isotipo | atado al scroll (scrub) |
| `#how` | tres estaciones y la pieza que se dibuja | atado al scroll, muestreado por **progreso real** |
| `#deploy` | una ilustración que se transforma en otra | medida de caja real + ensamblado escalonado |
| `#stack` | nueve piezas caen | **gravedad**: `power2.in`, g=2400 px/s², 300 px sobre **el hueco de cada pieza** (√(2h/g)=0,5 s), 0,1 s entre filas; al aterrizar, lo que hay debajo cede 3,2 px y vuelve (`power3.out`, 0,34 s) |
| `#quasar` | Quasar escala del 178.º al 13.º | `power3.out` 2,4 s (rápida abajo, lenta en la cima), la etiqueta contando su ordinal, los adelantados cediendo (`power2.out`, 0,8 s). **Pasa una vez** |
| Ilustraciones | contorno y luego color (`drawIn`) | `stroke-dashoffset` en orden de pintado, después entra el relleno |
| CTA primario | cinco barras se cierran a tres | 180 ms `cubic-bezier(.2,0,0,1)`; las exteriores se deslizan 5 px bajo sus vecinas |
| CTA (todos) | puntos que se revelan junto al cursor + pulso de entrada | radial de 24 px siguiendo `--mx/--my`; el pulso nace en `--ex/--ey` (donde el cursor cruza el borde) y crece a la esquina más lejana en **1,05 s** `cubic-bezier(.22,1,.36,1)`, con `@property` para poder animar radio e intensidad |
| Noticias | una columna cada 5,6 s | línea roja recorriendo su hairline; sale hacia arriba y entra la siguiente en 0,6 s. Pausa bajo cursor, con foco, fuera de pantalla y con pestaña oculta |
| Footer | el tensor rehace el logo | ciclo de 12 s: barras 4,7–5,2 · logo 5,1–5,8 · espera · vuelta 8–8,5 |

**Nada más se mueve.** Cero bucles decorativos, cero rebotes, cero fade-up uniforme, y todo lo que
sea infinito va en `transform`/`opacity` y se pausa con `.offscreen`.

### 6.10 Rendimiento: las siete reglas que la página cumple

No son optimizaciones posteriores; son condiciones de construcción (si no, se paga la ronda 23):

1. Un `IntersectionObserver` marca `.offscreen` en cada sección fuera de vista (margen 120 px) y una
   regla pausa ahí **toda** animación. Las dos escenas sueltan además sus capas (`visibility:hidden`).
2. Ningún bucle anima `box-shadow`, `left` ni nada que fuerce paint o layout.
3. Ninguna `mask-image` se queda puesta después de revelar: vive en `.foot.revealing` y el propio
   scrub la quita.
4. El bucle de rAF **memoiza por elemento**: no escribe `innerHTML`, `textContent` ni estilos si el
   valor no cambió, y no lee `offsetWidth` dentro del bucle (los anchos se miden en `resize` y en
   `fonts.ready`).
5. **Lenis va prioritario en el ticker** (`gsap.ticker.add(fn, false, true)`) y todo lo que escriba
   DOM por frame va detrás, en el mismo ticker. Un `requestAnimationFrame` suelto se cuela antes y
   fuerza layout (fueron 333 ms).
6. Los puntos del canvas se pintan por lotes, no uno a uno.
7. La barra de progreso pinada va en su propia capa (`will-change:transform`).

### 6.11 El orden de construcción

Ocho fases. El orden importa: cada una deja fijo lo que la siguiente da por supuesto.

1. **Fuente de verdad.** Extraer de la web del cliente: copy de posicionamiento literal, tipografías
   reales de sus hojas de estilo, cifras de sus notas de prensa, logotipos de sus productos.
2. **Tokens y build.** El bloque `:root` completo, el build de un archivo, un solo tema.
3. **Esqueleto y ritmo.** Las once secciones con su titular y su fondo alternando. Comprobar el ritmo
   **renderizando** (`rhythm.mjs`), no leyendo el CSS.
4. **Material de ilustración antes de dibujar.** Generar los degradados y las reglas con el color de
   marca. Dibujar con un material provisional obliga a revisar la familia entera después.
5. **Las quince ilustraciones**, una línea de intención cada una, y **la hoja de contactos a 150 y a
   400 px** antes de darlas por buenas.
6. **Las escenas de canvas y el motion**, con las siete reglas de 6.10 puestas desde el primer día.
7. **Modo revisión tras `?feedback=1`** antes de la primera revisión con alguien de fuera.
8. **Verificar y publicar**: Chrome y WebKit, 1440 y 390, reduced-motion; frame times con rueda real;
   y la URL en vivo leída **dos veces**.

### 6.12 Cómo usar esto de una tirada

Pega **§6 completo + §7** como un solo encargo, y añade al final:

````markdown
Construye esto de una tirada, en este orden (§6.11). No me preguntes por decisiones que ya están
escritas arriba; pregúntame solo si algo de la especificación se contradice con lo que encuentres en
la web del cliente. Al terminar cada fase, verifica lo que la fase afirma (§6.11 dice con qué) y
sigue. No des nada por terminado sin la verificación del §7, y entrégame al final: qué has
construido, qué has medido con sus números, y qué ha quedado fuera y por qué.
````

Lo que **no** se puede sacar de una tirada, ni con esta especificación: el copy nuevo de las
secciones que el cliente no tiene, las direcciones creativas que haya que proponer, y los ajustes de
grado (tinte, tamaño, opacidad). Esos siguen necesitando a alguien decidiendo — pero llegan en la
ronda 2, no en la 22.

---

## 7. La receta: el prompt de arranque

Esto es lo que habría que pegar al empezar un encargo equivalente. No es corto a propósito: **cada
párrafo está aquí porque su ausencia costó al menos una ronda.**

````markdown
# Encargo

Rediseña y construye la home de <EMPRESA>. Su web actual es <URL>. Es un rediseño para presentar al
cliente, no una web definitiva: el objetivo es que vea su propio contenido con un nivel de diseño y
de detalle que hoy no tiene.

## Quién eres en este encargo

Diseñador y director de arte, no solo desarrollador. Decides qué merece existir en la página y lo
defiendes con argumentos. Propón 2–3 direcciones con nombre antes de construir, y elige una.

Cuando yo diga algo vago, **tradúcelo a una causa técnica antes de tocar nada**: mi vocabulario
describe el síntoma, casi nunca la causa. Si digo «parece de juguete», «hace un raro», «no es fluido»
o «no me convence», tu primer trabajo es averiguar qué falla de verdad, no aplicar lo primero que
suene parecido.

## Fuente de verdad

1. **El copy es del cliente.** Los titulares de las secciones que tú inventes son tuyos; el titular
   principal, el cierre y cualquier frase de posicionamiento son suyos: cópialos literalmente de su
   web actual. Cambiarlos es tomar una decisión estratégica que no nos corresponde, y si el cliente
   ve copy nuevo dejará de mirar el diseño.
2. **La marca también.** Antes de elegir tipografía, mira **qué usa su web real** (las hojas de
   estilo, no lo que parezca en una captura) y úsala. Si su mono es JetBrains Mono, las cifras van en
   JetBrains Mono. Y si un producto suyo ya tiene logotipo, se usa su símbolo real: nunca un glifo
   inventado.
3. **Las cifras vienen de sus notas de prensa.** Ninguna inventada, ninguna fecha inventada. Si falta
   un dato, se deja el hueco y me preguntas.
4. **Un estado se cuenta de una sola manera.** Si un producto es «early access» en un sitio, no es
   «coming soon» en otro; si una ronda de financiación es un objetivo, no es una cifra cerrada.

## Sistema

- Un único archivo fuente con un build mínimo (que resuelva parciales e incruste los SVG). Nada de
  framework si la web es una sola página. **Nunca editar el archivo generado a mano.**
- **Un solo tema.** Elige oscuro o claro y comprométete; no construyas dos paletas «por si acaso».
- Tokens desde el principio: paleta, escala tipográfica, spacing, **un solo radio** para cajas y
  controles, una escala de sombra. Ocho radios distintos en una página es el olor más rápido de una
  web sin sistema.
- Cada clase del marcado tiene su regla CSS, y cada regla CSS tiene marcado detrás. Ni una huérfana.
  Ni `id` duplicados: rompen las anclas del nav en silencio.
- **Ritmo entre secciones**: que no tengan todas el mismo fondo y el mismo padding. Y compruébalo
  renderizando, no leyendo el CSS.
- Altos de pantalla con `dvh`/`lvh`, nunca `vh`. Cualquier denominador de progreso en la misma unidad
  con la que está maquetada su pista, medida con una sonda real en el DOM.
- Lo que sangra fuera de un contenedor se deriva del gutter, nunca en px fijos: en móvil se come el
  margen y provoca desborde.

## Ilustración

Nada de iconos de stock, 3D de banco de imágenes ni imágenes generadas como ilustración de sección:
las tres ilustran la categoría, no el producto. Dibuja una familia por código (isométrica, SVG desde
un script **en unidades de mundo**, que es lo que permite comprobar midiendo en vez de a ojo).

- **Escribe primero, en una línea, qué afirma cada dibujo.** Si dos líneas se parecen, sobra una.
- Un sujeto por dibujo, y que sea el producto, no el mobiliario que lo rodea. Ningún objeto se repite
  como sujeto en toda la familia: la coherencia la da el material, no repetir la misma caja.
- El color de marca marca **una** cosa por escena. Si todo es rojo, nada es rojo.
- Material, no plano: una sola luz, un degradado por cara, cantos en sombra de su propia cara (nunca
  tinta negra a 1 px), sombra de contacto, reflejo del acento sobre el suelo, barrido especular en las
  placas. Un isométrico de caras planas con contorno negro parece de juguete, y **«parece de juguete»
  siempre significa que falta material, no que sobra**.
- El orden de llamada es el orden de pintado, de atrás hacia delante: si dos piezas están separadas
  en x o en y, la de menor coordenada va antes. Comprueba también que cada huella apoya **dentro** de
  su plato.
- Antes de darla por buena, móntalas **todas en una hoja de contactos** a 150 px y otra a 400 px. Los
  duplicados y los fallos de perspectiva no se ven mirando un dibujo solo.

## Motion

- Una idea fuerte por página, no diez efectos. Una firma memorable por sección, no un fade-up
  uniforme en todas.
- **Nada de rebotes**: ni `elastic`, ni `back`, ni overshoot, ni squash-and-stretch. Restan seriedad.
  El movimiento llega y se para. Si hace falta peso, es gravedad (`power2.in`, aceleración constante)
  y lo que hay debajo cediendo y volviendo, nunca elasticidad.
- **Ningún bucle decorativo.** Las ilustraciones se dibujan al entrar (contorno y luego color) y se
  quedan quietas. Una animación de datos escenifica lo que el dato afirma, pasa una vez y para.
- Cualquier animación infinita que sobreviva va en `transform`/`opacity` y **se pausa fuera de
  pantalla**: si no, repinta la página entera en cada frame, estés donde estés. Nunca animes
  `box-shadow`, `left` o cualquier cosa que fuerce layout o paint en bucle.
- El hover va solo donde hay acción. Nada de hover en lo que no es clicable, ni en lo que ya está
  abierto.
- `prefers-reduced-motion` siempre, con un estado final válido y legible.
- Si una capa la coloca el JS, su estado por defecto en CSS tiene que ser invisible o ya correcto: en
  iOS un primer frame mal colocado no se corrige solo.

## Verificación — antes de decirme que algo está terminado

Nunca «se ve bien». Mídelo, en **navegadores reales** (Chrome y WebKit vía playwright, no un panel
embebido: ahí las capturas salen negras y el rAF va a 1 fps), a 1440×900 y 390×844:

- consola limpia, 0 respuestas ≥400, 0 desborde horizontal, 0 imágenes rotas;
- las animaciones muestreadas **por progreso real**, no por scroll a ojo;
- los hovers capturados en su estado real, no descritos;
- el rendimiento con un histograma de tiempos de frame (% > 20 ms y p90) usando el scroll de una
  persona (rueda), no saltos de `scrollTo` que se salten el smooth-scroll;
- y **antes de aplicar cualquier optimización «obvia», mídela**: en este proyecto tres de ellas
  empeoraron el resultado y se retiraron.

Aísla apagando **una** cosa cada vez y restaurando entre pruebas: en cascada salen culpables falsos.

## Cómo quiero el feedback y las decisiones

- Cuando una frase mía admita **dos lecturas opuestas**, no elijas: enséñame las dos, o pregunta. Una
  pregunta cuesta un minuto; una lectura invertida cuesta una ronda entera, y me pasó cinco veces.
- Cuando el ajuste sea de grado (un color, un tamaño, una opacidad), enséñame **tres variantes en la
  misma página**, no una por ronda.
- Si algo que pido contradice una regla que ya fijamos, dímelo en vez de obedecer en silencio.
- Si un enfoque falla dos veces, cambia de enfoque, no de parámetros, y dime qué haría falta.
- Separa siempre **aplicado** de **pendiente de mi OK**. Nada se despliega por inercia.
- Lleva un registro por rondas en el repo: mi frase **textual**, tu interpretación, qué cambiaste,
  qué mediste (antes → después) y qué queda por decidir. Y una lista de **«rechazado — no volver»**
  que no se poda nunca: en la ronda 30 no quiero volver a ver lo que tiramos en la 3.
````

---

## 8. Los prompts de las fases siguientes

El de arranque solo sirve una vez. Estos son los que se usan después, y valen lo mismo.

### Ronda de feedback por puntos

````markdown
Te paso <N> puntos. Para cada uno:

1. Dime qué crees que falla **de verdad** antes de tocarlo — mi frase describe lo que veo, no la
   causa. Si mi descripción admite dos lecturas contrarias, dímelo y enséñame las dos.
2. Agrupa los puntos que sean el mismo problema de fondo: casi siempre tres puntos son un arreglo.
3. Aplícalo, y mide el antes y el después de lo que hayas tocado.
4. Si algo de lo que pido contradice una regla que ya fijamos, dímelo en vez de obedecer en silencio.
5. Al terminar: qué has aplicado, qué has medido, y qué queda pendiente de mi decisión.
````

### Cuando el feedback llega en pins sobre la web publicada

Merece la pena montarlo antes de la primera revisión con alguien de fuera: un selector CSS y el texto
del elemento eliminan la ambigüedad de «eso de ahí no me gusta». Va **detrás de un flag**
(`?feedback=1`) para que en producción no se pida ni un byte, con `noindex` en la URL de revisión.

````markdown
Monta el modo revisión detrás de ?feedback=1: sin el parámetro, cero peticiones y cero interfaz.
Con el parámetro, barra de anotación y <meta robots noindex>. Verifícalo en los dos motores y
haz una anotación de punta a punta para comprobar que los selectores resuelven al elemento real,
también dentro de las secciones atadas al scroll.
````

Y cuando lleguen los pins:

````markdown
Te pego el markdown de las anotaciones. Cada pin trae el selector y el texto del elemento. Agrupa
los pins que sean el mismo problema de fondo antes de empezar, y dime cuáles son síntomas del mismo
hecho técnico.
````

### Ajustes de grado (color, tamaño, opacidad, tinte)

````markdown
Esto es un ajuste de grado, así que no me traigas una versión: móntame tres en la misma página, con
sus valores escritos, y una captura de las tres juntas sobre el fondo real. Elijo yo.
````

### Cuando hace falta una imagen que no se puede dibujar por código

````markdown
Antes de intentarlo por código, dime si esto lo resuelve mejor un modelo de imagen o un ilustrador,
y por qué. Si lo intentas por código y no llega a la referencia en dos vueltas, párate y dímelo.
Si hay que generarlo: un solo prompt para toda la serie, la misma paleta, fondo transparente, y
después lo gradúas a la rampa de color de la página para que no sea la única cosa de la web con su
propio color. Si son personas reales, me lo dices: hay que contárselo al cliente.
````

### Rendimiento

````markdown
El scroll a veces va lento. Antes de optimizar nada:

1. Mide con el scroll de una persona (eventos de rueda), no con saltos de scrollTo que se salten el
   smooth-scroll de la página.
2. Mide también **aparcado, sin tocar el scroll**, en varios puntos: si ahí ya hay repintados por
   frame, el problema no es el scroll, es que la página nunca se queda quieta.
3. Dime a dónde se va el tiempo por fases (script, estilo, layout, pintado, composición) y por
   sección, quién invalida qué, qué se repinta por nodo, cuántas capas hay y quién fuerza layout
   desde JS (con la pila).
4. Solo entonces arregla, y vuelve a medir **en pares intercalados** contra la versión anterior.
5. Lo que midas y no mejore, lo retiras y lo apuntas como descartado con su número.
6. Si algo caro es exactamente el efecto que aprobamos, dilo y déjalo: tocarlo es rehacerlo, no
   optimizarlo.
````

### Publicación

````markdown
Publica y verifica en la URL real, **dos veces**: la primera lectura puede devolver el despliegue
anterior porque el alias tarda unos segundos en cambiar. Comprueba que el HTML servido tiene el mismo
hash que el local, que no se sirve nada que no deba (herramientas, fuente, el registro interno, .env)
y que los assets externos responden 200. Si un archivo se sirve como inmutable y cambia de contenido,
tiene que cambiar de nombre.
````

### Al cerrar el proyecto

````markdown
Proyecto terminado. Destila lo aprendido:

1. Qué de esto es transferible a otros proyectos y qué era específico de este cliente.
2. Conviértelo en skill si hay un kit o un procedimiento reutilizable, y prueba la skill **en frío**:
   que un agente sin nuestro contexto la use para producir algo, y arregla lo que le falte.
3. Añade a las skills que ya existen los casos nuevos, con sus números.
4. Y escribe el documento de proceso: las peticiones textuales, el diagnóstico real de cada una, lo
   medido, y el prompt que habríamos tenido que dar el primer día.
````

---

## 9. Cómo dar feedback para que cueste menos rondas

Esto es para el lado humano, y se ganó a pulso:

- **Di el síntoma, no el diagnóstico.** «Parece de juguete» fue más útil que «quita el contorno»,
  porque el contorno no era el problema. Cuando el cliente propone la solución, suele apuntar al
  sitio equivocado — y quien recibe el encargo tiene que traducir, no obedecer.
- **Una referencia vale más que tres adjetivos.** La captura del retrato de Olivetti cambió el
  encargo entero: hasta entonces «ilustración a trazo» se entendía como dibujo de líneas, y era una
  pintura.
- **Si la referencia importa, pásala al principio.** Esa captura llegó una ronda tarde y costó tres
  intentos por código que acabaron en la papelera.
- **Para ajustes de grado, pide variantes.** «Más apagado» tiene infinitos valores; «enséñame tres»
  se resuelve en una ronda.
- **Distingue «no me gusta» de «está mal».** Lo primero es una decisión tuya y se acata sin discutir;
  lo segundo es un defecto y hay que medirlo.
- **Numera los puntos.** Las rondas más productivas del proyecto fueron listas numeradas de 5 a 10
  puntos. Un párrafo con tres quejas mezcladas se responde peor que diez frases sueltas.
- **Di si algo es requisito o queja.** «El footer tiene el mismo color que la web» costó dos rondas
  por esto y solo por esto.

---

## 10. Lo que la receta no puede hacer

Con el prompt maestro este proyecto no se habría hecho en una ronda. Habría hecho **unas 15** en vez
de 31: las que son decisiones de diseño y cambios de opinión siguen ahí, y deben seguir.

Lo que sí se habría ahorrado:

- las dos correcciones de lecturas invertidas (footer negro, matriz plana);
- los rebotes introducidos en la ronda 3 y retirados en la 10;
- las cuatro pasadas de tinte de los retratos, y los tres intentos por código antes;
- los dos duplicados de ilustración y los cuatro errores de perspectiva;
- la vuelta entera de las variantes a línea de la ronda 22;
- los ocho radios distintos y el CSS huérfano de la ronda 1;
- y probablemente la mitad de la ronda 23, porque los bucles fuera de pantalla no se habrían
  escrito.

Y hay una cosa que ningún prompt arregla: **el trabajo bueno apareció cuando alguien miró la página
de verdad.** La hoja de contactos, la auditoría de la ronda 14, los pins de Eric y la medición
aparcado de la ronda 23 encontraron lo que ninguna descripción habría encontrado. La receta sirve
para llegar antes al punto donde mirar es útil, no para no tener que mirar.

---

# Anexo A — Las peticiones, textuales

Lo que se pidió, con las palabras con las que se pidió. Donde el registro guardó solo la paráfrasis,
se dice. (Que cuatro rondas no tengan la cita literal es, en sí, una lección: lo que no se anota
textual no se puede auditar después.)

**Ronda 1** · «Abre Multiverse y pasale skills para mejorar/pulir el diseño».

**Ronda 2** · Diez puntos. *Registro sin cita literal*: el log guardó la interpretación punto por
punto (chip de noticias del hero, hover del menú, hover de los CTA, «Who runs compressed AI» como una
sola hoja, la banda blanca de Quasar, el residuo de la matriz en `#how`, «una sola ilustración que se
transforma» para `#deploy`, el degradado del AI Suite, Expertise, y el cambio de testimonio por
click).

**Ronda 3** · Nueve puntos. *Registro sin cita literal.* Incluía «lo mismo que la sección 2» para
Expertise — la frase ambigua que obligó a declarar la interpretación en el log.

**Ronda 4** · Cinco puntos, con una cita conservada: «fuera los cuadrados de los CTA» **«por el
momento»**.

**Ronda 5** · Tres capturas de la sección de bloques de Mistral y la petición de «una de ese estilo,
con los bloques cayendo del cielo al llegar por scroll, hover que desplaza el bloque y saca color por
detrás, y el bloque de la derecha rotando».

**Ronda 6** · Cinco puntos. *Registro sin cita literal*: fuera el modo claro, «Powerful AI on any
device» como chip, variedad de ilustraciones, el degradado del AI Suite, y una animación más
elaborada en Expertise.

**Ronda 7** · «1. Las ilustraciones me gustaría que tuviesen todas más detalle y fuesen más
variadas» · «2. Se repite mucho un cubo rojo rallado ¿Tiene algún motivo?» · «3. No sé si tenemos
muchas secciones.» · «4. The system: las cards de la izquierda al hover hacia la izquierda y las de
la derecha hacia la derecha; las siluetas del fondo de diferentes tonalidades; la que rota, que
parezca que se va a caer hacia la derecha quedándose de canto.» · «5. El hover de AI Suite sigue sin
funcionar bien. Se desborda.» · «6. Footer en negro con un cubo de Rubik que va girando y finalmente
forma el logo (en loop). Algún gradiente chulo.»

**Ronda 8** · «1. Las ilustraciones nuevas mucho mejor, pero en algunas hay fallos de perspectiva de
cómo están colocados los elementos.» · «2. En las ilustraciones ponemos 3 líneas en algunos elementos
rojos, mejor poner el logo de multiverse directamente.» · «3. How CompactifAI works: el último paso
tenemos que actualizar la ilustración al nuevo formato.» · «4. One model. Four places to run it.: las
nubes tienen un efecto raro por debajo.» · «5. The AI Suite: las letras en las ilustraciones, que no
queden muy apretadas.» · «6. The system: todos tienen el mismo icono, hacer diferentes.» · «7. El
footer tiene el mismo color que la web.» Más tres preguntas (más gradientes como el del footer; el
cubo de Rubik o una matriz que se reordena; si los CTA siguen siendo juguetones).

**Ronda 9** · «Adelante con lo que has respondido en las preguntas, dale caña Nilo».

**Ronda 10** · «1. Los CTAs siguen sin convencerme del todo. Los secundarios los dejamos sin icono
que se comprime. Les ponemos un ligero redondeo a todos.» · «2. Quitamos animaciones bouncing porque
me parece que le quitan seriedad. Esto aplica en todas las ilustraciones que lo tengan. La
sustituimos por otra cosa.» · «3. El footer tiene que tener el mismo color que el resto de la
página.» · «4. La animación del footer para el logo me refería a que saliera una matriz en 3D y los
cuadrados dentro de esa matriz se reorganizasen formando el logo.»

**Ronda 11** · «1. La animación de hover de los CTAs mantenemos la compresión pero hacemos que tengan
muchos puntitos por detrás ocultos. Puntitos como los que conforman la esfera del hero. Y cuando
haces hover se van desvelando por donde pasas el cursor. Esos puntitos tienen que ser sutiles para
que el texto del CTA siempre se lea.» · «2. No cortamos los gradientes del hero ni del footer, que se
vean enteros.» · «3. Tenemos que pulir las animaciones de las ilustraciones: se dibuja el contorno y
luego ya se colorean.» · «4. Expertise: todas las cards tienen la misma altura. Recuperamos iconos de
cada sector. Los sectores al no ser clicables no tienen hover. Y lo que es clicable salen los
cuadrados rojos en los extremos como en la segunda sección.» · «5. Detalles a lo largo de la web que
sirvan como separación entre secciones, y si son cuadrados, que al hacer hover vayas dejando una
estela de cuadrados marcados.»

**Ronda 12** · «1. Los CTAs no cambian de color. Al hover únicamente salen los puntitos. Que los que
se iluminen no sean tantos, sino los más próximos al cursor.» · «2. Me gusta mucho la animación de
que se dibujan las ilustraciones. La añadimos también en How CompactifAI works, 3er paso.» · «3.
Quitamos de las ilustraciones animadas la línea roja que sale como escaneando. Solo dejamos que se
dibujen.» · «4. Me gustan los dividers en plan detalle pero que no aparezcan tanto, y que no sean
todos iguales. La animación de hover me gusta; si los cuadrados tienen 3D al pasar por encima,
mejor.»

**Ronda 13** · «1) Los separadores déjalos como estaban, todos iguales. Y quita el que está después
del hero, justo después de las métricas. No los pongas muy seguidos. Y la animación está perfecta
pero que los cubos roten un poco.» · «2) The system: los iconos de CompactifAI y SentinelAI son
inventados, pero en una sección anterior tenemos los que usan ellos.»

**Ronda 14** · «Haz una ultima pasada para pulir cosas: Todo tiene criterio · ¿Huele a IA? · Toda la
web mantiene una consistencia ¿Hay alguna cosa fuera de lugar? Después de eso ya publicamos en
vercel».

**Ronda 15** · «1. El megamenu desplegado que no tenga la linea roja de abajo. Que sea una línea como
la de arriba. 2. En la sección de The AI Suite: Singularity se pone en rojo al hacer hover mientras
que el resto no. Dejamos en blanco singularity al hacer hover. 3. La sección final de latest News
estaría guay que se fuesen intercalando las ultimas noticias para ver que pasan cosas nuevas.»

**Ronda 16** · «1. La seccion the system: tiene que parecer que los bloques caen, como si tuviesen
fisicas. 2. En el footer la matriz que se transforma en el logo que el estado final se parezca aun
mas al logo.»

**Ronda 17** · «1. El hover del CTA además de mostrar los puntitos por donde pasas según entras al
CTA que haga un pulso que devela los puntos. Ese pulso aparece dependiendo de por donde entras con el
cursor. 2. Los CTAs de la sección Who runs compressed AI tienen que ser iguales a los de the AI
suite.»

**Ronda 18** · «el pulso que sea un pelín más lento y notable, sobre todo en rojo» · «y ya
publicamos».

**Ronda 19** · «corrige esas 3 cosas que dices. Las fechas no las tengo».

**Ronda 20** · «En la sección de Quasar no me gusta la animación de la captura que te paso. Podemos
hacerla más orgánica la animación y con más sentido?» (con captura de la tira de ranking).

**Ronda 21** · «vale para dar feedback Eric me ha dicho si podemos poner algo que se llama Agentation
que es un programa que te permite dar feedback clicando especificamente en el elemento.»

**Ronda 22** · Los cinco pins de Eric, cada uno con su selector:
1. `#hero` — «La typo de los números de la animación del hero la cambiaría».
2. `.feat > .pic > span` — «La typo de 100+ customers la cambiaría».
3. `#deploy3d > #stage3d > .isostage` — «Podemos hacer estas ilustraciones que tengan trazos menos
   definidos para que no parezcan tan 3D de dibujo? (Están de locos pero que parezcan como si fuese
   un juguete les resta credibilidad creo yo)».
4. `.team > figure > img` — «podemos hacer una ilustración a trazo de cada una de las imágenes como
   tiene Olivetti en Matteria?».
5. `#fmx` — «Idem que el anterior feedback de ilustración animada».

Y la nota general: «podríamos mantener bastante del copy original? Así es como que hacemos el lavado
de cara sobre el contenido actual, si ponemos nuevo copy estamos ya entrando en decisiones
estratégicas que sin comentar nada con ellos igual es dar palos de ciego».

Más la segunda vuelta de la misma sesión: «Retratos: nada, han quedado muy cutres, nos tenemos que
aproximar mucho más a la referencia.» · «Ilustraciones: Eric dice que se ven muy de juguete, como muy
plano. Quiero que sean más realistas los 3D eliminando esa sensación de que es un dibujo hecho en
plano. Añadirle toques realistas como reflejos, material para que sea más serias.» · «Copy: podemos
tirar con el copy nuevo más parecido al suyo actual, manteniendo el nuestro en las secciones que no
tenían.»

**Ronda 22b** · «me gusta como ha quedado pero las fotos de los del equipo tienen que mimetizarse
mejor con el fondo, ahora llaman demasiado la atención».

**Ronda 22c** · «ponles algo de opacidad para que se mimeticen mejor con el fondo, un 50% o así y
publica».

**Ronda 22d** · «les podemos volver a opacidad 100% pero poner otro tinte, un gris que contraste con
el fondo pero no demasiado».

**Ronda 23** · «1. Podemos hacer el logo del nav bar algo más grande, tanto en mobile como en
desktop. 2. Analiza el rendimiento de la web ya que el scroll a veces va lento. Optimizalo al
maximo.»

**P1** · «cuando termines subela a github» · «podemos conectarlo a nuestro url de vercel?» ·
«tienes el navegador abierto, hazlo tu todo si quieres».

**P2** · «como invito a alguien al repositorio?»

**P3–P4** · «proyecto terminado, que hemos aprendido y que podemos convertir en skill?» · «dale».

**P5** · «podrías extraerme en un MD todos y cada uno de los pasos que fui iterando con la IA para
extraer de ello la receta mágica o el prompt en detalle que se debería utilizar para sacar como
resultado de esa iteración el rediseño y desarrollo que hice» · «podemos añadir mas rondas para que
sean 31? Y hacerlo mas completo».

---

# Anexo B — Las 73 reglas de «Rechazado — NO VOLVER»

La lista íntegra vive en el [`CLAUDE.md`](../CLAUDE.md) y no se poda nunca. Aquí van agrupadas por
tema, porque así se ve qué tipo de error se repite. Las que llevan **[T]** son transferibles a
cualquier proyecto; las demás son decisiones de esta marca.

### Sistema y composición (12)

**[T]** Clases de variante en el marcado sin regla CSS detrás: o existen o se borran del HTML ·
**[T]** enlaces de texto sin estilo ni afordancia dentro de una sección de producto · **[T]**
tarjetas separadas con gap y esquinas redondeadas donde la información es una rejilla (celdas unidas,
cantos rectos, divisiones en dashed que sobresalen) · **[T]** radios de tarjeta SaaS (8–14 px) en
paneles: un solo radio para cajas y controles · **[T]** valores fijos en px para algo que sangra
fuera de un contenedor con gutter fluido · **[T]** interpolar hacia `auto` (`flex-basis`, `height`,
`width`): base fija y se anima el factor · **[T]** leer una custom property con `clamp()` mediante
`parseFloat(getComputedStyle())`: devuelve el texto, no px — se mide la caja · una regla vertical por
columna en el mega-menú · un segundo tema · numeral + hairline en cada celda de Expertise · footer de
otro color que la página (negro, dos veces) · footer rojo a sangre.

### Afordancia y hover (8)

**[T]** Hover en lo que no es clicable · **[T]** hover en el elemento que ya está activo o abierto ·
**[T]** cambiar de pestaña o testimonio por hover (elegir es una decisión: va por click) · **[T]**
degradados de hover como bandas rectangulares a altura o anchura completa: se cortan por los lados
(radiales que mueren antes del canto) · **[T]** luz de hover anclada a los cantos de una fila: se
desborda · **[T]** degradados de hover que sangran más allá de las hairlines de su propia fila ·
resaltar el borde de un CTA secundario · hovers de un bloque compuesto que se desplazan todos hacia
el mismo lado.

### Marca e iconografía (7)

**[T]** Chevrons y flechas genéricas donde la marca puede poner la suya · **[T]** glifos inventados
para un producto que ya tiene logotipo en la página · **[T]** iconos genéricos dentro de un círculo
gris como única ilustración de una sección · **[T]** barras que imitan el isotipo: donde va la marca
va la marca · **[T]** el isotipo completo a tamaño pequeño y cizallado (sus franjas bajan del píxel):
variante simplificada con la misma geometría · **[T]** el mismo icono en todas las piezas de un
bloque compuesto · franjas en los flancos del modelo en vez del isotipo en la tapa.

### Ilustración isométrica (13)

**[T]** Caras planas de un color con contorno negro de 1 px: es lo que hace «juguete» a un
isométrico · **[T]** ilustraciones isométricas como dibujo de líneas (dos variantes propuestas y
rechazadas) · **[T]** objetos cuya huella se sale del plato en el que se apoyan · **[T]** pintar un
objeto antes que otro que está detrás de él · **[T]** contornos construidos ordenando puntos por
ángulo: con formas cóncavas se cruzan (se trazan) · **[T]** extruir apilando copias del contorno:
deja escalones dentados (un sólido barrido) · **[T]** dos ilustraciones que cuentan lo mismo con el
mismo objeto: mirar la hoja de contactos antes de dar una por buena · **[T]** un único objeto
repetido como sujeto de todas las ilustraciones · **[T]** mobiliario de alambre como sujeto (y a
tamaño de card, una jaula cerrada se lee como caja reventada) · **[T]** nombres en una cara que tocan
sus cantos o tapados por la pieza de delante · **[T]** poner un logo en un muro sin renderizarlo
antes (los SVG con PNG incrustado pintan fuera de su viewBox) · **[T]** tamaño de logos por caja o
viewBox: se iguala por tinta medida · `preserve-3d` anidado en escenas CSS 3D.

### Motion (14)

**[T]** Rebotes de cualquier tipo (`elastic`, `back`, squash-and-stretch, overshoot): restan
seriedad · **[T]** caídas con `ease-out` cuando se pide peso: frenan como una pluma (gravedad es
`power2.in`, y el impacto se cuenta con lo que hay debajo cediendo) · **[T]** piezas que caen desde
un origen común: se atraviesan en el aire · **[T]** iconos animados con un bob vertical genérico ·
**[T]** entrada de ilustraciones por fundido: contorno y luego color · **[T]** cualquier bucle
después de dibujarse, incluida una línea de escaneo · **[T]** bucles decorativos en una visualización
de datos: una animación de datos escenifica lo que el dato afirma, pasa una vez y para · **[T]**
`transform:scaleX` en un pseudo que además lleva un patrón de fondo (el patrón se sale de registro):
`clip-path:inset()` · **[T]** un logo hecho de piezas como estado final: las piezas se cierran y el
final es el logo real · **[T]** gradientes cortados por el borde de su sección · **[T]** luz o halo
detrás de texto en móvil · **[T]** repetir el mismo degradado sección a sección: vale por escaso ·
cambio de color o de relleno de los CTA al hover · icono en los CTA secundarios · campo de cuadrados
en los CTA · CTAs con barrido, fundidos y desplazamientos («juguetón») · cubo de Rubik en el footer ·
matriz plana en el footer.

### Copy y contenido (4)

**[T]** Un mismo estado de producto contado de dos maneras («coming soon» frente a «early access»),
o una cifra de financiación como cerrada en un sitio y como objetivo en otro · **[T]** fotos de
prensa o de stock: placas blancas y 3D azul, fuera de paleta · **[T]** retratos «a trazo» hechos por
código cuando la referencia es una pintura · **[T]** retratos que llaman la atención sobre el fondo
oscuro (y en el color de marca: al 100 % llaman, al 50 % se apagan — van en los grises de la página).

### Rendimiento (6, todas [T])

Animaciones infinitas de CSS corriendo fuera de pantalla, y animar `box-shadow` o `left` en bucle:
repintan la capa raíz en cada frame de toda la página · dejar puesta una `mask-image` que solo servía
para revelar algo: convierte la sección en una superficie que se recompone cada frame · escribir
`innerHTML`, `textContent` o estilos en un bucle de rAF sin comprobar si el valor cambió, y leer
`offsetWidth` dentro del bucle · dejar que el motor de animación renderice antes que el
smooth-scroll: el scroll va prioritario en el ticker y todo lo que escriba DOM va detrás, en el mismo
ticker (un `requestAnimationFrame` suelto se cuela antes y fuerza layout) · un canvas decorativo con
`pointer-events:auto` encima de texto: se come la selección, el clic derecho y cualquier herramienta
que identifique elementos por `elementFromPoint` — y lo mismo vale para un contenedor con
`pointer-events:none` que solo reactiva enlaces y botones · herramienta de desarrollo cargada en
producción.

### Publicación (3, todas [T])

Cambiar el contenido de un archivo servido como `immutable` sin cambiar su nombre · dar por buena una
publicación con la primera lectura (el alias tarda segundos; segunda lectura al minuto) · servir el
repositorio entero por no fijar el directorio raíz del proyecto.

---

# Anexo C — El instrumental

83 archivos en `tools/`. No son scripts de conveniencia: son **la razón por la que «terminado»
significa algo**. Agrupados por lo que contestan.

### Generar

| Herramienta | Qué hace |
|---|---|
| `site/build.py` | el build: resuelve parciales e incrusta los SVG como data-URI |
| `tools/iso.py` | las 15 ilustraciones isométricas, en unidades de mundo |
| `tools/team_portraits.py` | los retratos → WebP con alfa, graduados a una rampa de color de la página |
| `tools/contact.py` | monta las 15 en una hoja de contactos |

### ¿Está roto?

| Herramienta | Qué contesta |
|---|---|
| `verify.mjs` | Chrome + WebKit, 1440 y 390, reduced-motion: consola, 4xx, desborde |
| `live.mjs` | lo mismo contra la URL publicada, y el hash del HTML servido |
| `review.mjs` | que el modo revisión no pide nada sin su flag, y monta con él |
| `walk.mjs` | el recorrido completo de la página en capturas (23 a 1440, 29 a 390) |

### ¿Se ve como debe?

| Herramienta | Qué contesta |
|---|---|
| `shot.mjs` / `wkshot.mjs` | capturas por selector, en Chrome y en WebKit |
| `hover.mjs` | el estado `:hover` real, ampliado — no descrito |
| `contactbig.mjs` | la hoja de contactos a 400 px: donde se ven los fallos de perspectiva |
| `rhythm.mjs` | fondos, hairlines y padding por sección: el ritmo, medido |
| `logoink.mjs` | la tinta real de cada logo (bbox y área de alfa), para igualarlos ópticamente |

### ¿La animación hace lo que digo que hace?

| Herramienta | Qué contesta |
|---|---|
| `howsteps.mjs` / `howdraw.mjs` | `#how` por **progreso real** (%), no por scroll a ojo |
| `morph.mjs` | el traspaso de la ilustración de `#deploy`, muestreado en vuelo |
| `stackphys.mjs` | la caída de los bloques, posición cada frame: aceleración, orden, cesión, estado final |
| `rankclimb.mjs` | la escalada de Quasar por frame: ordinales, posición de la marca, estado final |
| `ctapulse.mjs` | el pulso del CTA leído cada frame: origen, radio, intensidad |
| `newsrot.mjs` | la rotación de noticias antes, durante y después del cambio, y la pausa |
| `loops.mjs` | que un loop se mueve de verdad (y cuánto) |
| `drawin.mjs` | contorno y luego color, muestreado en vuelo |

### ¿Por qué va lento?

| Herramienta | Qué contesta |
|---|---|
| `scrollprof.mjs` | **el juez**: scroll real (rueda), frames por sección, LoAF, totales de traza |
| `frames.mjs` | histograma de frame times (no-regresión histórica; su scroll salta el smooth-scroll) |
| `invalid.mjs` | quién invalida estilo, layout o paint — aparcado y meneando el scroll |
| `paintmap.mjs` | qué repinta, por nodo, y cuántas capas hay a lo largo de la página |
| `layoutsrc.mjs` | los layouts forzados por JS, **con la pila que los provoca** |
| `layers.mjs` | las capas compuestas en un punto, con su razón de composición |
| `jsprof.mjs` | perfil de CPU de JS durante el scroll completo |
| `jank.mjs` | en qué `scrollY` caen los frames largos |
| `probe2.mjs` | medir cualquier expresión JS en la página |

La herramienta más valiosa del proyecto no es ninguna de las vistosas: es **`invalid.mjs` aparcado**.
Medir con la página quieta, sin tocar el scroll, es lo que destapó que había 120 repintados por
segundo en cualquier punto de la web — el diagnóstico que ninguna cantidad de optimización del scroll
habría encontrado.

---

*Registro completo, ronda a ronda, con lo medido en cada una: [`CLAUDE.md`](../CLAUDE.md).*
*Skill destilada de la parte de ilustración: `~/.claude/skills/iso-diagrams`.*
