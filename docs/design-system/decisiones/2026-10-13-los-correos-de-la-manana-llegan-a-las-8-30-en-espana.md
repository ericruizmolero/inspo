---
title: Los correos de la mañana llegan a las 8:30 hora de España
date: 2026-10-13
status: vigente
kind: producto
---
**Contexto.** El resumen diario del equipo y el aviso del día 3 salían con el cron `morning` a las 04:00 UTC, que son las 6:00 en Madrid en verano. El primer resumen salió el 13-10 a las 04:08 UTC.

**Decisión.** Los dos correos llegan a las 8:30 en `Europe/Madrid`, en horario de verano y de invierno. El cron `morning` sigue a las 04:00 UTC (en Hobby solo hay un disparo al día y Vercel solo garantiza la hora, no el minuto) y deja un trabajo `mail` en la cola (`lib/jobs.ts`) con retraso hasta `digestTime()` (`lib/notify.ts`), con una clave por día para que no salga dos veces. El trabajo (`lib/job-run.ts`) llama a `sendDigests` y `sendNudges`. Si falla, la cola lo repite, y nadie recibe dos: el resumen marca a cada persona al enviarle y el aviso pasa por `mailOnce`. `check:notifications` comprueba la hora en verano y en invierno.

**Por qué.** Eric: "vaya horas de envio tiene que ser 8:30 hora española". Que llegue al empezar el día y no de madrugada, cuando se pierde entre el resto del correo, es interpretación nuestra.

**Cómo aplicarlo.** Un correo con hora va por la cola con retraso hasta su hora en Madrid. No se pone la hora en UTC en `vercel.json`, porque cambia dos veces al año y el cron no da el minuto.
