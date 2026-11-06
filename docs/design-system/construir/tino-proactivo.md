# Tino proactivo

Cómo decide Tino qué decir sin que nadie le pregunte: de dónde saca cada aviso, en qué orden los enseña, qué recuerda y cada umbral que se puede tocar para afinarlo. Lo que dice cada aviso, con su botón, está en las tablas por vista; las reglas de tono, en [Patrones](../patrones.md#tino-toma-la-iniciativa). → [proactivo con el proyecto](../decisiones/2026-11-04-tino-siempre-en-la-esquina-y-proactivo-con-el-proyecto.md), [nunca se encoge de hombros](../decisiones/2026-11-06-tino-nunca-se-encoge-de-hombros-y-en-el-inbox-empuja-a-un-proyecto.md)

## El algoritmo en seis pasos

1. **Cada vista arma su lista.** Al abrirse, la vista mira sus datos (referencias, comentarios, votos, áreas del sistema) con la hora fija de apertura (`openedAt`) y llama a su función: `nudges` en `ProjectChooser.tsx` (Inicio), `boardNudges` (tablón), `inboxNudges` (Inbox) y `systemNudges` (Sistema), las tres últimas en `components/board-nudges.ts`. Cada aviso es un `TinoNudge`: `key`, `title` (una frase o un grupo de frases), `text`, `mood` (la cara), y si lleva botón `act` y `go`.
2. **Lo urgente delante, lo demás por turnos.** La función separa lo urgente (un comentario sin contestar en tablón e Inbox; en Sistema, todo lo fijo: cómo funciona, propuestas, áreas sin decidir) del resto. El resto rota: empieza en la posición `seed % n` y sigue en orden, dando la vuelta. `seed` es un número al azar entre 0 y 999 que se saca al montar la vista (`visitSeed`), así cada visita abre con otra cosa. Dentro de un grupo que elige uno (los tipos, las áreas del Sistema), el mismo `seed` elige cuál.
3. **`HomeTino` filtra.** Quita lo pospuesto en esta visita y vista (`later`), lo de una sola vez ya dicho (`once`), y lo que pasó mientras no estabas (`happened`) si no vienes de 5 días o más fuera o si pasó antes de tu última visita. Se queda con los primeros 4 (6 en el Inbox, prop `max`).
4. **Elige qué se ve ahora**, en este orden y solo el primero que haya:
   - `speak`: la respuesta a lo que la persona hace (una búsqueda, una edición). Sale aunque Tino esté apagado, porque lo ha pedido.
   - `say`: lo que la persona ha empezado (escribir un nombre en el Inicio, algo que se está guardando en el tablón).
   - el respiro (`useTinoBreak`), si toca y la esquina no está callada.
   - el aviso de turno (`left[at]`), solo si la persona pulsó a Tino: en ninguna vista abre el globo por su cuenta ([decisión](../decisiones/2026-11-06-tino-entra-callado-y-habla-cuando-le-pulsas.md)).
   - `idle`, si la persona pulsó a Tino y no queda nada.
5. **La esquina se calla** (`quiet`) mientras la persona está a otra cosa: en el tablón, con el agente trabajando, con referencias seleccionadas, con una búsqueda escrita o su respuesta en pantalla. Callada no saca ni el respiro; pulsarla contesta igual. Con avisos pendientes pone cara de `watching`; sin nada, `asleep`.
6. **La frase.** Si `title` es un grupo, sale una al azar y nunca la misma que la última vez para ese tipo de aviso (lo que va antes del primer `:` de la `key`); se recuerda en `localStorage`. Todo entra letra a letra ([Tino escribe](../componentes.md#tino-escribe)).

## Qué hace cada gesto

| La persona | Pasa | Gesto de Tino |
| --- | --- | --- |
| Pulsa el botón del aviso | Ejecuta `go` (abre la ficha, filtra, lleva al área) | `aprueba` |
| "Luego" | Ese aviso queda pospuesto el resto de la visita en esa vista y el globo se cierra | `descarta` |
| × | Se cierra el globo; lo pendiente sigue ahí para cuando lo pulse | Ninguno |
| "2 de 4 ›" | Pasa al siguiente de la lista | Ninguno |
| Pulsa a Tino hablando | Pasa al siguiente, si hay más de uno | Salta |
| Pulsa a Tino callado | Abre con todo, también lo pospuesto; sin nada, `idle` | Salta |
| Pulsa a Tino dormido | Lo despierta (vuelve a estar encendido) | Salta |
| El interruptor de la pastilla (`TinoSwitch`) | Lo duerme o lo despierta en todas las vistas | `asleep` |

En el respiro, "Luego", la × y su botón lo dan por dicho: vuelve el contador a cero y pasa el turno.

## Qué recuerda

| Clave | Dónde | Qué guarda | Cuánto dura |
| --- | --- | --- | --- |
| `criterio:tino` | `localStorage` | `off` si está apagado | Siempre |
| `criterio:tino-later<scope>` | `sessionStorage` | Las `key` pospuestas con "Luego" en esa vista | La pestaña |
| `criterio:tino-closed<scope>` | `sessionStorage` | Si el globo de esa vista se cerró | La pestaña |
| `criterio:tino-seen` | `localStorage` | Las `key` de una sola vez ya dichas | Siempre |
| `criterio:tino-visit` | `localStorage` | La hora de la última visita, para `happened` | Siempre |
| `criterio:tino-line:<tipo>` | `localStorage` | Qué frase del grupo salió la última vez | Siempre |
| `criterio:tino-active` | `sessionStorage` | Tiempo activo desde el último respiro | La pestaña |
| `criterio:tino-break-at` · `criterio:tino-break-turn` | `localStorage` | Cuándo fue el último respiro y cuál toca | Siempre |
| `polish_vote` (servidor) | Postgres | Lo votado en Pulido, por persona | Siempre |

El `scope` separa las vistas: vacío en el Inicio, `:<proyecto>` en un tablón, `:inbox` en el Inbox, `:system` en Sistema. Por eso cerrar el globo del Inicio no calla el del tablón. Todo lo de navegador falla en silencio (modo privado): entonces vale solo para esa página.

## Los mandos

Cada número que decide cuándo habla, con su sitio. Para afinar, se cambia aquí y en el código en el mismo trabajo.

| Mando | Valor | Dónde | Qué decide |
| --- | --- | --- | --- |
| `MAX_NUDGES` | 4 (6 en el Inbox) | `HomeTino.tsx`, `max` en `InspoClient.tsx` | Cuántos avisos por visita |
| `AWAY_MS` | 5 días | `HomeTino.tsx` | Desde cuándo una vuelta cuenta como "volver tras un tiempo" |
| `seed` | 0 a 999 al azar por visita | `visitSeed` en `InspoClient.tsx` y `SystemDoc.tsx` | Con qué aviso no urgente abre |
| `FEW_REFS` | 8 | `board-nudges.ts` | Menos que esto: "añade más"; desde aquí, primera pasada (y en el Inbox, "nombra un proyecto") |
| `MANY_REFS` | 12 | `board-nudges.ts` | Desde aquí propone pulir |
| `OLD_MS` | 14 días | `board-nudges.ts` | Cuándo una referencia sin nota ni comentarios es vieja |
| `RECENT_MS` | 7 días | `board-nudges.ts` | Qué es "esta semana": comentarios sin contestar, lo de otra persona, lo callado |
| Sin nota | 3 o más tuyas | `withoutReason` | "Añadiste 5 sin decir por qué" |
| Misma web | 2 o más | `sameSite` | "Hay 3 de stripe.com" |
| Tipos | vídeo 2+, post 2+, texto 1+ | `boardNudges`, `inboxNudges` | Qué tipo merece aviso propio (uno por visita) |
| Señal fuera de lo normal | 3 o más, un tercio del tablón y el doble de lo normal | `sharedTag` | Qué gusto del tablón se dice |
| `SIGNAL_BASE` | % por señal, medido en 741 referencias el 06-11 | `board-nudges.ts` | Qué es "lo normal" en la web guardada; una señal que no está cuenta como 1 % |
| Ritmo del equipo | 5 o más y el doble de la semana anterior | `paceOf` | "El equipo ha añadido 12 esta semana" |
| Área vieja | 21 días sin tocar | `systemNudges` | "¿Sigue valiendo?" |
| Área con poco | 1 o 2 referencias | `systemNudges` | "Poca cosa para tanta decisión" |
| `INBOX_PILE` · `STALE_MS` | 15 · 7 días | `ProjectChooser.tsx` | Cuándo la bandeja "se acumula" en el Inicio |
| `MILESTONES` | 10, 25, 50 | `ProjectChooser.tsx` | Hitos de un tablón (una vez por tablón y nivel) |
| Suelta vieja | más de 3 días | `inboxNudges` | "Decidirlo" en el Inbox |
| Tuya sin tocar · de otra persona sin tocar | 14 días · 7 días | `inboxNudges` | Avisos de una referencia suelta |
| Tiene casa | 3 o más etiquetas en común con un tablón de 3 o más | `inboxNudges` | "Esta tiene casa." |
| Guardadas sin proyecto | 3 o más esta semana | `inboxNudges` | "Esta semana has guardado 3 y ninguna ha llegado a un proyecto." |
| `REACT_MS` · `SILENT_EVERY` | 1,4 s · calla 1 de cada 3 | `PolishView.tsx` | Cuánto dura su reacción en Pulido y cada cuánto calla |
| `BREAK_AFTER_MS` · `GAP_MS` | 40 min activos · 30 min de reloj | `tino-break.ts` | Cuándo propone un respiro |
| `TICK_MS` · `IDLE_MS` | 15 s · 90 s | `tino-break.ts` | Cada cuánto cuenta el tiempo y cuánto sin tocar deja de ser "activo" |
| Ancho mínimo | 801 px | `HomeTino.css` | Por debajo, la esquina no sale |

## Por vista

### Inicio

`nudges` en `ProjectChooser.tsx`. No turna: va en este orden. Mientras la persona escribe el nombre de un proyecto, eso va por encima (`say`, key `typing`).

| Key | Cuándo | Qué dice | Botón | Cara |
| --- | --- | --- | --- | --- |
| `step:<paso>` | Queda un primer paso por hacer | "Vamos a por tu primer criterio.md." con la lista y cuántos van | El del paso | accomplice |
| `inbox` | 15 o más en la bandeja y alguna de más de 7 días | "15 referencias en la bandeja…" | Ordenarlas conmigo | skeptic |
| `back:<proyecto>` (`happened`) | Vuelves tras 5 días y un tablón tuvo una pasada mientras tanto | "X ha seguido procesando mientras no estabas." | Enséñamelo | smug |
| `milestone:<proyecto>:<nivel>` (`once`) | Un tablón pasa de 10, 25 o 50 | "X ya tiene 25 referencias." | Sin botón | admirer |
| `empty:<proyecto>` | Un proyecto vacío y otro con referencias | "X está vacío. En Y tienes 12…" | Enséñamelas | suspect |

### Tablón

`boardNudges`, desde `SearchTino`. Mientras algo se guarda, eso va por encima (`say`, key `saving:upload` o `saving:save`). Lo urgente va primero; todo lo demás entra en la rueda del `seed`.

| Key | Datos | Cuándo | Botón | Cara |
| --- | --- | --- | --- | --- |
| `talk:<comentario>` **urgente** | `unansweredTalk` | El comentario más nuevo de otra persona esta semana sin nada tuyo después en esa referencia | Contestar | accomplice |
| `vote:close` | votación | Gestionas y hay votos por cerrar | Cerrarlo | judge |
| `vote` | votación | Te quedan votos (la key no lleva la cifra: "Luego" aguanta aunque entren votos) | Votar | skeptic |
| `few` | recuento | Sin primera pasada y menos de 8 | Añadir más | watching |
| `first` | recuento | Sin primera pasada y 8 o más | Hacer la primera pasada | accomplice |
| `stale` | sistema | Con pasada, referencias que el sistema no ha leído | Ponerlo al día | skeptic |
| `gaps:<áreas>` | sistema | Con pasada, áreas sin ninguna referencia (nombra 3 como mucho) | Añadir referencias | suspect |
| `others:<quién>:<n>` | `othersThisWeek` | Quien más ha añadido esta semana, sin contarte | Enséñamelas | smug |
| `quiet:<id>` | `quietReference` | Lo más nuevo de otra persona esta semana, sin nota ni comentarios | Mírala | suspect |
| `polish` | recuento | 12 o más y sin votación abierta | Pulir conmigo | judge |
| `old:<id>` | `oldReference` | La más vieja, de 14 días o más, sin nota ni comentarios | Repásala | skeptic |
| `kind:<tipo>` | `kindsOf` | Un tipo con bastantes; si hay varios, el `seed` elige uno | Verlos / Leer el copy | accomplice |
| `why` | `withoutReason` | 3 o más tuyas sin nota (los textos no cuentan) | Empieza por la última | skeptic |
| `twins:<web>` | `sameSite` | La web con más referencias, si son 2 o más | Compararlas | judge |
| `unused` | `unusedByAreas` | Con pasada, referencias leídas que ninguna área usa | Pulir | suspect |
| `shared:<señal>` | `sharedTag` | La señal más fuera de lo normal (ver mandos) | Verlas | smug |
| `missing:<nombres>` | `missingFrom` | Con equipo, quien no ha puesto nada | Sin botón | suspect |
| `pace:<semana>` (`once`) | `paceOf` | Con equipo, semana que dobla a la anterior | Sin botón | admirer |

Pulsado sin nada (`boardIdle`): cuántas hay y la última, de quién, con "Ábrela".

### Inbox

`inboxNudges`, también desde `SearchTino`, con hasta 6 por visita. Cada referencia sale en un solo aviso (`used`): la que ya nombró uno no la repite otro.

| Key | Cuándo | Botón | Cara |
| --- | --- | --- | --- |
| `talk:<comentario>` **urgente** | Como en el tablón | Contestar | accomplice |
| `loose:<id>` | La que más lleva suelta, más de 3 días | Decidirlo | skeptic |
| `project` | 8 o más sueltas | Nombrar un proyecto | accomplice |
| `shared:<señal>` | La señal fuera de lo normal ("Eso ya es medio proyecto.") | Verlas | smug |
| `kind:<tipo>` · `why` · `twins:<web>` | Como en el tablón | Como en el tablón | |
| `talked:<id>` | La suelta con más comentarios | Leerlos | suspect |
| `mine:<id>` | La tuya más vieja, 14 días o más, sin nota ni comentarios | Mírala | skeptic |
| `theirs:<id>` | La más vieja de otra persona, 7 días o más, sin comentarios | Mírala | suspect |
| `fits:<id>` | La que más etiquetas comparte con un tablón (3 o más) | Mírala | smug |
| `week:<n>` | 3 o más guardadas por ti esta semana que siguen aquí | Verlas | watching |

Pulsado sin nada (`inboxIdle`): cuántas sueltas hay y "¿a qué proyecto va?" la última.

### Pulido

Aquí no hay rueda: Tino es quien pregunta por la carta del frente (`PolishView.tsx`). Su globo lleva la pregunta, Olvidar y Quedármela, "3 / 7" y el pie.

- **Olvidar es un toque**, siempre: también con comentarios o tu idea, y Deshacer queda debajo ([decisión](../decisiones/2026-11-06-en-el-cajon-olvidar-es-un-toque-y-sin-campeon.md)).
- **Qué pregunta**, por este orden: si el equipo está dividido, `split` ("Andoni se la queda, Alberto la olvida. ¿De qué lado estás?"); la primera carta de la ronda, `start` ("A ver, a ver…"); si no, `ask`.
- **Qué cuenta debajo**: lo que votó otra persona ("Andoni ya se la queda.").
- **Tras cada respuesta** reacciona 1,4 s; una de cada tres veces calla (`SILENT_EVERY`). La reacción solo cambia la frase: el globo es el mismo toda la ronda y Olvidar y Conservar no se van, así la siguiente se decide al momento (Eric, 06-11: "tarda en salir el siguiente olvidar").
- **Al acabar**: "Ronda hecha. Te quedas 5, olvidas 2."
- Mira hacia el botón bajo el puntero (`look`).
- Olvidar y Conservar llevan dentro su tecla, ← y →, plana (`.polish-tino__key`): el teclado hace lo mismo.

### Sistema

`systemNudges`, en la esquina de la página Sistema (`SystemDoc`, `scope` `:system`). Lo fijo va delante en este orden; lo de leer y repasar entra en la rueda del `seed`, y dentro de cada tipo el `seed` elige el área.

| Key | Fijo o rueda | Cuándo | Botón | Cara |
| --- | --- | --- | --- | --- |
| `how:file` (`once`) | Fijo | Primera visita | Sin botón | watching |
| `how:take` (`once`) | Fijo | Primera visita | Conectar | smug |
| `proposals:<n>` | Fijo | Propuestas esperando | Enséñamelas | accomplice |
| `undecided:<áreas>` | Fijo | Áreas sin decidir | Sin botón | skeptic |
| `stale:<n>` | Fijo | Referencias del tablón que el fichero no ha leído | Sin botón | skeptic |
| `read:<área>` | Rueda | Un área que propuso el modelo y nadie confirmó | "Leer color" | watching |
| `thin:<área>` | Rueda | Un área decidida con 1 o 2 referencias | "Repasar" y el área | skeptic |
| `ghost:<área>:<n>` | Rueda | Un área que cita referencias que ya no están en el tablón | "Repasar" y el área | suspect |
| `old:<área>` | Rueda | El área decidida más vieja, más de 21 días sin tocar | "Repasar" y el área | skeptic |
| `kept:<n>:<sin leer>` | Rueda | Lo que se quedó del pulido | Ver las referencias | smug |

Pulsado sin nada (`systemIdle`): sin nada decidido, "Empieza por" la primera área; si no, cuántas hay decididas (y cuántas por el equipo) y la última tocada, con "Ir a".

### Respiro

`useTinoBreak` (`components/tino-break.ts`), dentro de `HomeTino`, así vale en todas las esquinas. Cuenta el tiempo activo y a los 40 minutos propone, por turnos, música (si está apagada), cambiar de tema, Recursos (salvo en Descubrir) o estirar. → [decisión](../decisiones/2026-11-06-tino-propone-un-respiro-tras-un-buen-rato-activo.md)

## Cómo probarlo

- **Que vuelva todo**: en la consola, `Object.keys(sessionStorage).filter(k => k.startsWith("criterio:tino")).forEach(k => sessionStorage.removeItem(k))` y recargar. Para lo de una sola vez, `localStorage.removeItem("criterio:tino-seen")`.
- **Otra rueda**: recargar la página saca otro `seed`.
- **Volver tras días fuera**: `localStorage.setItem("criterio:tino-visit", Date.now() - 6 * 864e5)` y recargar.
- **El respiro ya**: `sessionStorage.setItem("criterio:tino-active", 2400000); localStorage.removeItem("criterio:tino-break-at")`, y en 15 s sale.
- Las capturas de la preview van sin sesión: para ver lo que dice con datos reales, mirar el DOM (`.tino-corner__say`).

## Lo que aún no hace

Para ir mejorándolo, lo que sabemos que falta o cojea:

- **La rueda no tiene pesos.** Fuera de lo urgente, un aviso flojo ("Hay 3 de stripe.com") tiene las mismas papeletas de abrir que uno que importa (`stale`). Tampoco recuerda qué dijo en la visita anterior: dos visitas seguidas pueden abrir con lo mismo.
- **En el Inicio, pulsado sin nada, calla.** No tiene `idle`, y eso va contra "nunca se encoge de hombros".
- **"Luego" dura la pestaña**, no un tiempo: al abrir otra pestaña vuelve lo mismo.
- **`SIGNAL_BASE` es una foto** del 06-11 (741 referencias); no se recalcula sola.
- **Lo que vive en el servidor no avisa**: menciones, reacciones ("A Andoni le encantó X") y la campana necesitan datos que la vista no trae. Las propuestas del Sistema tampoco se dicen en el tablón (`SystemSummary` no las trae).
- **No mide nada.** No sabemos qué avisos se pulsan y cuáles se posponen; sin eso, los umbrales son a ojo. Un evento por gesto (botón, "Luego", ×) en PostHog lo resolvería.

## Al añadir un aviso nuevo

- Sale de datos de esa vista y se puede comprobar: si la persona lo mira, es verdad.
- Dice algo que la persona no ha visto ya: comparado con lo normal, con lo que pasó mientras no estaba, con lo que falta. Un recuento solo no basta.
- Lleva botón al sitio exacto (la ficha, el filtro, el área); sin botón solo si es un reconocimiento o algo que no se arregla con un clic.
- Su `key` dice qué es y de quién (`old:<id>`), para que "Luego" valga para ese y no para todos; no lleva cifras que cambian solas si "Luego" debe aguantar.
- Decide si es urgente (va delante siempre) o entra en la rueda. Casi nunca es urgente.
- La frase en los dos diccionarios (`t.tino` en `lib/i18n/{en,es}/ui.ts`), títulos como grupo de frases con la voz de la hoja de copy, sin rayas ni puntos medios.
- Su fila en la tabla de su vista y, si trae un umbral, en los mandos de esta página.
