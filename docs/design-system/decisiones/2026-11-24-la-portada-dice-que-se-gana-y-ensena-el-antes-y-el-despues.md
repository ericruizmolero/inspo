---
title: La portada dice qué se gana al apuntarse, enseña el antes y el después y pone la oferta en cifras
date: 2026-11-24
status: vigente
kind: producto
supersedes: En la portada los precios van después de criterio.md (2026-11-23), solo en que entre el vídeo y el manifiesto hay una sección más
---
**Contexto.** Una revisión de la portada desde la psicología del marketing encontró que se pedía el correo sin decir qué se gana, que prometía "Empieza gratis" con lista de espera, que el resultado llegaba hacia el segundo 40 de la demo, que el Vault no se explicaba y que la oferta de la beta no llevaba números.

**Decisión.**
- (Retirado el mismo día, [decisión](2026-11-24-la-portada-lleva-el-menu-los-pasos-el-bento-y-las-preguntas-de-landing.md).) Bajo el correo del héroe, `.why`: "Invitamos por turnos. En la beta, los planes anuales van a mitad de precio." No va en el cierre, que en el móvil cabe en una pantalla.
- (Retirado el mismo día.) Bajo la ventana del producto, `.demo-note`: las webs del tablón son referencias, no clientes, (quién lo hace ya sale con las caras del manifiesto). Sin prueba social hasta que la haya.
- Sección nueva, entre la ventana y criterio.md: "El mismo encargo, con y sin criterio." Dos capturas (`public/assets/vault/ba/{sin,con}-{es,en}.webp`), superpuestas desde el mismo día ([decisión](2026-11-24-la-portada-lleva-el-menu-los-pasos-el-bento-y-las-preguntas-de-landing.md)). "Sin" es una respuesta real de Claude (Sonnet 5.5) al encargo a secas, una por idioma, de una pasada y sin tocar. "Con" es la web de Plomo de la demo, hecha con las cinco decisiones del tablón.
- Planes de la web: titular "Un precio por equipo, no por persona."; el anual con la cifra de la beta ("o 95 € al año en la beta, en vez de 190 €", `PlanYear.astro`, `betaYear`); Studio es el recomendado (`RECOMMENDED`), con el canto de tinta de 6 px de la ventana y la frase "El que recomendamos."; qué es el Vault (`section.vault`) y qué son una acción de IA y una revisión de landing (en las preguntas). Duo empieza por el Vault, en la web y en la app.
- Con lista de espera la entradilla de los planes dice "Empieza gratis cuando te llegue la invitación."; cuando se abra el registro, `signup-mode.ts` la cambia por `data-open-text`.
- La línea de debajo de los planes (`PLAN_LINES.foot`) es ya de la web: la de la app habla de pedir un plan, y en la web no se puede. El test solo iguala lo que dicen las dos.

**Por qué.** Alberto, 24-11, a la lista de la revisión: "do all". Studio como recomendado lo confirmó Alberto ("yes"). La mitad de precio dura lo que dure la beta, cuya fecha de fin no está definida ("during the beta, but still not defined"). Los textos son interpretación nuestra.

**Cómo aplicarlo.** Nada de cuentas atrás, plazas inventadas ni logos de webs que no son clientes. Cada cifra de la oferta sale de `betaYear`. Antes de poner las claves de Stripe, el pago anual tiene que cobrar esa cifra: hoy `lib/stripe.ts` cobra el precio entero y solo admite códigos. Si se rehacen las capturas de "sin", vuelve a ser una respuesta real sin retocar.
