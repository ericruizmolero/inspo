// Utilidades de imagen en el navegador.

/**
 * Reduce una imagen a un cuadrado de `size` px (recorte centrado) y la devuelve como data URL.
 * Se usa para logos: cabe en la columna `organization.logo` y no necesita almacenamiento aparte.
 */
export async function fileToSquareDataURL(file: File, size = 128): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El fichero no es una imagen");
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    // PNG conserva transparencia (logos); webp si el navegador lo soporta y queda más pequeño
    const png = canvas.toDataURL("image/png");
    const webp = canvas.toDataURL("image/webp", 0.9);
    return webp.startsWith("data:image/webp") && webp.length < png.length ? webp : png;
  } finally {
    bitmap.close();
  }
}
