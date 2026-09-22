// Inglés: el idioma de partida. Aquí se escribe primero y de aquí sale la traducción.
// Cada archivo de lib/i18n/es/ lleva las mismas claves y está tipado contra el suyo,
// así que falta una y no compila.
//
// ui.ts es el texto de la interfaz. Los demás llevan el texto de cosas que tienen
// su propia clave: los planes, el directorio, la taxonomía, los correos y los
// valores que la base de datos guarda en castellano.
import { ui } from "./ui";
import { labels } from "./labels";
import { taxonomy } from "./taxonomy";
import { plans } from "./plans";
import { recursos } from "./recursos";
import { mail } from "./mail";
import { errors } from "./errors";

const en = {
  ...ui,
  labels,
  taxonomy,
  mail,
  errors,
  plans: { ...ui.plans, items: plans },
  recursos: { ...ui.recursos, ...recursos },
};

export type Dict = typeof en;
export default en;
