---
title: Importar una exportación funciona en todos los planes y entra en el espacio abierto
date: 2026-11-20
status: vigente
kind: producto
---
**Contexto.** Un zip de `/api/workspace/export` solo se importaba como un equipo nuevo en la cuenta de quien paga. Solo Agency tiene sitio para más de un espacio, así que en Gratis, Duo y Studio no se podía importar nada.

**Decisión.** Importar añade el zip al espacio abierto (`importIntoWorkspace` en `lib/workspace-import.ts`), y lo hace quien lo gestiona (propietario o admin, `canManage`). "Como espacio nuevo" (`importAsTeam`, `?into=new`) queda de segunda opción en Ajustes › Espacio, y solo se ve si la persona paga un plan con sitio para otro espacio (`roomForTeam` en `app/settings/workspace/page.tsx`). Lo que el espacio ya tiene se queda como está: una referencia con la misma dirección es esa (con su hilo), una plantilla con el mismo nombre es esa, un archivo en su ruta no se sobrescribe, y un proyecto cuyo nombre existe toma el primero libre (`firstFreeName`, `lib/templates.ts`). Los límites del plan (referencias, proyectos, almacenamiento) se miran contra lo que el espacio ya guarda antes de escribir nada, y el aviso de subir de plan dice cuánto trae y cuánto cabe (`importItemsFull`, `importProjectsFull`, `importStorageFull`). Para el límite de 300 s de la ruta: se rechaza de entrada una exportación de más de 2000 archivos (`MAX_IMPORT_FILES`), y si copiar los archivos pasa de 230 s se para, se borra lo copiado y responde 413 (`tooSlow`). No es reanudable.

**Por qué.** El equipo: "make import work on every plan, not only Agency". Lo de reanudar se descartó (interpretación del agente): pide guardar el estado de una importación a medias, que hoy no tiene tabla, y el límite medido más el corte a tiempo ya cumplen que un fallo no deje nada a medias.

**Cómo aplicarlo.** Lo que lleva datos de fuera a un espacio entra en el abierto, con los límites de su plan mirados antes de escribir, y nunca sobrescribe ni borra lo que ya estaba. Un trabajo largo dentro de una ruta lleva su presupuesto de tiempo y deshace lo suyo antes de que la plataforma lo corte.
