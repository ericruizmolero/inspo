// La misma tarjeta que opengraph-image, para que X y compañía la pidan por twitter:image.
// Los campos de configuración no se pueden reexportar: Next los lee estáticamente.
import og from "./opengraph-image";

export const alt = "Inspo, la biblioteca de inspiración de tu equipo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default og;
