import Papa from "papaparse";
import { InspoItem } from "@/types/inspo";

export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSYxOmyzlQFtXKHcWSr2WdhcdvUWB7GLgg_bZ9gjPPgbW9gVUAwKMMmOGyt0XAWGbRq-GPQmogZ-sYo/pub?gid=488810270&single=true&output=csv";

function extractFirstUrl(raw: string): string {
  const match = raw.match(/https?:\/\/[^\s,，]+/);
  return match ? match[0].replace(/\/$/, "") : raw.trim();
}

function normalizePuestoPor(val: string): InspoItem["puestoPor"] {
  const v = val?.trim();
  if (v === "Eric") return "Eric";
  if (v === "Andoni") return "Andoni";
  return "Ambos";
}

function normalizeTipo(val: string): InspoItem["tipo"] {
  const v = val?.trim();
  if (v === "Videos") return "Videos";
  if (v === "Ideas") return "Ideas";
  if (v === "Documentales") return "Documentales";
  return "Inspiración";
}

export async function fetchInspoItems(): Promise<InspoItem[]> {
  const res = await fetch(SHEET_CSV_URL, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);

  const text = await res.text();
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });

  const headerIdx = data.findIndex((row) =>
    row.some((cell) => cell.includes("Empresa/Proyecto"))
  );
  if (headerIdx === -1) return [];

  return data
    .slice(headerIdx + 1)
    .filter((row) => row[1]?.trim())
    .map((row) => ({
      empresa: row[1]?.trim() ?? "",
      web: extractFirstUrl(row[2] ?? ""),
      fecha: row[3]?.trim() ?? "",
      puestoPor: normalizePuestoPor(row[4] ?? ""),
      tipo: normalizeTipo(row[5] ?? ""),
      comentarios: row[6]?.trim() ?? "",
      subcomentarios: row[7]?.trim() || undefined,
    }));
}
