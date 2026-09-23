// The same card as opengraph-image, so X and friends can request it via twitter:image.
// Config fields cannot be re-exported: Next reads them statically.
import og from "./opengraph-image";

export const alt = "criterio.design, your team's inspiration library";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default og;
