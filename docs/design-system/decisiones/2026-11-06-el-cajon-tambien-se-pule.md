---
title: El Cajón también se pule, con Tablón y Pulido pero sin MD
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** El selector Tablón / Pulido / Sistema solo salía dentro de un proyecto; en el Cajón no había forma de repasar lo guardado tarjeta a tarjeta. Eric: "no se si en el cajon también pondría el pulido... para ir limpiado cosas sabes... tablon y pulido. el MD no tiene sentido porque no es un proyecto".

**Decisión.**
- En el Cajón (`?in=inbox`) la barra lleva Tablón y Pulido (`ProjectModes` con `noSystem`); `?in=inbox&view=polish` abre el tornado de `PolishView` con `project={null}`. La pestaña Pulido cuenta las que quedan por decidir.
- **Conservar** ("Se queda en el Cajón") la deja en el Cajón y se recuerda en el navegador, por espacio (`criterio:inbox-kept:<workspace>`); **Olvidar** ("Se borra") la borra de la librería. La tarjeta olvidada no vuela a una pestaña: cae fuera de la vista (`Flight.to = "away"` en `PolishFlyer.tsx`).
- Sin votación: cada persona decide al momento, como en un proyecto en solitario. El borrado de verdad (`removeInspos`) se hace al salir de Pulido o al cerrar la página, así que Deshacer la devuelve mientras se sigue dentro (`hooks/use-inbox-polish.ts`). Solo se borra lo que la persona puede borrar (lo suyo, o todo si gestiona el espacio); lo demás vuelve al tornado con un aviso.
- Al terminar, el botón principal es "Ir al tablón", no "Ir al sistema".

**Por qué.** Para "ir limpiando cosas" en el Cajón, donde se acumula todo lo que llega de la extensión y las importaciones. El MD no tiene sentido fuera de un proyecto (Eric). Entre las opciones, Eric eligió "se queda / se borra" sin votos frente a mandar a un proyecto o votar en equipo; votar en equipo pedía cambiar la tabla `polish_vote`, que cuelga de un proyecto.

**Cómo aplicarlo.** El Cajón es un espacio con tablero pero sin sistema: lo que valga para el tablón de un proyecto y no dependa del sistema puede valer también en el Cajón. En el Cajón "olvidar" significa borrar, porque no hay ningún sitio más atrás.
