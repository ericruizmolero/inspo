---
title: Todos los planes invitan, y el gratis es un proyecto de 12 referencias
date: 2026-10-13
status: vigente
kind: producto
supersedes: Las 200 referencias del plan gratis y que Gratis y Personal sean de una persona sin invitaciones
---
**Contexto.** En la reunión del 13-10 (Eric, Alberto y Andoni) se repasó la página de planes. El plan gratis guardaba 200 referencias y Personal no podía invitar. La diferencia de Criterio frente a Mymind es que se trabaja en equipo, y el plan gratis no lo dejaba probar. Y 200 referencias sirven para coleccionar, pero nada empuja a llegar al criterio.md.

**Decisión.**
- Todos los planes son colaborativos (`members` en `lib/plans.ts`). Gratis 2 personas, Personal 2, Studio 5 y Agency 15. En Gratis y Personal la segunda persona entra en el espacio personal: ese espacio ya no es "solo tuyo", sino "solo entra quien invites" (`settings.leads.personal`, `settings.personalSpaceHint`). Crear otro equipo sigue pidiendo un plan de pago (`newTeamRefusal`).
- El plan gratis guarda 1 proyecto y 12 referencias (`projectsMax: 1`, `itemsMax: 12`). El GB se queda. Las plantillas no cuentan como proyecto (`countProjects` deja fuera las filas con `template`). Abrir el segundo responde 402 con `t.quota.projectsFull` (`assertProjectRoom` en `lib/quota.ts`, que llaman `createProject` en `lib/projects.ts` y `useTemplate` en `lib/templates.ts`). Los de pago, sin tope (`projectsMax: null`). La página del plan enseña la cuota de proyectos.
- Los precios siguen en 15, 49 y 149 € y son provisionales. Debajo de los planes, en la app y en la web, va la línea de lanzamiento: "en la beta, el anual va a mitad de precio" (`plans.foot` y `PLAN_LINES.foot`). El descuento se aplica a mano, como el plan, mientras no haya pasarela.

**Por qué.** Eric: "hay que buscar ese wow de esa primera persona", alguien de un estudio o agencia "que lo prueba gratis y luego es el que recomienda a su jefe o a su equipo". Con "12 referencias y al menos que el MD esté enriquecido" ya se ha probado todo el modelo, y la landing de Criterio funciona entera con 12. Alberto propuso que todos los planes sean colaborativos ("el gratis personal a dos personas, estudio ya a cinco y el otro ya a 15"), y Andoni lo apoyó: en el gratis "tienes que poder enseñar ese aspecto colaborativo". Sobre el precio, los tres coinciden en que es mejor pasarse de caro y descontar a los primeros que empezar barato: "paga el anual, pero te lo dejamos a mitad de precio" (Alberto). Que la segunda persona entre en el espacio personal y no en un equipo gratis aparte lo decidió Eric después de la reunión: así no se dobla el gasto en IA del plan gratis.

**Cómo aplicarlo.** Un camino nuevo que cree proyectos pasa por `createProject` o llama antes a `assertProjectRoom`. Una cuenta que baja al plan gratis conserva todos sus proyectos y referencias: solo se le niega abrir o guardar más. Las cifras viven en `lib/plans.ts` y su copia en `marketing-site/src/plans.ts` (`tests/marketing-site-copy.test.ts`); `npm run check:usage`, `check:limits` y `check:seats` las comprueban. Queda pendiente del grupo explicar en /pricing qué es una acción de IA y si el selector Personal / Equipo que propuso Andoni entra en la web.
