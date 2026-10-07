---
title: El menú de espacio no lista proyectos, el equipo es una fila de caras y nunca mide más que la ventana
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** El menú que abre el avatar de la Isla había ido sumando filas: espacios, todos los proyectos como carpetas, una fila por persona del equipo, directorio, feedback, el plan en tres líneas y los ajustes. Con cinco proyectos y cuatro personas medía unos 935 px. Al no caber debajo del avatar, Base UI lo pasaba al lado derecho y lo pegaba arriba: tapaba la Isla y llegaba hasta el zoom del tablón.

**Decisión.**
- El menú ya no lista los proyectos ni lleva "Nuevo proyecto": las pestañas de la Isla, "N más", el "+" e Inicio son la navegación de proyectos (`extras` en `components/Island.tsx`).
- El equipo es una sola fila de caras solapadas (`.island__team`): cada cara (`.island__face`, `UserAvatar` de 24 px, 6 px montada sobre la anterior y con un anillo del color del menú) es un botón que filtra por quién guardó, y la fila acaba en "Gestionar" (`.island__team-manage`), que lleva a Ajustes › Miembros. Caben siete huecos (`MAX_FACES`); si hay más personas, se pintan seis caras y el último hueco cuenta el resto ("+44", `.island__face--more`) y lleva a Miembros.
- El plan va en una línea con su barra: `PlanMeter` con `compact` quita la nota de debajo ("este mes"). La barra lateral del móvil sigue con el medidor completo.
- El menú cuelga siempre debajo de lo que lo abre (`collisionAvoidance` con `side: "none"` en `WorkspaceMenu`, que `PopoverContent` ya deja pasar) y `.ws__menu` tiene de tope `--available-height`: si no cabe, hace scroll por dentro.

**Por qué.** Eric, 06-10, con la captura del menú desbordado: "cuando hay mucha información del sidebar me sale así". Sobre las tres propuestas: "quitamos proyectos", "equipo 1 sola fila igual, pero quiero que se vean caras", "plan en una línea okay". Al verlo: "haz que las fotitos se solapen" y "si hubiesen 50 personas habrá que poner las que entren y luego +50 o lo que sea". Interpretación nuestra: el menú es del espacio (cambiar de espacio, equipo, plan, ajustes) y lo que ya está a la vista en la Isla no se repite dentro.

**Cómo aplicarlo.** Antes de añadir una fila al menú de espacio, mirar si eso ya está a un clic en la Isla; si lo está, no entra. Las listas que crecen con los datos (proyectos, personas) no van como una fila por elemento en un menú: van resumidas en una fila o en su propia página. Un popover alto lleva de tope `--available-height` y no cambia de lado para caber.
