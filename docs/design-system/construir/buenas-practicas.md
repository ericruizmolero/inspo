# Buenas prácticas

1. **Revisa en localhost.** La preview de Ship Studio es donde se mira; no se sube tras cada cambio. A producción, solo cuando se pide, y directo.
2. **Un cambio por vez.** Commits que dicen lo que ahora hace la app, en inglés, sin prefijos: "A tab's × takes the ring's place instead of sitting on it".
3. **Una sesión de agente por rama.** Varias sesiones sobre el mismo árbol sin commits se pisan y se matan el dev server. Antes de tocar un fichero compartido: `git status` y mira si cambió.
4. **Antes de fusionar a `main`**, pregunta qué depende de datos que solo existen en local (scripts, filas de un workspace, ejemplos).
5. **Mide antes de opinar** sobre rendimiento: frames por 1,2 s y tareas largas, en Chrome real, no en la preview.
6. **La IA cuesta dinero**: todo pasa por `recordUsage()`; prefiltro barato antes del modelo caro; sube su `version` en `lib/prompts.ts` al tocar un prompt.
7. **Nombra las cosas como en esta librería.** Si pides "la isla" o "el dock", todos (personas y agentes) saben qué es.
8. **Cada sí o no del equipo se registra** como decisión. Lo que no está escrito, se pierde.
