---
title: El Brief y la Presentación salen de la página del proyecto; sus preguntas son pasos del MD
date: 2026-11-04
status: vigente
kind: producto
supersedes: Vuelve la pestaña Presentación de Alberto y Resultados sale de la interfaz (2026-10-06)
---
**Contexto.** El 03-11 el criterio.md pasó a ser un playbook por fases ([decisión](2026-11-03-el-criterio-md-guia-por-fases-con-las-preguntas-a-clientes-y-las-skills-de-cada-area.md)), con las preguntas que el equipo hace a los clientes de web. El panel Brief (`BriefPanel`) seguía pidiendo lo mismo dentro de la app, campo a campo, y la Presentación (`BrandPresentation`) pintaba la marca en una pestaña aparte.

**Decisión.**
- Todo lo que preguntaba el Brief es ahora una pregunta del playbook, en `PLAYBOOK_QUESTIONS` (`lib/playbook-questions.ts`), junto a las de los clientes: 23 en total.
  - Se añaden ¿ya tenéis web?, qué vendéis y gama de precio, idiomas y mercados, tres palabras, algo que la marca nunca diría, dónde vive y con qué se construye, y nivel de accesibilidad.
  - Los textos reales de la marca entran en la pregunta de textos.
  - Lo que un proyecto ya tenga en su brief cuenta como respondido (`fromBrief`).
- **Brief** sale de la fila de `SystemView` y de ⌘K ("Abrir el brief"; `onBrief` ya no se pasa desde `InspoClient`). El paso "brief" de los primeros pasos (`lib/first-steps-core.ts`) lleva a la vista Sistema sin `brief=1`. Qué es el proyecto se sigue escribiendo en el arranque del proyecto vacío y en su sitio del criterio.md (`onAbout`).
- **Presentación** sale de las pestañas (`VIEWS` = Agente y Persona), y con ella el botón "Rellenar la presentación".
- `BriefPanel`, `BrandPresentation`, el brief guardado y la marca (`bring_brand`, "Traer una marca" en el "…", los tokens del MD) siguen en el código y en los datos.

**Por qué.** Eric: "todo lo que está en el brief junto con las preguntas que te envié ayer tiene que estar recogido en los pasos dentro del MD. Entonces brief va fuera. Presentación va fuera." Interpretación mía: si el agente de la persona pregunta lo que falta, un formulario en la app pregunta lo mismo dos veces.

**Cómo aplicarlo.** Una pregunta nueva va en `PLAYBOOK_QUESTIONS`, no en un formulario de la app. No se enlaza el Brief ni la Presentación desde ninguna parte de la interfaz. Si vuelven, se escribe una decisión nueva.
