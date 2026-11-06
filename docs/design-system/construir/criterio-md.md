# El criterio.md

El fichero que entregamos: lo que lee la IA para diseñar con el criterio de un proyecto. Lo escribe `lib/criterio-md.ts` con los textos de `lib/i18n/{en,es}/ui.ts` (`system.md`), y cada cambio aquí se mide con el ejemplo (`exampleCriterioMd`).

## Qué es, en una frase

Cómo se ve y cómo habla un proyecto, decidido por el equipo en ocho áreas, escrito para que una IA lo lea y diseñe con la persona paso a paso: primero pregunta, luego propone un plan y después construye por partes. La cabecera del fichero lo dice así, en llano, para quien lo abre sin conocer Criterio. → [decisión](../decisiones/2026-11-06-el-criterio-md-fija-la-primera-respuesta-ordena-las-preguntas-por-quien-las-responde-y-cierra-con-una-lista.md)

## Las partes, en orden

| Parte | Bloques (`id`) | Quién la escribe | Cuándo la lee la IA |
| --- | --- | --- | --- |
| Núcleo | cabecera, `guide` (Empieza aquí), `questions`, `learned`, `landing`, `use`, `rejects` | La app; solo `use` se edita a mano | Siempre: es la sección `"guide"` de `read_criterio` |
| El proyecto | `project`, `brief`, `content`, `summary`, `brand-intro` | La app desde el brief y los textos | Cuando la tarea usa sus textos o su marca |
| Las 8 áreas | una por área, con decisión, por qué, Nunca, referencias y skills | La pasada y el equipo | Solo las que toca la tarea |
| Construir | `pages`, `skills-all`, las skills activadas, Tokens | La app | Al construir |
| Apéndice | `refs` | La app | Con el conector, una a una (`read_reference`) |
| Cierre | `before` (Antes de entregar nada) | La app | Siempre: va con `"guide"` y con cada área |

El núcleo abre y el cierre repite lo esencial al final, porque un modelo lee peor el medio de un texto largo.

## Empieza aquí: las fases

| Fase | Qué hace | Punto de control |
| --- | --- | --- |
| 0. Conectar | Con el conector, lee solo la parte que necesita | |
| 1. Entender | Lee la web del cliente y lo aprendido, hace las preguntas que bloquean y confirma el resto en bloque | Un sí a lo entendido |
| 2. Plan | Lee las áreas que toca, cierra las abiertas, reúne material, lista secciones con su trabajo y, si no hay dirección elegida, propone dos o tres para el hero | Un sí al plan |
| 3. Construir por partes | Primero el primer pantallazo (marca, titular, frase de apoyo, acción, imagen dominante), evitando lo genérico | Cada parte aceptada |
| 4. Revisar con evidencia | Mira la página a 390 y 1440 px, test de marca y la lista con la prueba de cada punto | Con pruebas |
| 5. Aprender | Guarda lo corregido, lo elegido y lo rechazado | La persona ve qué queda apuntado |

**Reglas de la sesión**, encima de las fases: buscar antes de preguntar, una pregunta cada vez con la opción recomendada marcada, `[FALTA: …]` para un dato que falta (nunca inventarlo), `[BORRADOR]` para el copy que escribe la IA (nunca lorem ipsum), ningún valor decidido cambiado por uno por defecto, resumir cada pocas vueltas. → [copy de borrador](../decisiones/2026-11-04-si-falta-copy-el-agente-escribe-un-borrador-y-marca-solo-los-datos.md)

**La primera respuesta** tiene forma fija: qué es Criterio en una frase si la persona no lo conoce, lo entendido en tres líneas, lo deducido para confirmar, cuántas preguntas bloquean y la primera con sus opciones.

## Las preguntas de arranque, por quién puede responderlas

Las 23 de `PLAYBOOK_QUESTIONS` salen por nivel, no por tema. El nivel es `questionTier`, sacado de `SETUP_ROLES`, para que la puesta en marcha y el fichero ordenen igual.

| Nivel | Rol en `SETUP_ROLES` | Preguntas | Cómo se hacen |
| --- | --- | --- | --- |
| Preguntar | `stops`, `core` | `goal`, `audience`, `why-us`, `proof` | Una a una, con el texto entero |
| Confirmar | `read` | `offer`, `current-site`, `product`, `markets`, `brand-material`, `competitors`, `platforms-stack` | Se buscan en la web, las referencias o el repo y se confirman en un solo mensaje |
| Proponer | sin rol | el resto | La IA propone y la persona confirma; solo su primera frase |

Una pregunta nueva toma su nivel de `SETUP_ROLES`; sin rol, la propone la IA.

## Por defecto, evita

La lista de la fase 3, salvo que la marca o una decisión lo pidan: tipografías por defecto (Inter, Roboto, Arial, system-ui), degradados morados o azules sobre blanco, modo oscuro sin motivo, tarjetas en el hero, tres columnas iguales, grupos de pastillas, tiras de cifras, filas de iconos y badges sobre la imagen del hero. Es a lo que converge todo lo generado y borra la marca. Va por debajo de los tokens y del Nunca de cada proyecto.

## Lo aprendido

Lo escribe el conector con `record_learning`, directo y sin aprobación (`SystemLearning` en `types/system.ts`). Lo último primero; nunca en el fichero limpio de un enlace.

| Marca | Cómo sale | Para qué |
| --- | --- | --- |
| sin marca | `- **Área:** nota _(quién con qué cliente, día)_` | Una corrección o una elección |
| `pick: true` | igual | Eligió entre versiones: cierra la dirección y la fase 2 deja de proponer direcciones |
| `rejected: true` | `- **Rechazado · Área:** nota` | Lo que descartó, con su porqué: no se vuelve a proponer |

## Las skills

Cada área termina con sus skills recomendadas (`lib/area-skills.ts`). En "Cómo usar este archivo" apoyan el fichero y no lo sustituyen: si una contradice una decisión, gana el fichero; la IA propone instalarla y espera un sí; como mucho una externa por área.

## Lo que no lleva, a propósito

- Una estructura fija de secciones de landing: empuja a que todas salgan iguales. El plan pide un trabajo por sección y lo guarda con `set_outline`.
- Ejes de carácter en lugar de las tres palabras: pendiente, toca la pregunta `traits`, el brief y el conector.
- Mayúsculas o "DEBES": las reglas van en tono normal y con su porqué al lado.

## Al cambiarlo

- Mide el núcleo con el ejemplo antes y después; si crece, recorta en el mismo cambio. A 06-11: 167 líneas y unos 13.400 caracteres en castellano.
- Lo que el conector o un check ya garantizan no se repite en prosa.
- Los tests están en `tests/criterio-md-rules.test.ts`.
