// Utilidades de imagen en el navegador.
//
// Los errores salen como código, no como frase: este módulo corre en el navegador y
// no puede leer la cookie del idioma. Quien los captura (componentes con useT) los
// traduce con t.errors.<código>.
export const IMAGE_ERROR = {
  notAnImage: "notAnImage",
  imageFailed: "imageFailed",
  encodeFailed: "encodeFailed",
  imageTooBig: "imageTooBig",
} as const;


/**
 * Reduce una imagen a un cuadrado de `size` px (recorte centrado) y la devuelve como data URL.
 * Se usa para logos: cabe en la columna `organization.logo` y no necesita almacenamiento aparte.
 */
export async function fileToSquareDataURL(file: File, size = 128): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(IMAGE_ERROR.notAnImage);
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(IMAGE_ERROR.imageFailed);
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    // PNG conserva transparencia (logos); webp si el navegador lo soporta y queda más pequeño
    const png = canvas.toDataURL("image/png");
    const webp = canvas.toDataURL("image/webp", 0.9);
    return webp.startsWith("data:image/webp") && webp.length < png.length ? webp : png;
  } finally {
    bitmap.close();
  }
}

export interface PreparedImage { blob: Blob; w: number; h: number; name: string }

/**
 * Prepara una captura para adjuntarla a un comentario: la reduce a `maxEdge` px de lado mayor
 * y la recodifica (WebP, o JPEG si el navegador no sabe codificar WebP) hasta que quepa en `maxBytes`.
 * Los GIF pequeños se dejan tal cual para no perder la animación.
 */
export async function prepareScreenshot(file: File, maxEdge = 2560, maxBytes = 4 * 1024 * 1024): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error(IMAGE_ERROR.notAnImage);
  const bitmap = await createImageBitmap(file);
  try {
    const base = (file.name || "captura").replace(/\.[^.]+$/, "") || "captura";
    if (file.type === "image/gif" && file.size <= maxBytes) {
      return { blob: file, w: bitmap.width, h: bitmap.height, name: `${base}.gif` };
    }
    let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    let quality = 0.88;
    for (let attempt = 0; attempt < 4; attempt++) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(IMAGE_ERROR.imageFailed);
      ctx.drawImage(bitmap, 0, 0, w, h);
      let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
      if (!blob || blob.type !== "image/webp") {
        blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
      }
      if (!blob) throw new Error(IMAGE_ERROR.encodeFailed);
      if (blob.size <= maxBytes) {
        return { blob, w, h, name: `${base}.${blob.type === "image/webp" ? "webp" : "jpg"}` };
      }
      scale *= 0.75; quality = Math.max(0.7, quality - 0.06);
    }
    throw new Error(IMAGE_ERROR.imageTooBig);
  } finally {
    bitmap.close();
  }
}
