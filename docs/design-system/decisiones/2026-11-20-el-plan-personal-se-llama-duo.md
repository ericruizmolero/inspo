---
title: El plan Personal se llama Duo y sigue siendo para dos personas
date: 2026-11-20
status: vigente
kind: producto
---
**Contexto.** El plan de pago más pequeño se llamaba Personal ("Para quien diseña por su cuenta") pero admite dos personas por espacio, porque todo plan invita. El nombre decía una persona y el plan daba dos.

**Decisión.** El plan se llama Duo, igual en inglés y en castellano, y sigue siendo para dos personas. Su línea: "For two people designing together" / "Para dos personas que diseñan juntas". Cambia el nombre en `lib/i18n/{en,es}/plans.ts` y `marketing-site/src/plans.ts` (`PLAN_TEXT`). Propuesta para cuando se construya: la clave del plan pasa de `personal` a `duo` en `PlanKey` (`lib/plans.ts`, `marketing-site/src/plans.ts`) con una migración de `billing_account.plan`, ahora que nadie paga, para que el código y lo que se ve no se llamen distinto. Aún no está construido.

**Por qué.** Alberto, 20-11: "personal to 2 people, we can find another name, but the tool is collaborative by default", y sobre Duo: "Duo i like it".

**Cómo aplicarlo.** El nombre de un plan dice para quién es; si las cifras del plan cambian lo que dice el nombre, se cambia el nombre.
