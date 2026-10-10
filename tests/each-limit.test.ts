import { expect, test } from "vitest";
import { eachLimit } from "@/lib/each-limit";

/** Resolves when `release` is called: a job whose end the test decides */
const gate = () => { let release!: () => void; const done = new Promise<void>((r) => { release = r; }); return { done, release }; };

test("the results keep the order of the items however fast each one ends", async () => {
  const gates = [gate(), gate(), gate()];
  const run = eachLimit([0, 1, 2], 3, async (i) => { await gates[i].done; return `r${i}`; });
  gates[2].release(); gates[0].release(); gates[1].release();
  expect(await run).toEqual(["r0", "r1", "r2"]);
});

test("no more than n run at once, and the next starts as soon as one ends", async () => {
  const gates = Array.from({ length: 5 }, gate);
  const started: number[] = [];
  const run = eachLimit([0, 1, 2, 3, 4], 2, async (i) => { started.push(i); await gates[i].done; return i; });
  await Promise.resolve();
  expect(started, "two start, the rest wait").toEqual([0, 1]);
  gates[1].release();
  await new Promise((r) => setTimeout(r, 0));
  expect(started, "the one that ended hands its place to the next").toEqual([0, 1, 2]);
  for (const g of gates) g.release();
  expect(await run).toEqual([0, 1, 2, 3, 4]);
});

test("an empty list answers an empty list, and a list shorter than n runs whole", async () => {
  expect(await eachLimit([], 4, async (x: number) => x)).toEqual([]);
  const started: number[] = [];
  expect(await eachLimit([1, 2], 10, async (x) => { started.push(x); return x * 2; })).toEqual([2, 4]);
  expect(started).toEqual([1, 2]);
});

test("one failure fails the whole, with the error that was thrown", async () => {
  await expect(eachLimit([1, 2, 3], 2, async (x) => { if (x === 2) throw new Error("two"); return x; })).rejects.toThrow("two");
});
