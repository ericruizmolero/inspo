---
title: El Resultado es una cuarta vista del Sistema, una página que hace una IA desde el criterio.md
date: 2026-10-13
status: vigente
kind: producto
---
**Contexto.** El feedback de Alex (13-10) fue que el resultado sale "muy normal" y que querría pedir "genérame la página About" con sus referencias. En el grupo, Andoni dijo que la clave para que la gente vuelva es que el resultado sea "mucho mejor que lo que me habría dado Claude de base", y Alberto, que el resultado aún no es lo bastante bueno para lanzar. El 06-10 se había retirado otra pestaña de resultados (un bento con Tiptap, ver [vuelve la Presentación](2026-10-06-vuelve-la-presentacion.md)); esta es distinta: no es un sitio donde el equipo deja lo que hizo, sino una página que genera la app desde el fichero.

**Decisión.** La fila de vistas del Sistema en `components/SystemView.tsx` pasa a ser Markdown, Documento, Presentación y **Resultado**; la Presentación de Alberto se queda como está. Resultado es `components/ResultView.tsx` (`.res`): Chips del tipo de página, "Construir", y la página en un `iframe` con `sandbox` vacío. La construye `lib/criterio-result.ts` (tabla `criterio_result`, ruta `/api/system/result`) con el criterio.md tal como está, que queda guardado como versión. La primera visita a un proyecto con algo decidido la construye sola, una vez; después, a mano. Es una acción de IA (`result`) y la primera de cada cuenta es gratis.

**Por qué.** Eric, 13-10: "lo hacemos, en producto sí. Manteniendo la estructura actual eh. Tiene que ser un apartado más del sistema". Antes había preguntado si era muy caro: cuesta unos 0,10 $ por página con Sonnet (medido el 13-10). Interpretación nuestra: ver el resultado sin salir de la app es la prueba de que el fichero vale, y la razón para volver a mejorarlo.

**Cómo aplicarlo.** Lo que se haga con un resultado (comentarlo, que el comentario vuelva al MD como propuesta, compararlo con lo que daría Claude sin el fichero) vive dentro de esta vista, sin pestañas ni navegación nuevas. El modelo se elige por calidad, no por precio: un primer resultado flojo juega en contra del fichero.
