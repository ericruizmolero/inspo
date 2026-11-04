---
title: Tino lee el tablón, los comentarios y lo que te toca hacer
date: 2026-11-04
status: vigente
kind: diseño
---
**Contexto.** Con el Tino de la esquina ya proactivo ([decisión](2026-11-04-tino-siempre-en-la-esquina-y-proactivo-con-el-proyecto.md)), en un tablón con conversación y sin nada de lo que miraba (pocas referencias, lo nuevo sin leer, áreas vacías), pulsado decía "Nada que objetar. Pídeme abajo lo que busques…". Eric, con la captura: "tino tiene que ser más proactivo. leer lo que está pasando en el tablón, ver referencias, comentarios y cosas a hacer".

**Decisión.** En `boardNudges` (`components/board-nudges.ts`), por este orden:
- **Te están hablando** (`unansweredTalk`): el comentario más nuevo de los últimos 7 días, de otra persona, en una referencia del tablón, si quien mira no ha escrito en esa referencia después. Dice quién, en cuál y sus primeras palabras entre comillas; "Contestar" abre la ficha. La clave es el id del comentario: uno nuevo vuelve a salir aunque el anterior se dejara para luego.
- **El pulido en equipo**: si otra persona tiene votos abiertos y a ti te quedan referencias, "Te quedan N por votar" (lleva a Pulido); si gestionas, ya votaste todo y hay votos abiertos, "Hay votos esperando a que los cierres". Con eso en pantalla, el aviso de pulir a partir de 24 no sale.
- Luego lo que ya decía (primera pasada, sin leer, áreas vacías, lo que añadió otra persona).
- **Nadie ha dicho ni mu** (`quietReference`): la referencia más nueva de la semana que añadió otra persona y no tiene nota ni comentarios; "Mírala" la abre.
- Pulsado sin nada pendiente (`boardIdle`), cuenta el tablón: cuántas referencias y cuál es la última, de quién, con "Ábrela". Solo sin referencias vuelve a "Pídeme abajo lo que busques".

**Segunda vuelta (el mismo día).** Eric, con el globo del voto en pantalla otra vez: "apela el voto todo el rato. bien pero tiene que hacer más cosas. que te incite a pulir y repasar. o que te diga cosas interesantes como hay X vídeos, o X tuit o mirar X copy". Cambia:
- Solo el comentario sin contestar va siempre primero. Lo demás se turna: cada visita empieza por uno distinto (`seed`). El aviso del voto tiene clave fija ("vote"), así "Luego" lo calla la visita entera aunque lleguen votos.
- Pulir se propone a partir de 12 referencias (antes 24).
- **Repasar** (`oldReference`): la referencia más antigua del tablón, de hace dos semanas o más, sin nota ni comentarios. "¿Te acuerdas de esta?", "Repásala" la abre.
- **Lo que hay que mirar aparte** (`kindsOf`): 2 o más vídeos, 2 o más posts de X o algún texto de copy. Uno por visita; su botón filtra el tablón por ese tipo.

**Aprobado.** Eric, tras probarlo: "perfecto lo que has hecho de recordar cosas pasadas como lo de Andoni. Está perfecto eso y lo demás."

**Tercera vuelta.** Eric eligió de una lista de propuestas: "dale, con lo que tenemos ya, añade esas" y "5 y 7 también, para cuando hay más de 1 persona". Se suman, turnándose con lo demás:
- **¿Y esta por qué?** (`withoutReason`): 3 o más referencias que añadió quien mira sin nota (los textos no cuentan); abre la más nueva.
- **Veo doble** (`sameSite`): la web con más de una referencia en el tablón (solo webs); "Compararlas" la busca.
- **Lo que el sistema no usa** (`unusedByAreas`): referencias que la última pasada leyó y ninguna área tiene como evidencia; lleva a Pulido.
- **Aquí hay un patrón** (`sharedTag`): la etiqueta (rasgo, color, tipo, layout o palabra) que comparten 4 o más y al menos un tercio del tablón; "Verlas" filtra por ella.
- Solo con más de una persona en el espacio: **quién falta** (`missingFrom`), los miembros sin nada en el proyecto, dicho sin botón; y **el ritmo** (`paceOf`), una semana con 5 o más que dobla a la anterior, una vez por semana.

**El tiempo, dicho como se dice.** Eric, ante "está aquí desde el 05/10/2026": "mejor decir que lleva mes y medio y esas cosas". Tino no da fechas: dice cuánto lleva ("lleva aquí mes y medio", "dos semanas", "tres meses", "más de un año"; `t.tino.board.howLong`).

**En la página Sistema.** Eric, con "Nada que objetar" en pantalla sobre el criterio.md: "necesito proactividad. Que incite a leer las diferentes categorías o que se repasen, que ver las referencias que vienen del pulido". `systemNudges` suma, tras las propuestas abiertas y lo que ya decía, turnándose por visita (`seed`):
- **Leer** un área con decisión del modelo (`source: "model"`) que nadie del equipo ha confirmado.
- **Repasar** un área con una o dos referencias detrás, una que cita referencias que ya no están en el tablón, o la que lleva más de tres semanas sin tocarse (con `howLong`).
- **Lo que salvó el pulido**: las referencias del tablón con voto "keep" cerrado (`polishKept` en `components/InspoClient.tsx`, prop `kept` de `SystemView` y `SystemDoc`), cuántas son y cuántas no ha leído aún el sistema; lleva a Referencias (`sdoc-refs`).
- Pulsado sin nada pendiente, `systemIdle`: "6 de 8 áreas decididas, 4 confirmadas por el equipo. La última que se tocó es Color, hace tres días", con "Ir a color".

**Por qué.** Eric: "leer lo que está pasando en el tablón, ver referencias, comentarios y cosas a hacer". Interpretación nuestra del orden: primero lo que otra persona espera de ti (una respuesta, un voto), después lo que el proyecto necesita, y al final lo que invita a conversar.

**Cómo aplicarlo.** Un aviso que depende de otra persona (un comentario, un voto, una mención) va antes que los del estado del proyecto. Con lo que ya está en el cliente (`commentMap`, `polishVotes`); si un aviso necesita datos del servidor (la campana, `teamActivity`), se decide aparte.
