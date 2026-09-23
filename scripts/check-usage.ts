// Comprobación del cuadre con OpenRouter (#28). No es un framework de tests: assert.
//   npm run check:usage
import assert from "node:assert/strict";
import { drift } from "../lib/usage-check";

assert.equal(drift(10, 10.05), null);            // 0,5%: cuadra
assert.equal(drift(0.004, 0.012), null);         // menos de un céntimo: ruido
assert.ok((drift(10, 10.5) ?? 0) > 0.01);        // 4,8%: avisa
assert.ok((drift(0, 1) ?? 0) === 1);             // no hemos apuntado nada: avisa
console.log("check:usage ok");
