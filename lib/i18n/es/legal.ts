import type { LegalFacts } from "../../legal";
import type { LegalSection } from "../en/legal";

export const legal = {
  updated: (date: string): string => `Última actualización: ${date}`,
  draft: "Borrador, pendiente de que lo revise un abogado. Solo se ve en desarrollo.",
  pending: { entity: "[razón social pendiente]", taxId: "[NIF pendiente]", address: "[domicilio social pendiente]" },
  links: { privacy: "Privacidad", terms: "Términos", extension: "Privacidad de la extensión" },
  accept: ["Al entrar aceptas los ", "Términos", " y la ", "Política de privacidad", "."] as [string, string, string, string, string],

  privacy: {
    title: "Política de privacidad",
    lead: "Qué sabe criterio.design de ti, para qué, y qué puedes hacer al respecto.",
    sections: (c: LegalFacts): LegalSection[] => [
      { heading: "Quién responde", body: [
        `${c.entity}, con NIF ${c.taxId} y domicilio en ${c.address}, gestiona criterio.design y es responsable de los datos que se describen aquí. Para cualquier cosa sobre tus datos, escribe a ${c.contact}.`,
        "Lo que tu equipo guarda en un espacio (referencias, notas, comentarios, ficheros) es del espacio: él decide qué entra, y nosotros lo tratamos por su cuenta.",
      ] },
      { heading: "Qué recogemos", body: [[
        "Tu cuenta: tu nombre, tu correo y tu foto, como los das tú o como los entregan Google, Apple o X cuando entras con ellos, y el idioma que usas.",
        "Acceso y seguridad: las sesiones que tienes abiertas, con la dirección IP y el navegador de cada una, y los contadores que frenan el abuso.",
        "Lo que guardas: las direcciones, títulos, capturas, imágenes, vídeos y textos de tus referencias, tus notas y comentarios, tus proyectos y lo que deciden, y los ficheros de marca que subes.",
        "Cómo usas la app: cuándo entraste por última vez y cuánto tiempo pasas en cada parte.",
        "Uso de la IA: qué acciones de IA se han ejecutado en tu espacio y cuánto han costado, para aplicar los límites de tu plan.",
        "Comentarios: lo que envías con la herramienta de comentarios, con la página a la que se refieren.",
        "La extensión del navegador tiene su propia página: criterio.design/extension/privacy.",
      ]] },
      { heading: "Qué contienen tus referencias", body: [
        "Una referencia suele ser el trabajo de otra persona: una web, un post, una imagen. Un post guardado de X lleva el nombre, el usuario, la foto y las palabras de su autor, tal como X los muestra en público. Lo conservamos solo para que los espacios que guardaron el post puedan verlo.",
        "Si eres el autor de algo guardado aquí y quieres que se retire, los Términos explican cómo pedirlo (criterio.design/terms).",
      ] },
      { heading: "Para qué lo usamos", body: [[
        "Para darte el servicio en el que te has registrado: tu cuenta, tu librería, tu equipo. La base es nuestro contrato contigo.",
        "Para escribirte sobre tu cuenta: enlaces de acceso, invitaciones y avisos del servicio. También el contrato.",
        "Para mantener el servicio seguro y ver cómo se usa, y así mejorarlo. La base es nuestro interés legítimo.",
        "Para cumplir la ley cuando nos obliga.",
      ], "No vendemos tus datos, no mostramos anuncios ni hacemos perfiles publicitarios."] },
      { heading: "IA", body: [
        "Algunas funciones envían contenido a modelos de lenguaje: la captura y el texto de una web para etiquetarla, tus referencias y notas para redactar los criterios de un proyecto, tus palabras para buscar por significado. A los modelos se llega a través de OpenRouter y Typesafe, y los operan proveedores como Anthropic, Google, Mistral y DeepSeek.",
        "No usamos tu contenido para entrenar modelos. Cada proveedor lo trata para devolver su respuesta, bajo sus propias condiciones.",
      ] },
      { heading: "Con quién lo compartimos", body: [
        "Solo con las empresas que hacen funcionar el servicio para nosotros, cada una con un contrato que limita lo que puede hacer con los datos:",
        [
          "Vercel: alojamiento, en Fráncfort.",
          "Neon: la base de datos, en Fráncfort.",
          "Cloudflare: almacenamiento de ficheros.",
          "Resend: los correos que te enviamos.",
          "Better Stack: los informes de errores y las comprobaciones de que la app sigue en pie. Un informe lleva el error y la página, nunca tu correo ni lo que escribiste.",
          "OpenRouter, Typesafe y los proveedores de modelos que hay detrás: las funciones de IA.",
          "Google, Apple y X: solo si entras con ellos.",
        ],
        "Algunas están fuera del Espacio Económico Europeo. Esas transferencias se apoyan en las cláusulas contractuales tipo de la Comisión Europea o en el Marco de Privacidad de Datos UE-EE. UU.",
        "Unas pocas cosas se cargan directamente de terceros: el icono de una web viene del servicio de favicons de Google, y un vídeo de X, YouTube o Vimeo se reproduce desde sus servidores. En ese momento ven tu dirección IP, como en cualquier página que los incrusta.",
      ] },
      { heading: "Cookies", body: [
        "Solo las que la app necesita para funcionar: tu sesión, tu idioma y si el menú lateral está abierto. El tema se guarda en el almacenamiento del propio navegador. No hay cookies de analítica ni de publicidad, así que no hay aviso que aceptar.",
      ] },
      { heading: "Cuánto tiempo lo guardamos", body: [
        "Mientras tu cuenta esté abierta. Al borrar una referencia se borran los ficheros que eran solo suyos. Cuando nos pides cerrar tu cuenta la eliminamos, junto con lo que era solo tuyo, en un plazo de 30 días; lo que pertenece al espacio de un equipo se queda con el equipo. Las copias de seguridad caducan solas unos días después.",
      ] },
      { heading: "Tus derechos", body: [
        `Puedes pedir ver tus datos, corregirlos, borrarlos, llevártelos, o limitar u oponerte a cómo los usamos. Escribe a ${c.contact} desde el correo de tu cuenta y respondemos en un mes como máximo.`,
        "Si crees que hemos tratado mal tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
      ] },
      { heading: "Para quién es", body: [
        "criterio.design es una herramienta para profesionales. No está pensada para menores de 16 años.",
      ] },
      { heading: "Cambios", body: [
        "Si esta política cambia en algo importante, te avisamos por correo o en la app antes de que el cambio se aplique. La fecha de arriba dice cuándo cambió por última vez.",
      ] },
    ],
  },

  terms: {
    title: "Términos de uso",
    lead: "Las reglas para usar criterio.design, en palabras llanas.",
    sections: (c: LegalFacts): LegalSection[] => [
      { heading: "Quiénes somos", body: [
        `criterio.design lo gestiona ${c.entity}, con NIF ${c.taxId} y domicilio en ${c.address}. Contacto: ${c.contact}.`,
        "Al crear una cuenta o usar el servicio aceptas estos términos. Si lo usas para una empresa, los aceptas en su nombre.",
      ] },
      { heading: "Qué es el servicio", body: [
        "Una librería donde un equipo reúne referencias de diseño, las comenta y las convierte en criterios escritos para un proyecto (criterio.md). Es joven y cambia a menudo: pueden aparecer, cambiar o desaparecer funciones.",
      ] },
      { heading: "Tu cuenta y tu equipo", body: [
        "Cuida tu correo: quien abre el enlace de acceso, entra. Quien crea un espacio, o lo administra, decide quién se une y responde de lo que sus miembros hacen en él.",
      ] },
      { heading: "Lo que es tuyo", body: [
        "Lo que escribes y subes es tuyo. Nos das solo el permiso que hace falta para prestar el servicio: guardarlo, copiarlo, tratarlo (también con los proveedores de IA que nombra la Política de privacidad) y mostrarlo a tu espacio y a quien le compartas un enlace.",
        "Los criterios que la app redacta para ti son tuyos para usarlos. Están escritos con IA: léelos antes de darlos por buenos.",
      ] },
      { heading: "Lo que es de otros", body: [
        "Las referencias son casi siempre trabajo de otras personas. criterio.design sirve para estudiarlo dentro de tu equipo: mirarlo, comentarlo y sacar criterios de él. Guardar algo aquí no te da ningún derecho sobre ello.",
        [
          "Guardas solo lo que tienes permiso para guardar, y respondes de lo que guardas.",
          "No usas criterio.design para volver a publicar, vender o hacer pasar por tuyo el trabajo de otros.",
          "Las copias que conservamos para que una referencia sobreviva a su página (una captura, una imagen, el contenido de un post) son para los ojos de tu espacio.",
          "Lo que viene de X o de Pinterest nunca se entrega por un enlace compartido: el enlace lo nombra y apunta al original.",
        ],
      ] },
      { heading: "Importar de otros servicios", body: [
        "La extensión puede traer lo que tienes guardado en otros sitios: los marcadores de tu navegador, tus guardados de X, tus tableros de Pinterest. Lo hace desde tu navegador, con tu propia sesión, cuando tú lo pides.",
        "Esos servicios tienen sus propias condiciones, y cumplirlas depende de ti. Importa lo que has guardado tú, no las colecciones de otras personas.",
        "criterio.design no está afiliado a X ni a Pinterest, ni cuenta con su aval o patrocinio. Sus nombres aparecen solo para decir de dónde viene una importación.",
      ] },
      { heading: "Lo que no se puede hacer", body: [[
        "Guardar o compartir algo ilegal, o que vulnere los derechos de alguien.",
        "Usar el servicio para recoger contenido de otras webs de forma automática o masiva, más allá de importar lo que has guardado tú.",
        "Saltarse los límites de un plan, o revender el acceso.",
        "Intentar entrar por la fuerza, saturar el servicio o llegar a los datos de otro espacio.",
      ]] },
      { heading: "Pedirnos que retiremos algo", body: [
        `Si algo guardado en criterio.design es tuyo y quieres que desaparezca, o crees que es ilegal, escribe a ${c.contact} con:`,
        [
          "Quién eres y cómo contactarte.",
          "Qué es: la dirección del original (el post, el pin, la página) o del enlace compartido donde lo has visto.",
          "Por qué debe retirarse: que es obra tuya, o qué lo hace ilegal.",
          "Una declaración de que lo que dices es cierto, según tu leal saber.",
        ],
        "Miramos cada aviso con rapidez, retiramos o bloqueamos lo que no debe estar aquí, y te contamos qué hemos hecho y por qué. También avisamos al espacio que lo guardó, que puede responder si cree que el aviso es un error. Las cuentas que infringen una y otra vez se cierran.",
      ] },
      { heading: "Planes y pago", body: [
        "Cada plan tiene límites, que se ven en Ajustes. Los planes de pago todavía no se cobran. Cuando se cobren, verás el precio y las condiciones antes de pagar nada.",
      ] },
      { heading: "Disponibilidad", body: [
        "Trabajamos para que el servicio funcione y tus datos estén a salvo, pero lo ofrecemos tal como es, sin prometer que nunca fallará ni perderá nada. Guarda tu propia copia de lo importante: criterio.md se puede copiar o descargar en cualquier momento.",
      ] },
      { heading: "Cerrar una cuenta", body: [
        `Puedes dejar de usar el servicio cuando quieras y pedirnos que borremos tu cuenta en ${c.contact}. Podemos suspender o cerrar una cuenta que incumpla estos términos, y te diremos por qué salvo que la ley lo impida.`,
      ] },
      { heading: "Responsabilidad", body: [
        "Hasta donde la ley lo permite, no respondemos de pérdidas indirectas ni de lo que los usuarios guardan o hacen con el servicio, y nuestra responsabilidad total se limita a lo que nos hayas pagado en los doce meses anteriores a la reclamación. Nada de esto te quita los derechos que la ley te da como consumidor.",
      ] },
      { heading: "Ley y tribunales", body: [
        "Se aplica la ley española. Los conflictos van a los tribunales del lugar donde estamos registrados, salvo que la ley de consumo te dé derecho a los tuyos.",
      ] },
      { heading: "Cambios", body: [
        "Si estos términos cambian en algo importante, te avisamos por correo o en la app antes de que el cambio se aplique. Seguir usando el servicio después significa que los aceptas.",
      ] },
    ],
  },
};
