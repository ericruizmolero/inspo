---
title: El estado de etiquetado no se enseña mientras se busca, y lo que flota en la esquina de la tarjeta se aparta del círculo de selección
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** Con palabras escritas en el buscador, a la derecha de la caja salían juntos "Buscando etiquetas · 7" y el botón "Pedírselo al agente", los dos con el mismo destello delante. El primero no es una opción: es el recuento de referencias del espacio que todavía están recibiendo sus etiquetas, y no tiene que ver con lo que se busca. Eric, 06-10, con la captura delante: "cuando buscas, estas opciones no entiendo su diferencia ni el diseño de los copies". El mismo día avisó de otro solape: "cuando has buscado algo en el tablero, el % de afinidad de JEV se solapa por detrás del círculo de selección"; el porcentaje (`.tile__score`) y el círculo (`.tile__select`) ocupaban la misma esquina superior izquierda de la tarjeta.

**Decisión.** En `components/SearchBar.tsx`, el estado `.sb__gathering` solo se pinta con la caja vacía (sin texto ni chips). Mientras se busca, a la derecha quedan solo acciones: el botón del agente y la equis. El texto deja de decir "Buscando" dentro de un buscador y deja el punto medio: "Etiquetando 7 referencias" y "Tagging 7 references" (`sidebar.gathering` en `lib/i18n/es/ui.ts` y `lib/i18n/en/ui.ts`). El botón del agente no cambia.

En la tarjeta (`app/globals.css`), cuando el círculo de selección está a la vista (puntero encima, foco o modo selección), el porcentaje de encaje y el chip GIF (`.tile__badge`) se desplazan 32 px a la derecha con la misma curva y duración que el círculo (180 ms, `--ease-out`), y vuelven a su sitio cuando el círculo se va.

**Por qué.** La cita de Eric. Interpretación mía: dos piezas con el mismo icono y el mismo peso, una al lado de la otra, se leen como dos opciones a elegir aunque una sea un aviso; y "Buscando etiquetas" junto a una búsqueda en curso se lee como una manera de buscar. Esta solución todavía no la ha visto Eric: si la corrige, se sustituye esta decisión.

**Cómo aplicarlo.** Un aviso de trabajo en segundo plano no se sienta junto a un botón ni lleva su mismo icono; si no cabe en otro sitio, se enseña solo cuando no hay acciones a su lado. Un texto de estado no usa el verbo de la acción que el usuario tiene entre manos. En las tarjetas, dos piezas no comparten esquina: la que informa cede el sitio a la que se pulsa.
