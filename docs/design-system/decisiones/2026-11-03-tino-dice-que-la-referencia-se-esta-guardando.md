---
title: Tino dice desde la barra que la referencia se está guardando, y la tarjeta sale al momento
date: 2026-11-03
status: vigente
kind: diseño
---
**Contexto.** Al subir algo al tablón de un proyecto pasaban uno o dos segundos sin que pasara nada, y luego aparecía la tarjeta. La tarjeta provisional ya existía (`hooks/use-add-references.ts`), pero no tenía id, y el filtro del espacio (`spaceItems` en `components/InspoClient.tsx`) solo enseñaba en un proyecto las tarjetas con id enlazadas a él: hasta que el servidor contestaba, no se veía. Eric: "creo que tenemos que poner a Tino por ejemplo diciendo, ya se está subiendo o algo". Una primera versión puso la criatura del logo en la tarjeta; Eric la corrigió: Tino es "el peluche blanco", "el que es 3D", "el que ayuda y sale debajo de la pantalla".

**Decisión.**
- La tarjeta provisional lleva `pendingIn` (`types/inspo.ts`, solo en el cliente): el proyecto al que va (el `into` de quien la añade o el destino de guardar), o `null` para el Inbox. `spaceItems` y `unfiled` la enseñan ahí desde el primer fotograma. La respuesta del servidor solo la cambia por la guardada, que conserva la clave con la que se enseñó (`keepKey` en `lib/board.ts`): es la misma tarjeta, sin volver a montarse ni entrar otra vez.
- Mientras no tiene id, la tarjeta lleva el chip de "reuniendo" (`.tile__tag--gathering`) con "Subiendo" (un archivo, mientras su dirección es la local `blob:`) o "Guardando" (una URL o un texto).
- Lo dice Tino, el de la barra del tablón (`SearchTino`, prop `saving`): cara de pensar (`thinking`), "A ver, a ver." y "Lo estoy subiendo. Ya está en el tablón." o "Lo estoy guardando. Ya está en el tablón." (`t.tino.savingTitle`, `t.tino.uploading`, `t.tino.saving`). Va antes que cualquier otra cosa que diga, sin ×, y se va solo cuando la tarjeta queda guardada. Si la barra estaba plegada en la pestañita (⌘K), se despliega (efecto junto a `unfoldDock` en `components/InspoClient.tsx`) y se queda abierta: plegada, Tino no se dibuja y no se le oía.
- Nada de un Tino por tarjeta: es un modelo 3D con WebGL y el navegador admite pocos lienzos a la vez.

**Por qué.** Eric pidió que Tino dijera que ya se está subiendo. Que la tarjeta salga al momento quita la espera muda; que lo diga el Tino que ya está en pantalla, con la frase del pensador de su hoja ("While you type or something loads"), le da voz sin meter otro personaje.

**Cómo aplicarlo.** Otra espera breve del tablón se cuenta igual: la pieza que espera sale ya, con el chip de "reuniendo", y Tino lo dice desde la barra. Tino no se dibuja dentro de las tarjetas.
