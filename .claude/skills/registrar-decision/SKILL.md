---
name: registrar-decision
description: Registrar una decisión de diseño o desarrollo de Criterio en el sistema de diseño interno (docs/design-system, visible en /library). Usar SIEMPRE que el equipo apruebe, rechace o corrija algo de la interfaz, los tokens, un componente, un patrón de interacción o una forma de construir ("esto no", "así sí", "quita los bordes", "lo veo ai slop", "mejor X que Y"), cuando se retire o sustituya una función, o cuando pidan "apunta esto", "regístralo" o "/registrar-decision". No usar para decisiones del producto de los clientes (su criterio.md).
---

# Registrar una decisión

1. **Busca si ya existe** en `docs/design-system/decisiones/` una decisión sobre lo mismo (grep por el tema). Si la nueva la cambia, no la edites en silencio: pon la vieja en `status: sustituida` (o `retirada`) y escribe la nueva con `supersedes:`.
2. **Escribe el fichero** `docs/design-system/decisiones/AAAA-MM-DD-slug.md` con la plantilla de `decisiones/README.md`: frontmatter (`title`, `date`, `status`, `kind`: diseño | desarrollo | producto) y los cuatro párrafos **Contexto**, **Decisión**, **Por qué**, **Cómo aplicarlo**.
   - El título es una frase que dice lo decidido, no el tema ("Sin mono en etiquetas", no "Tipografía de etiquetas").
   - En **Por qué**, cita literal a quien decidió si lo explicó con sus palabras. Lo que sea interpretación tuya, márcalo.
   - En **Decisión**, nombra ficheros, tokens y clases concretas.
3. **Actualiza la regla**: si cambia un principio, un token, un componente o un patrón, edita también `principios.md`, `fundamentos.md`, `componentes.md`, `patrones.md` o `desarrollo.md`, y enlaza la decisión (`decisiones/<fichero>.md`). Si cambió un valor en `app/globals.css`, la tabla de `fundamentos.md` se corrige en el mismo cambio.
4. **Escribe en castellano**, sin rayas (— –) ni puntos medios entre elementos.
5. Dile al equipo en una línea qué has registrado; `/library/decisiones` lo muestra solo, sin índice a mano.
