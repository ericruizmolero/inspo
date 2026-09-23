import Papa from "papaparse";
import { InspoItem } from "@/types/inspo";

export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSYxOmyzlQFtXKHcWSr2WdhcdvUWB7GLgg_bZ9gjPPgbW9gVUAwKMMmOGyt0XAWGbRq-GPQmogZ-sYo/pub?gid=488810270&single=true&output=csv";

function extractFirstUrl(raw: string): string {
  const match = raw.match(/https?:\/\/[^\s,，]+/);
  return match ? match[0].replace(/\/$/, "") : raw.trim();
}

function normalizeAddedBy(val: string): InspoItem["addedBy"] {
  const v = val?.trim();
  if (v === "Eric") return "Eric";
  if (v === "Andoni") return "Andoni";
  return "Both";
}

function normalizeType(val: string): InspoItem["type"] {
  const v = val?.trim();
  if (v === "Videos") return "videos";
  if (v === "Ideas") return "ideas";
  if (v === "Documentales") return "documentaries";
  return "inspiration";
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
      name: row[1]?.trim() ?? "",
      web: extractFirstUrl(row[2] ?? ""),
      date: row[3]?.trim() ?? "",
      addedBy: normalizeAddedBy(row[4] ?? ""),
      type: normalizeType(row[5] ?? ""),
      note: row[6]?.trim() ?? "",
      subNote: row[7]?.trim() || undefined,
    }));
}
