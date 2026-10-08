---
title: Importar dice el destino arriba, lo confirma antes de empezar y deja elegir cuántos
date: 2026-10-08
status: vigente
kind: producto
---
**Contexto.** En la página de importar de la extensión (`extension/chrome/import.html`) el espacio era un chip pequeño en la cabecera y el proyecto un desplegable escondido en la entradilla, oculto si no había proyectos. Pulsar "Importar de X" lanzaba la importación entera sin volver a decir dónde iba a caer, y no había forma de pedir solo una parte de los guardados.

**Decisión.** La página empieza por una tarjeta "Dónde va" con dos campos a la vista, Espacio y Proyecto (`.where`, los `.select` del popup), y debajo la frase "Todo lo que importes irá a Proyecto, en Espacio" con los nombres en negrita; sin proyectos, el destino es el Inbox y se dice. Los botones de importar esperan a que el destino esté cargado. Cada botón abre una ventana de diálogo (`<dialog>.dlg`: barra moss "Antes de importar", título en display, cuerpo con qué entra y dónde en negrita, pie con "Cambiar el destino" e "Importar a Proyecto"); cambiar vuelve al campo de proyecto. Durante la importación el título lleva debajo "A Proyecto, en Espacio". En X y Pinterest hay un campo "Cuáles": los últimos 50, 100, 250 o 500, o todos (hasta 1000); X añade "los de la última semana" y "los del último mes", por la fecha del post (un pin no tiene fecha), y el recolector para tras 60 posts seguidos anteriores al periodo. Extensión 0.7.0.

**Por qué.** Eric, 8 de octubre: "Es muy importante antes de importar en Twitter que quede claro para el usuario donde va a importar los guardados, que seleccione bien espacio/proyecto antes". Y después: "dar la opción al usuario de importar un número determinado de guardados o todos, que pueda seleccionar por recientes o lo que sea", "opción a importar los de la última semana o así". Una importación de cientos de referencias al proyecto equivocado es un trabajo deshacerla; por eso aquí sí hay confirmación aunque no destruya nada (interpretación nuestra).

**Cómo aplicarlo.** Cualquier acción que meta muchas piezas de golpe en un proyecto dice el destino antes, en la misma vista y con los nombres reales, y lo repite en la confirmación. Si X solo da la fecha del post y no la del guardado, se avisa en el texto ("un periodo va por la fecha del post"), no se promete lo que no se sabe.
