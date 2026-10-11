// The legal pages: /privacy, /terms and /extension/privacy, in English and Spanish (components/LegalPage.astro).
// A section is a heading and its blocks: a string is a paragraph, a list of strings is a list.
// A draft until a lawyer has read it and LEGAL has the company's details: change LEGAL_UPDATED with every change here.

export interface LegalFacts {
  /** Registered name of the company that runs criterio.design */
  entity: string;
  /** Its tax number (NIF) */
  taxId: string;
  /** Its registered address */
  address: string;
  /** Where people write about their data, the terms, or something to take down */
  contact: string;
}

export const LEGAL: LegalFacts = {
  entity: "",
  taxId: "",
  address: "",
  contact: "hola@criterio.design",
};

/** The day the texts last changed (YYYY-MM-DD) */
export const LEGAL_UPDATED = "2026-10-10";

export type LegalBlock = string | string[];
export interface LegalSection { heading: string; body: LegalBlock[] }
export interface LegalDoc { title: string; lead: string; sections: (c: LegalFacts) => LegalSection[] }
export type LegalDocKey = "privacy" | "terms" | "extensionPrivacy";

interface LegalCopy {
  updated: (date: string) => string;
  pending: Pick<LegalFacts, "entity" | "taxId" | "address">;
  docs: Record<LegalDocKey, LegalDoc>;
}

const en: LegalCopy = {
  updated: (date) => `Last updated ${date}`,
  pending: { entity: "[company name pending]", taxId: "[tax number pending]", address: "[registered address pending]" },
  docs: {
    privacy: {
      title: "Privacy policy",
      lead: "What criterio.design knows about you, why, and what you can do about it.",
      sections: (c: LegalFacts): LegalSection[] => [
        { heading: "Who is responsible", body: [
          `${c.entity}, tax number ${c.taxId}, ${c.address}, runs criterio.design and is responsible for the data described here. Write to ${c.contact} about anything to do with your data.`,
          "What your team stores in a workspace (references, notes, comments, files) is the workspace's: it decides what goes in, and we process it on its behalf.",
        ] },
        { heading: "What we collect", body: [[
          "Your account: your name, email address and picture, as you give them or as Google, Apple or X hand them over when you sign in with them, and the language you use.",
          "Sign-in and security: the sessions you have open, with the IP address and browser of each, and the counters that stop abuse.",
          "What you save: the addresses, titles, screenshots, images, videos and texts of your references, your notes and comments, your projects and what they decide, and the brand files you upload.",
          "How you use the app: when you were last in and how much time you spent in each part of it.",
          "AI use: which AI actions ran in your workspace and what they cost, to apply your plan's limits.",
          "Feedback: what you send with the feedback tool, with the page it was about.",
          "The waitlist: your email, what you answer when you join (name, role, team size, tools, website, what you would use criterio for), your language, where you came from and when you agreed to hear from us.",
          "The browser extension has its own page: criterio.design/extension/privacy.",
        ]] },
        { heading: "What your references contain", body: [
          "A reference is often someone else's work: a site, a post, an image. A post saved from X carries its author's name, handle, picture and words, as X shows them in public. We keep that only so the workspaces that saved the post can see it.",
          "If you are the author of something saved here and want it removed, the Terms say how to ask (criterio.design/terms).",
        ] },
        { heading: "Why we use it", body: [[
          "To give you the service you signed up for: your account, your library, your team. The basis is our contract with you.",
          "To write to you about your account: sign-in links, invitations and notices about the service. Also the contract.",
          "To write to you from the waitlist: when there is room for you, and to send you your invite. Nothing else. The basis is your consent, and you can take it back whenever you like.",
          "To keep the service secure and see how it is used, so we can improve it. The basis is our legitimate interest.",
          "To comply with the law when it obliges us.",
        ], "We do not sell your data, show ads or build advertising profiles."] },
        { heading: "AI", body: [
          "Some features send content to language models: the screenshot and text of a site to tag it, your references and notes to draft a project's criteria, your words to search by meaning. The models are reached through OpenRouter and Typesafe, and run by providers such as Anthropic, Google, Mistral and DeepSeek.",
          "We do not use your content to train models. Each provider processes it to return its answer, under its own terms.",
        ] },
        { heading: "Who we share it with", body: [
          "Only with the companies that run the service for us, each under a contract that limits what it can do with the data:",
          [
            "Vercel: hosting, in Frankfurt.",
            "Neon: the database, in Frankfurt.",
            "Cloudflare: file storage.",
            "Resend: the emails we send you.",
            "Better Stack: error reports and uptime checks. A report holds the error and the page, never your email or what you wrote.",
            "OpenRouter, Typesafe and the model providers behind them: the AI features.",
            "Google, Apple and X: only if you sign in with them.",
          ],
          "Some of them are outside the European Economic Area. Those transfers rely on the European Commission's standard contractual clauses or on the EU-US Data Privacy Framework.",
          "A few things load straight from others: a site's icon comes from Google's favicon service, and a video from X, YouTube or Vimeo plays from their servers. They see your IP address when that happens, as on any page that embeds them.",
        ] },
        { heading: "Cookies", body: [
          "Only the ones the app needs to work: your session, your language and whether the sidebar is open. Your theme is kept in the browser's own storage. There are no analytics or advertising cookies, so there is no banner to accept.",
        ] },
        { heading: "How long we keep it", body: [
          "For as long as your account is open. When a reference is deleted, the files that were only its own go with it. When you ask us to close your account we delete it, and what only you owned, within 30 days; what belongs to a team's workspace stays with the team. Copies in backups expire on their own some days later.",
          "A waitlist entry with no account behind it is deleted 12 months after you joined, or as soon as you ask us. If you create your account, the entry stays with it and goes when the account closes.",
        ] },
        { heading: "Your rights", body: [
          `You can ask to see your data, correct it, delete it, take it with you, or limit or object to how we use it. Write to ${c.contact} from your account's address and we answer within a month.`,
          "If you think we have handled your data badly, you can complain to the Spanish Data Protection Agency (aepd.es).",
        ] },
        { heading: "Who it is for", body: [
          "criterio.design is a tool for professionals. It is not meant for anyone under 16.",
        ] },
        { heading: "Changes", body: [
          "If this policy changes in a way that matters, we tell you by email or in the app before the change applies. The date at the top says when it last changed.",
        ] },
      ],
    },

    terms: {
      title: "Terms of use",
      lead: "The rules for using criterio.design, in plain words.",
      sections: (c: LegalFacts): LegalSection[] => [
        { heading: "Who we are", body: [
          `criterio.design is run by ${c.entity}, tax number ${c.taxId}, ${c.address}. Contact: ${c.contact}.`,
          "By creating an account or using the service you accept these terms. If you use it for a company, you accept them for that company.",
        ] },
        { heading: "What the service is", body: [
          "A library where a team gathers design references, talks about them and turns them into written criteria for a project (criterio.md). It is young and changes often: features can appear, change or go away.",
        ] },
        { heading: "Your account and your team", body: [
          "Keep your email safe: whoever opens the sign-in link gets in. Whoever creates a workspace, or is its admin, decides who joins and answers for what its members do in it.",
        ] },
        { heading: "What is yours", body: [
          "What you write and upload is yours. You give us only the permission we need to run the service: to store it, copy it, process it (with the AI providers named in the Privacy policy too) and show it to your workspace and to whoever you share a link with.",
          "The criteria the app drafts for you are yours to use. They are written with AI: read them before you rely on them.",
        ] },
        { heading: "What belongs to others", body: [
          "References are mostly other people's work. criterio.design is for studying it inside your team: looking at it, commenting on it and drawing criteria from it. Saving something here gives you no rights over it.",
          [
            "You save only what you are allowed to save, and you answer for what you save.",
            "You do not use criterio.design to republish, sell or pass off other people's work.",
            "The copies we keep so a reference outlives its page (a screenshot, an image, a post's media) are for your workspace's eyes.",
            "What came from X or Pinterest is never handed out through a share link: the link names it and points to the original.",
          ],
        ] },
        { heading: "Importing from other services", body: [
          "The extension can bring in what you have saved elsewhere: your browser's bookmarks, your bookmarks on X, your boards on Pinterest. It does it from your browser, with your own session, when you ask.",
          "Those services have terms of their own, and following them is up to you. Import what you saved yourself, not other people's collections.",
          "criterio.design is not affiliated with, endorsed by or sponsored by X or Pinterest. Their names appear only to say where an import comes from.",
        ] },
        { heading: "What is not allowed", body: [[
          "Saving or sharing anything illegal, or that infringes someone's rights.",
          "Using the service to collect content from other sites automatically or at scale, beyond importing what you saved yourself.",
          "Getting around a plan's limits, or reselling access.",
          "Trying to break in, overload the service or reach another workspace's data.",
        ]] },
        { heading: "Asking us to take something down", body: [
          `If something stored in criterio.design is yours and you want it gone, or you believe it is illegal, write to ${c.contact} with:`,
          [
            "Who you are and how to reach you.",
            "What it is: the address of the original (the post, the pin, the page) or of the share link where you saw it.",
            "Why it should come down: that it is your work, or what makes it illegal.",
            "A statement that what you say is true, to the best of your knowledge.",
          ],
          "We look at every notice promptly, remove or block what should not be here, and tell you what we did and why. We also tell the workspace that saved it, which can answer if it believes the notice is wrong. Accounts that infringe again and again are closed.",
        ] },
        { heading: "Plans and payment", body: [
          "Each plan has limits, shown in Settings. Paid plans are not being charged yet. When they are, you will see the price and the conditions before you pay anything.",
        ] },
        { heading: "Availability", body: [
          "We work to keep the service up and your data safe, but we offer it as it is, without promising it will never fail or lose anything. Keep your own copy of what matters: criterio.md can be copied or downloaded at any time.",
        ] },
        { heading: "Closing an account", body: [
          `You can stop using the service whenever you like, and ask us to delete your account at ${c.contact}. We can suspend or close an account that breaks these terms, and we tell you why unless the law stops us.`,
        ] },
        { heading: "Liability", body: [
          "As far as the law allows, we are not liable for indirect losses or for what users save or do with the service, and our total liability is limited to what you paid us in the twelve months before the claim. Nothing here takes away the rights the law gives you as a consumer.",
        ] },
        { heading: "Law and courts", body: [
          "Spanish law applies. Disputes go to the courts of the place where we are registered, unless consumer law gives you the right to your own.",
        ] },
        { heading: "Changes", body: [
          "If these terms change in a way that matters, we tell you by email or in the app before the change applies. Using the service after that means you accept them.",
        ] },
      ],
    },

    extensionPrivacy: {
      title: "Extension privacy",
      lead: "What the criterio.design browser extension does with your data. Short, because it does very little.",
      sections: () => [
        { heading: "What it does", body: ["It saves the site you are looking at into your criterio.design library. Nothing happens until you open the popup and press Save. It can also import your bookmarks, from the browser or from X, and the pins of a board on Pinterest, when you ask it to from its import page."] },
        { heading: "What it sends", body: ["When you press Save it sends three things to criterio.design over HTTPS: the page address, the tab title and a screenshot of the visible part of the page. The screenshot becomes the thumbnail of the saved item. When you import bookmarks it sends their addresses and titles, nothing else; from a board on Pinterest, each pin's address, its title and the address of its image. criterio.design then copies each pin's image and each post's photos and videos into your library, which only your workspace sees. It sends nothing anywhere else."] },
        { heading: "What it keeps in the browser", body: ["An access key, the list of your workspaces and your email, in the extension's own storage. Disconnect removes them and revokes the key on the server."] },
        { heading: "What it does not do", body: ["It does not read your browsing history, does not track the pages you visit, does not run on any site by itself and does not share or sell data to third parties."] },
        { heading: "Permissions", body: ["activeTab: to read the address and title of the current tab and capture it, only when you click the extension. storage: to keep the key. bookmarks: to list your bookmark folders on the import page, so you can choose what to import. scripting and x.com (optional, Chrome asks when you press Import from X): to scroll through your bookmarks page on x.com and read the addresses of the posts while importing; nothing else on x.com is read, and you can remove that permission in Chrome at any time. pinterest.com (optional, Chrome asks when you press Import from Pinterest): to open the board you gave and read its pins while importing; nothing else on Pinterest is read, and that permission can be removed the same way. criterio.design: to talk to your library; it runs on criterio.design only, to tell the app it is installed and to receive its key."] },
        { heading: "Your data", body: ["Revoke a key any time under Settings, Browser extension. Saved items are deleted from the library. Questions: hola@criterio.design."] },
      ],
    },
  },
};

const es: LegalCopy = {
  updated: (date) => `Última actualización: ${date}`,
  pending: { entity: "[razón social pendiente]", taxId: "[NIF pendiente]", address: "[domicilio social pendiente]" },
  docs: {
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
          "La lista de espera: tu correo, lo que respondes al apuntarte (nombre, rol, tamaño del equipo, herramientas, web, para qué usarías criterio), tu idioma, de dónde llegaste y cuándo aceptaste que te escribamos.",
          "La extensión del navegador tiene su propia página: criterio.design/es/extension/privacy.",
        ]] },
        { heading: "Qué contienen tus referencias", body: [
          "Una referencia suele ser el trabajo de otra persona: una web, un post, una imagen. Un post guardado de X lleva el nombre, el usuario, la foto y las palabras de su autor, tal como X los muestra en público. Lo conservamos solo para que los espacios que guardaron el post puedan verlo.",
          "Si eres el autor de algo guardado aquí y quieres que se retire, los Términos explican cómo pedirlo (criterio.design/es/terms).",
        ] },
        { heading: "Para qué lo usamos", body: [[
          "Para darte el servicio en el que te has registrado: tu cuenta, tu librería, tu equipo. La base es nuestro contrato contigo.",
          "Para escribirte sobre tu cuenta: enlaces de acceso, invitaciones y avisos del servicio. También el contrato.",
          "Para escribirte desde la lista de espera: cuando haya sitio para ti, y para enviarte tu invitación. Nada más. La base es tu consentimiento, y puedes retirarlo cuando quieras.",
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
          "Una entrada de la lista de espera sin cuenta detrás se borra 12 meses después de apuntarte, o en cuanto nos lo pidas. Si creas tu cuenta, la entrada se queda con ella y se va cuando la cuenta se cierra.",
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

    extensionPrivacy: {
      title: "Privacidad de la extensión",
      lead: "Qué hace la extensión de criterio.design con tus datos. Corto, porque hace muy poco.",
      sections: () => [
        { heading: "Qué hace", body: ["Guarda la web que estás viendo en tu librería de criterio.design. No pasa nada hasta que abres el popup y pulsas Guardar. También puede importar tus marcadores, del navegador o de X, y los pines de un tablero de Pinterest, cuando se lo pides desde su página de importación."] },
        { heading: "Qué envía", body: ["Al pulsar Guardar envía tres cosas a criterio.design por HTTPS: la dirección de la página, el título de la pestaña y una captura de la parte visible de la página. La captura se convierte en la miniatura del elemento guardado. Al importar marcadores envía sus direcciones y títulos, nada más; de un tablero de Pinterest, la dirección de cada pin, su título y la dirección de su imagen. criterio.design copia después la imagen de cada pin y las fotos y vídeos de cada post a tu librería, que solo ve tu espacio. No envía nada a ningún otro sitio."] },
        { heading: "Qué guarda en el navegador", body: ["Una llave de acceso, la lista de tus espacios y tu correo, en el almacenamiento propio de la extensión. Desconectar los borra y revoca la llave en el servidor."] },
        { heading: "Qué no hace", body: ["No lee tu historial, no rastrea las páginas que visitas, no se ejecuta en ninguna web por su cuenta y no comparte ni vende datos a terceros."] },
        { heading: "Permisos", body: ["activeTab: para leer la dirección y el título de la pestaña actual y capturarla, solo cuando pulsas la extensión. storage: para guardar la llave. bookmarks: para listar tus carpetas de marcadores en la página de importación y que elijas qué importar. scripting y x.com (opcional, Chrome lo pide al pulsar Importar de X): para recorrer tu página de guardados en x.com y leer las direcciones de los posts mientras importa; no lee nada más de x.com y puedes quitar ese permiso en Chrome cuando quieras. pinterest.com (opcional, Chrome lo pide al pulsar Importar de Pinterest): para abrir el tablero que le has dado y leer sus pines mientras importa; no lee nada más de Pinterest y ese permiso se quita igual. criterio.design: para hablar con tu librería; solo se ejecuta en criterio.design, para decirle a la app que está instalada y para recibir su llave."] },
        { heading: "Tus datos", body: ["Revoca una llave cuando quieras en Ajustes, Extensión del navegador. Los elementos guardados se borran desde la librería. Dudas: hola@criterio.design."] },
      ],
    },
  },
};

export const legal = { en, es };
