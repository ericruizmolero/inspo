---
title: La primera entrada es un flujo de cuatro pasos, con la extensión y el MCP opcionales
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Una cuenta nueva caía en `EmptyStart`: una caja para pegar una URL, sin proyecto y sin decir nada de la extensión ni del MCP, que solo aparecían después en Conectores. Eric trajo como inspo el primer arranque de Trove: pasos numerados arriba, un titular grande en dos tonos y una sola acción por pantalla.

**Decisión.** La primera vez (cuenta sin referencias ni proyectos, sin llegar con `?add=` y con los primeros pasos sin ocultar) se ve `Welcome` (`components/Welcome.tsx`, `Welcome.module.css`), en lugar de `EmptyStart`, hasta terminarlo:
1. **Nombre**: el nombre del proyecto en `PromptInput`.
2. **Primera referencia**: pegar un enlace en `PromptInput`. Aquí se crea el proyecto, con su primera referencia dentro. Si se pega un tablero de Pinterest, Are.na o Cosmos se importa a su propio proyecto, con el nombre del tablero, y no queda un proyecto vacío.
3. **Extensión** (solo donde se puede instalar, `canInstall`): instalar o conectar en otra pestaña, para no perder el flujo. Si ya está conectada, sale el check moss.
4. **Tu IA**: abre `ConnectDialog`. Con un cliente conectado, sale el check.

Los pasos 3 y 4 llevan "Ahora no" y la nota "Opcional. Lo tienes en Conectores". Arriba hay una barra de pasos: una línea de 2 px por paso, en `--text` hasta el actual y en `--border` después, con el número y el nombre en sans (en móvil, solo el nombre del paso actual). El titular es un `h1` en `--fs-hero` (Geist Serif): lo que hay que hacer en tinta y el porqué en `--text-muted` en su propia línea. La columna va alineada a la izquierda y mide 680 px. Mientras dura no se ven ni la barra de búsqueda ni Tino. En desarrollo, `/?welcome=1` lo enseña con cualquier cuenta.

**Por qué.** Eric: "me gusta este onboarding por primerísima vez cuando entras" y "tendremos que incitar a conectar la extensión y mcp también", "3 y 4 en el mismo flujo pero opcional claro". Interpretación: son las tres cosas que hacen funcionar Criterio (reunir, seguir reuniendo desde cualquier web y sacarlo a un agente), y el primer minuto debe pasar por las tres sin obligar.

**Cómo aplicarlo.** Las etiquetas de los pasos van en sans y nunca en mono mayúsculas como en Trove ([sin mono](2026-10-03-sin-mono-menos-bordes.md)). Cada pantalla tiene una acción y textos de una frase. Un paso nuevo de la primera entrada entra en `Welcome` y no en un modal ni en un tour; lo opcional siempre se puede saltar y sigue disponible en Conectores.
