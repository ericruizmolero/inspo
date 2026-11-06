---
title: Tino nunca se encoge de hombros, y en el Inbox empuja hacia un proyecto
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** En el Inbox, con 25 referencias, Tino pulsado decía "Nada que objetar. Pídeme abajo lo que busques: una persona, una fecha, un color o de qué va." con solo "Luego". Los avisos proactivos (`boardNudges`) solo existían dentro de un proyecto; el Inbox caía siempre en el globo de reposo. Eric, con la captura: "tino es vago y pone nada de objetar, tiene que ser proactivo y decirte cosas que te inciten a hacer otras siempre".

**Decisión.**
- Fuera "Todo en orden. Por ahora." y "Nada que objetar." como títulos de reposo, en el tablón y en el Sistema. Ahora: "Ya que preguntas." / "Te propongo algo." (`t.tino.board.idleTitle`, `t.tino.system.idleTitle`).
- **El Inbox tiene avisos propios** (`inboxNudges` en `components/board-nudges.ts`, textos en `t.tino.inbox`). El comentario sin contestar va siempre primero; lo demás se turna por visita (`seed`):
  - **¿Y esta dónde va?**: la referencia que más lleva sin proyecto (más de tres días), diciendo cuánto ("lleva mes y medio sin proyecto. O va a uno o sobra."), "Decidirlo" abre su ficha.
  - **Aquí hay un proyecto**: con 8 o más sueltas, "Nombrar un proyecto" lleva al Inicio, donde se nombra.
  - **Aquí hay un patrón**: la etiqueta que comparten 4 o más y un tercio del Inbox ("Eso ya es medio proyecto."), "Verlas" filtra.
  - Y los del tablón que valen aquí: vídeos, posts o textos (uno por visita), las que añadiste sin nota, varias de la misma web.
- **Pulsado sin nada pendiente, siempre con botón.** En el Inbox (`inboxIdle`): cuántas sueltas y la última, "¿a qué proyecto va?", con "Decidirlo". En el Sistema sin ninguna área decidida (`systemIdle`): "Ninguna área está decidida todavía. Empieza por estrategia…" con "Ir a …". Solo sin referencias queda la línea de pedir algo abajo.

**Por qué.** Eric: "tiene que ser proactivo y decirte cosas que te inciten a hacer otras siempre". Que el trabajo del Inbox sea vaciarse hacia proyectos (o a la papelera) es interpretación nuestra a partir de su entradilla ("Lo que aún no tiene proyecto").

**Cómo aplicarlo.** Ningún globo de Tino sin una acción que proponer mientras haya algo en pantalla de lo que hablar. Una vista nueva donde salga Tino trae sus avisos propios en `board-nudges.ts`, no hereda el reposo genérico.

**Corrección, 06-11.** Los nombres de referencia que llevan un punto medio (los posts de X se guardan como "Autor · texto") salían tal cual en la frase de Tino. Eric: "ese puntito que separa el texto cambiar que es ai slop". Se probó "Autor: texto" y tampoco ("es un poco ai slop también"). Tino lo dice como una persona: "El post de Zafar Ismatullaev lleva mes y medio sin proyecto." (`refName` en `components/board-nudges.ts`, `t.tino.postOf`). Ni "·" ni dos puntos para unir nombre y texto en sus frases.

**Más avisos en el Inbox, 06-11.** Eric, con "¿Y esta dónde va?" en "3 / 3": "en el inbox tiene que haber más, más ejemplos de cosas que guardaste hace tiempo, que no se comentan, que no se ponen en proyectos". `inboxNudges` suma, cada uno con una referencia concreta y nunca la misma dos veces:
- **Aquí se habló y nada**: la suelta con más comentarios ("tiene 3 comentarios y sigue sin proyecto"), "Leerlos".
- **¿Te acuerdas de esta?**: la más vieja que guardaste tú, de hace dos semanas o más, sin nota ni comentarios, "Mírala".
- **Nadie la ha tocado**: la más vieja que guardó otra persona, de hace una semana o más, sin comentarios.
- **Esta tiene casa**: la suelta que comparte tres etiquetas o más con el tablón de un proyecto ("se parece mucho a lo que hay en Landing Criterio. ¿La llevas?").
- **Mucho guardar, poco ordenar**: tres o más guardadas por ti esta semana que siguen sueltas; "Verlas" filtra por ti.
En el Inbox Tino recorre hasta 6 por visita (`max` de `HomeTino`, por `SearchTino`); en el resto, 4. Votar no aplica: en el Inbox no hay pulido.

