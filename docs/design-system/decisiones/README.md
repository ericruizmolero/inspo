# Decisiones

Una decisión por fichero: `AAAA-MM-DD-slug.md`. Lo que se retira no se borra: cambia su `status`.

```markdown
---
title: Frase que dice lo decidido
date: AAAA-MM-DD
status: vigente | retirada | sustituida
kind: diseño | desarrollo | producto
supersedes: (opcional) qué sustituye
---
**Contexto.** Qué pasaba.

**Decisión.** Qué se hace ahora, concreto (ficheros, tokens, clases).

**Por qué.** El motivo, con las palabras literales de quien decidió si las hay.

**Cómo aplicarlo.** La regla para la próxima vez.
```

La página `/library/decisiones` las lista solas; no hace falta índice a mano.
