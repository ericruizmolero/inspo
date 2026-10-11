---
title: Un plan paga varios espacios y su IA es una sola bolsa
date: 2026-10-10
status: vigente
kind: producto
---
**Contexto.** El plan vivía en cada espacio (`organization.plan`) y cada espacio iba por su cuenta: una agencia con seis clientes tendría que pagar seis Agency. #89 decidió cumplir "varios workspaces" en Agency, y #125 lo monta antes de Stripe (#90), que cobrará una suscripción por cuenta de facturación.

**Decisión.**
- Tabla `billing_account` (migración `0040`): `plan`, `name` (el del espacio para el que se creó), `owner_user_id` (quien paga) y `stripe_customer_id` (para #90, sin uso aún). `organization.billing_account_id` es obligatoria y `organization.plan` ya no existe: el plan está solo en la cuenta. Un espacio suelto tiene su cuenta propia, así que el modelo es el mismo para todos. La migración da a cada espacio que había una cuenta con su plan y su primer dueño.
- `Plan.workspaces` en `lib/plans.ts`: Agency 10, Solo y Studio 1. Precios y el resto de cifras no cambian (eso es #89).
- Las plazas siguen siendo por espacio: cada uno admite las `members` del plan. Las personas del cliente cuentan como plaza; no hay rol de invitado.
- Acciones de IA y búsquedas: una bolsa por cuenta. `countAi` y `countAction` (`lib/quota.ts`) cuentan las filas de `ai_usage` de todos los espacios de la cuenta. `QuotaStatus` trae `workspaces`.
- `assertWorkspaceRoom(accountId, tx)` responde 402 si la cuenta ya tiene los espacios de su plan. Se llama en la transacción que añade el espacio, con la fila de la cuenta bloqueada.
- Bajar de plan con más espacios de los que caben no borra ni bloquea nada: solo se niega crear o traer uno más, como con las plazas.
- Crear: el espacio personal (`ensurePersonalWorkspace`) y el equipo del selector (`beforeCreateOrganization` en `lib/auth.ts`) nacen con cuenta propia. Dentro de una cuenta se crea desde Ajustes, Plan (`createWorkspaceInAccount`, `app/actions/billing.ts`). Traer un equipo (`moveWorkspaceToAccount`) lo pasa a la cuenta y borra la vieja si queda vacía y Stripe no la conoce. Al borrar un equipo, su cuenta se va con él si era el último.
- Ajustes, Plan: una sección "Espacios de este plan" (`PlanWorkspaces`) con cada espacio y sus personas. La ve quien paga, entera, y quien gestiona el espacio abierto, solo con los espacios en los que está. Solo quien paga tiene "Espacio nuevo" y "Traer un espacio aquí"; con un plan de un espacio, en su lugar, una línea que lo dice y nombra Agency.
- Selector de espacio (`WorkspaceMenu`): los espacios de una cuenta van juntos bajo el nombre de la cuenta (`MenuLabel`) cuando la persona ve dos o más, separados del resto por la línea grabada. Si no, la lista es la de siempre, con el personal primero.
- `npm run plan -- <slug-o-nombre> <plan>` cambia el plan de la cuenta de ese espacio y avisa a cada espacio de la cuenta que se pase de plazas.

**Por qué.** Lo que decidieron los socios al preparar #125: 10 espacios en Agency, plazas por espacio porque el precio es por espacio y no por persona (#89), una bolsa común de IA "para que el coste no crezca con los clientes" (palabras de la issue), y las personas del cliente como plaza, sin rol de invitado por ahora. Que un administrador que no paga vea solo los espacios en los que está es interpretación nuestra: en una agencia, el administrador de un cliente puede ser el propio cliente, y no debe leer los nombres de los demás.

**Cómo aplicarlo.** El plan se lee de la cuenta (`Workspace.plan` ya viene del join en `listWorkspaces`, `accountOf(organizationId)` fuera de él), nunca de `organization`. Un sitio nuevo que cuente uso de IA cuenta por `billingAccountId`; uno que cuente personas, por espacio. Un sitio nuevo que cree un espacio le da cuenta: propia (`createBillingAccount`) o una existente pasando por `assertWorkspaceRoom` en la misma transacción. Los fixtures de tests y scripts crean la cuenta antes del espacio y la borran al acabar.
