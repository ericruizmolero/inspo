// Cuadre diario con OpenRouter (#28): lo que hemos apuntado hoy contra lo que OpenRouter
// dice que ha cobrado hoy a nuestra llave. Si se separan más de un 1%, aviso por correo.
import "server-only";
import { totalCostSince } from "./usage";
import { fixedAdmins } from "./activity";
import { sendMail } from "./mail";

/** Por debajo de un céntimo la diferencia es ruido de redondeo, no un fallo */
const MIN_GAP_USD = 0.01;

/** Diferencia relativa entre lo nuestro y la factura. null si cuadra. */
export function drift(ours: number, billed: number): number | null {
  const gap = Math.abs(ours - billed);
  if (gap < MIN_GAP_USD) return null;
  const rel = gap / Math.max(billed, ours);
  return rel > 0.01 ? rel : null;
}

export async function checkUsage(): Promise<{ ours: number; billed: number; drift: number | null }> {
  // Las dos cifras se leen en el mismo momento y cubren lo mismo: desde las 00:00 UTC.
  // Así da igual a qué hora del día lo lance el cron.
  const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
  const [ours, res] = await Promise.all([
    totalCostSince(midnight),
    fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } }),
  ]);
  if (!res.ok) throw new Error(`OpenRouter /key ${res.status}`);
  const billed = Number((await res.json())?.data?.usage_daily ?? 0);
  const d = drift(ours, billed);

  if (d !== null) {
    const line = `Hoy (UTC) hemos apuntado $${ours.toFixed(4)} y OpenRouter ha cobrado $${billed.toFixed(4)}: ${(d * 100).toFixed(1)}% de diferencia.`;
    console.error(`usage-check: ${line}`);
    const why = "Suele ser una llamada que no pasa por recordUsage, una fila sin coste real (cost_source = estimated) o alguien usando la misma llave fuera de producción.";
    await sendMail(fixedAdmins(), "El gasto de IA no cuadra con OpenRouter", `<p>${line}</p><p>${why}</p>`, `${line}\n\n${why}`);
  }
  return { ours, billed, drift: d };
}
