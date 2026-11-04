// A line diff between two versions of criterio.md, for the versions view: which lines one version added and which it
// took away from the one before. The common head and tail are cut first, so the LCS only runs on what changed.

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

/** Above this many changed lines on each side the LCS table gets heavy: the middle is shown as all taken out, all put in */
const MAX_LCS = 2500;

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const head: DiffLine[] = a.slice(0, start).map((text) => ({ kind: "same", text }));
  const tail: DiffLine[] = a.slice(endA).map((text) => ({ kind: "same", text }));
  const midA = a.slice(start, endA), midB = b.slice(start, endB);
  if (midA.length > MAX_LCS || midB.length > MAX_LCS) {
    return [...head, ...midA.map((text): DiffLine => ({ kind: "del", text })), ...midB.map((text): DiffLine => ({ kind: "add", text })), ...tail];
  }
  // LCS lengths from the end, one row per line of the old middle
  const n = midA.length, m = midB.length;
  const t: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = midA[i] === midB[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const mid: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (midA[i] === midB[j]) { mid.push({ kind: "same", text: midA[i] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) mid.push({ kind: "del", text: midA[i++] });
    else mid.push({ kind: "add", text: midB[j++] });
  }
  while (i < n) mid.push({ kind: "del", text: midA[i++] });
  while (j < m) mid.push({ kind: "add", text: midB[j++] });
  return [...head, ...mid, ...tail];
}
