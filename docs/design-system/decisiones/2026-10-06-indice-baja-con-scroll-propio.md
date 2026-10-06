---
title: El índice del fichero baja con un scroll propio, no con el del navegador
date: 2026-10-06
status: vigente
kind: desarrollo
---
**Contexto.** El índice lateral de criterio.md (`.sdoc-toc`) llevaba a cada parte con `scrollIntoView({ behavior: "smooth" })` y, a los 700 y 1500 ms, corregía de un salto si no había llegado. El scroll suave del navegador se corta cuando cambia el alto de lo que hay encima (imágenes que llegan) o si todavía dura la inercia del trackpad, y la corrección llegaba como un golpe. Eric, 06-10: "los anchor links no anclan demasiado bien, a veces se queda pillado. tiene que bajar smooth".

**Decisión.** `go` en `components/SystemDoc.tsx` mueve el `scrollTop` del contenedor con `requestAnimationFrame`: 520 ms con salida suave (cuarta potencia, parecida a `--ease-out`), dure lo que dure la distancia. El destino se vuelve a leer en cada frame y se sigue sujetando hasta 1,5 s por si lo de arriba crece. Mientras viaja, la rueda no cuenta (así no lo frena la inercia que venía de antes); después, un scroll nuevo o un dedo devuelven la página a quien la mueve. Con `prefers-reduced-motion` va de un salto.

**Por qué.** La cita de Eric. El diagnóstico es mío: no pude reproducir el atasco en la preview, pero las dos causas conocidas (el alto que cambia y la inercia) dejan de poder cortar el viaje, y ya no hay corrección a saltos. Medido en la preview: de Voz y tono a Color aterriza a 93 px del borde con un margen pedido de 92.

**Cómo aplicarlo.** Para llevar la página a un sitio que puede moverse mientras se llega, no fiarse de `behavior: "smooth"`: animar el `scrollTop` y releer el destino en cada frame. Nunca corregir con un salto.
