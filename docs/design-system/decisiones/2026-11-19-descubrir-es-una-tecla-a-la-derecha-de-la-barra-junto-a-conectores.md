---
title: Descubrir es una tecla a la derecha de la barra, junto a Conectores, y sale del menú del espacio
date: 2026-11-19
status: vigente
kind: producto
supersedes: la parte de "se abren desde el menú del espacio" de 2026-10-13-descubrir-sale-de-la-isla-y-aparece-donde-no-hay-referencias.md
---
**Contexto.** Desde el 13-10 Descubrir no era pestaña de la Isla y sus secciones se abrían desde el menú del espacio, que con el Vault ya llevaba cuatro entradas (Vault, Ejemplos, Recursos, Skills) y once opciones en total. Con el Vault en producción, Descubrir pasa a importar y ahí queda escondido.

**Decisión.** Una sola tecla "Descubrir" (icono `compass`, el que ya tuvo) en la pastilla de la derecha de la barra superior, antes de Conectores (`.topbar__discover` en `components/InspoClient.tsx`, un `cr-seg-item` que queda marcado mientras se está en cualquiera de sus secciones). Abre el Vault si tiene algo, y si no los Ejemplos; dentro, las secciones siguen siendo las pestañas de la propia página. Las cuatro entradas salen del menú del espacio (`components/Island.tsx`). En teléfono la tecla no cabe en la barra y es una fila del menú, encima de Conectores (`components/Sidebar.tsx`). "Conectores" se queda en el menú del espacio: el botón de la barra desaparece cuando todo está conectado y esa es entonces la única forma de volver a ello.

**Por qué.** Eric, 19-11: "el descubrir no sé si ponerlo en alguna parte más visible de la app", "hubo un momento que lo teníamos al lado de cajón pero eso a mis socios no les molaba pero ahora es importante", "así podemos hacer más pequeño esto o menos opciones ahí", y a la propuesta: "vale dale". Lo de la derecha es interpretación nuestra de la objeción del 13-10 (Alberto: "lo primero que encuentras es descubrir, que no tiene que ver con el producto"): la izquierda de la barra es lo del equipo (Inicio, Cajón, proyectos) y la derecha lo que Criterio le da (Conectores), así que ahí no se lee como un proyecto más. Alberto y Andoni aún no lo han visto.

**Cómo aplicarlo.** Lo que Criterio ofrece aparte del trabajo del equipo va a la derecha de la barra, nunca entre las pestañas de la Isla. El menú del espacio es para el espacio (equipo, plan, ajustes), no un índice de la app. Lo del 13-10 de ofrecer los ejemplos donde un espacio está vacío sigue igual.
