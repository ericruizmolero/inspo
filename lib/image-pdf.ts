// A picture as a one-page PDF. Anthropic's fetcher (claude.ai, the API's web_fetch) reads text, HTML and PDF and
// refuses an image; a PDF reaches the model as a document whose page it sees. So a file link handed out of the app
// (lib/file-links.ts) answers that fetcher with this (app/api/files/[...key]/route.ts).
import "server-only";

/** Anthropic's user-initiated fetcher, as it names itself */
export const wantsPdf = (userAgent: string | null) => !!userAgent && /Claude-User/i.test(userAgent);

const MAX_SIDE = 2000;

/** The picture, flattened on white and capped at 2000 px a side, as a JPEG drawn on a page of its own size */
export async function imagePdf(body: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { data: jpeg, info } = await sharp(body, { animated: false }).rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }).toColourspace("srgb").jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  const objects: (string | Buffer)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"],
    [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`],
  ];
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let at = parts[0].length;
  const offsets: number[] = [];
  objects.forEach((pieces, i) => {
    offsets.push(at);
    for (const p of [`${i + 1} 0 obj\n`, ...pieces, "\nendobj\n"]) {
      const b = typeof p === "string" ? Buffer.from(p, "latin1") : p;
      parts.push(b);
      at += b.length;
    }
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF\n`, "latin1"));
  return Buffer.concat(parts);
}
