---
title: Descubrir sale de la Isla y aparece donde aún no hay referencias
date: 2026-10-13
status: vigente
kind: producto
---

**Contexto.** Descubrir era la segunda pestaña fija de la Isla, justo después de Inicio, y también estaba en el menú de móvil. En la reunión del 13-10 (Alberto, Andoni, Eric) se vio que ocupaba demasiado sitio: era lo primero que se encontraba en la barra y parecía un proyecto más, cuando es algo que se ofrece aparte.

**Decisión.** La pestaña Descubrir sale de la Isla (`components/Island.tsx`) y del menú de móvil (`components/Sidebar.tsx`). Sus tres secciones siguen en la app tal cual, y se abren desde el menú del espacio: Ejemplos (nuevo, `t.ws.examples`), Recursos y Skills. Los ejemplos aparecen además donde un espacio todavía está vacío, como parte de empezar: en `EmptyStart` (la pantalla sin ninguna referencia), "Empieza desde un ejemplo" (`t.start.examples`) junto a "Mira dónde buscamos referencias ↗", en una fila (`.links`); y en `ProjectStart`, en el paso de añadir, un "Ejemplos" quiet s mientras el espacio no tiene ninguna referencia. Las rutas (`?in=templates`, `?in=discover`, `?in=skills`) no cambian.

**Por qué.** Alberto: "está el primero de los proyectos, o sea, tú estás en proyectos y lo primero que encuentras es descubrir, que no tiene que ver con el producto", "debería estar accesible, pero sin que esté en medio", y "tiene que estar referenciado en todas las partes donde no tiene ninguna referencia [...] pero no tiene que estar visible cuando ya estás trabajando". Andoni: "igual el descubrir tiene que aparecer cuando tú tienes el moodboard vacío". Eric: "tienes recursos y tienes skills y vas directamente", y para los ejemplos: "como un onboarding, pues que ya puedas escoger un ejemplo y te lo clonas". Alberto propuso además sacar los recursos a la landing; no se cierra aquí. El 12-10 Eric pidió que Recursos y Skills volvieran dentro de Descubrir ([decisión](2026-10-12-descubrir-vuelve-a-tener-recursos-y-skills-con-la-lista-de-la-web-de-marketing.md)), y esa decisión sigue en pie. Interpretación mía: lo que se acordó es quitarlo de en medio, no quitarlo de la app.

**Cómo aplicarlo.** La Isla lleva solo lo que es trabajo del equipo: Inicio, Inbox y los proyectos. Lo que se ofrece aparte (ejemplos, recursos, skills) va al menú del espacio y a las pantallas vacías, donde ayuda a empezar. Si los recursos acaban saliendo a la landing, será una decisión nueva que sustituya a la del 12-10.
