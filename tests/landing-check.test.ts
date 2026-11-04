import { expect, test } from "vitest";
import { landingFindings, type PageFacts } from "@/lib/landing-check-core";

const page = (o: Partial<PageFacts> = {}): PageFacts => ({ width: 1440, h1: "Book a call", firstScreen: "", actions: [{ text: "Book a call", top: 300 }], viewportHeight: 900, scrollWidth: 1440, images: 2, brokenImages: 0, text: "Book a call", ...o });
const phone = (o: Partial<PageFacts> = {}) => page({ width: 390, viewportHeight: 844, scrollWidth: 390, ...o });
const failed = (d: PageFacts, p: PageFacts) => landingFindings(d, p).filter((f) => !f.ok).map((f) => f.rule);

test("a landing with one action, on the phone's first screen, passes", () => {
  expect(failed(page(), phone())).toEqual([]);
});

test("the same action twice is one, and three different ones fail", () => {
  expect(failed(page({ actions: [{ text: "Book a call", top: 1 }, { text: "book a  call", top: 900 }] }), phone())).toEqual([]);
  expect(failed(page({ actions: ["A", "B", "C"].map((text, i) => ({ text, top: i })) }), phone())).toEqual(["landing-one-action"]);
  expect(failed(page({ actions: [] }), phone())).toEqual(["landing-one-action"]);
});

test("an action below a phone's first screen fails", () => {
  expect(failed(page(), phone({ actions: [{ text: "Book a call", top: 1400 }] }))).toEqual(["landing-action-first-screen-phone"]);
});

test("no headline, an overflowing phone page, broken pictures and marks left all fail", () => {
  expect(failed(page({ h1: " " }), phone())).toEqual(["landing-headline"]);
  expect(failed(page(), phone({ scrollWidth: 620 }))).toEqual(["landing-phone-fits"]);
  expect(failed(page({ brokenImages: 1 }), phone())).toEqual(["landing-images-load"]);
  expect(failed(page({ text: "Trusted by [falta prueba: clientes]" }), phone())).toEqual(["landing-no-marks-left"]);
  expect(failed(page({ text: "Status: Todo, In progress" }), phone()), "a product's own word is not a mark").toEqual([]);
});
