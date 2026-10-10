/** Runs `fn` over `items`, at most `n` at a time, keeping the order of the results. One rejection rejects the whole;
 *  the others already running finish on their own. */
export async function eachLimit<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}
