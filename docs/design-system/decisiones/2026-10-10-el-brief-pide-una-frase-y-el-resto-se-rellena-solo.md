---
title: El brief pide una frase; el resto sale de la web, lo pregunta el área o se rellena en su panel
date: 2026-10-10
status: vigente
kind: producto
---
**Contexto.** `Brief` (`types/brief.ts`) tenía 8 campos, pero ninguna pantalla pedía más que `about` y, en `InspoClient`, la web del cliente (`clientItemId`). `sector`, `audience`, `audienceNote`, `tone`, `avoid` y `avoidItems` llegaban siempre vacíos a los prompts. Y faltaba lo que un diseñador pregunta en la primera reunión: qué se vende y a quién, contra quién compite, cómo habla la marca y dónde se construye. Issue #93.

**Decisión.** Una sola pregunta obligatoria. Estos son los campos del brief, qué se pregunta, de dónde sale y cuándo se pide:

| # | Pregunta en pantalla | Campo | Tipo | De dónde sale | Cuándo se pide |
|---|---|---|---|---|---|
| 1 | ¿Qué es el proyecto y para quién? | `about` (existe) | Obligatoria, una frase | El equipo | `ProjectStart` |
| 2 | ¿Ya tiene web? Pégala | `clientItemId` (existe) | Opcional | El equipo | `ProjectStart` |
| 3 | ¿Qué vende y en qué gama de precio? | `product`: `{ what, price }`, `price` es `affordable`, `mid`, `premium` o vacío | Auto | Meta y JSON-LD de la web | Borrador |
| 4 | ¿En qué idiomas y mercados? | `markets`: etiquetas BCP 47 (`es-ES`, `en-GB`) | Auto | `lang`, hreflang, moneda | Borrador |
| 5 | ¿Con quién compite? 2 o 3 webs | `competitors`: URLs sueltas, como mucho 3 | Opcional | El equipo | Panel Brief |
| 6 | ¿En qué no se tiene que parecer a ellos? | `competitorsNote` | Opcional | El equipo | Panel Brief |
| 7 | Tres palabras para la marca | `traits`: 3 palabras | Auto | Voz de la web | Borrador |
| 8 | Algo que la marca nunca diría | `neverSay` | Opcional | El equipo | Lo pregunta Voz |
| 9 | ¿Qué tiene que entender alguien en 5 segundos? | `firstSeconds` (existe) | Opcional | El equipo | Panel Brief |
| 10 | ¿Dónde vive? | `platforms`: `web`, `ios`, `android`, `print` | Chips | El equipo | Panel Brief |
| 11 | ¿Con qué se construye? | `stack`: Tailwind, Figma, SwiftUI… | Chips | El equipo | Panel Brief |
| 12 | Nivel de accesibilidad | `a11y`: `AA` por defecto, o `AAA` | Chips | Por defecto | Lo pregunta Color |
| 13 | ¿Qué de la marca actual no se toca? | `keep`: `logo`, `colors`, `type` | Chips | DESIGN.md de `clientItemId` | Borrador |
| 14 | Textos reales de la marca | `voiceSamples` | Auto | Copy de la web, texto de `import-text` | Borrador |
| | (no se pregunta) | `sector` (existe) | Auto | Etiquetas de `clientItemId` (`tags.sector`), o el borrador | Borrador |

Cómo se pide:
- **`ProjectStart`** pide solo 1 y 2. Nada más antes del tablero.
- **Borrador.** Con web o documento, una llamada de texto nueva con `SYSTEM_MODEL` lee el texto de la web (`fetchSiteText`) o el de `import-text` y escribe 3, 4, 7, 13, 14 y `sector` si las etiquetas no lo traen. Se enseña como "Esto es lo que hemos entendido", con cada campo editable. `drafted` guarda los campos que escribió el modelo y nadie ha tocado todavía. El etiquetado (`lib/tagger.ts`) no cambia: su esquema es fijo y sus etiquetas valen por URL para todos los workspaces.
- **Lo pregunta el área** cuando lo necesita, con `startAreaAsk`: Color pregunta 12 si falta, Voz pregunta 8. Una pregunta cada vez, nunca un formulario.
- **El panel Brief** del proyecto enseña todos los campos, para quien quiera rellenarlo de una vez.

Se borran `tone`, `audience`, `audienceNote`, `avoid` y `avoidItems`. Sus sitios: "para quién" está en 1; lo que se evita, en 6 y 8; el estilo visual lo dice el tablero.

Respuestas a las preguntas abiertas del issue:
1. Basta con una obligatoria (1). La web del cliente es opcional: un proyecto nuevo no tiene web.
2. `traits` sustituye a `tone`.
3. Competidores como URLs sueltas que no entran en el tablero.
4. `sector` se infiere; `audience` y `avoid` en chips se borran.
5. Una llamada nueva con `SYSTEM_MODEL`, una vez por proyecto y cada vez que cambie la web o el documento. Coste estimado, sin medir: menos de 0,001 $ por proyecto.
6. Sí se pregunta la gama de precio, solo la gama, y puede quedar vacía.
7. El brief es por proyecto. No hay entidad marca en el esquema; un brief compartido entre proyectos será otro issue.

**Por qué.** Alberto eligió las respuestas el 10/10 entre las opciones propuestas. Los motivos que siguen son interpretación de quien las propuso:
- Corregir un borrador es más rápido que escribir desde cero, y una pregunta obligatoria no frena empezar.
- Nadie escribía `tone`, y los STYLES son estilo visual, que ya está en el tablero. Tres palabras describen la marca y su voz.
- El System lee cada referencia del tablero como algo a seguir. Un competidor dentro del tablero obligaría a añadir una excepción en cada prompt.
- La gama de precio es lo que más cambia el registro visual; dejarla vacía respeta a quien no quiera decirla.
- Lo que deduce el modelo no cuenta como decidido hasta que alguien lo toca, igual que en [las áreas](2026-10-05-areas-fieles-a-lo-subido.md).

**Cómo aplicarlo.** Un campo nuevo del brief entra en esta tabla antes que en `types/brief.ts`, con su pregunta, su origen y su momento. Nunca se añade una segunda pregunta obligatoria a `ProjectStart`. Lo que rellena el modelo se enseña como borrador editable y se marca en `drafted`. Cómo llega cada campo a los prompts y a criterio.md es el issue #92.
