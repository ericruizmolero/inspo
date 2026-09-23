# DESIGN.md model: decision

2026-09-23. Default: `deepseek/deepseek-v4.1-flash`. Latest numbers: `results-2026-09-23-10-51.md`.

The reference is Opus 5 output we already had: the 21st.dev demo, plus the Opus runs of the first eval for the other 4 sites (`<site>/reference-opus.md`). Opus never runs in the eval again.

| | Cost per sheet | Close to Opus | Field errors | Time |
|---|---|---|---|---|
| Opus 5 (reference) | $0.162 | 100 | 0 | 61s |
| DeepSeek v4.1 Flash | $0.0046 | 82 | 0 | 79s |
| GPT Sol, flex tier (`:floor`) | $0.0245 | 79 | 1 | 25s |
| MiMo v2.6 Flash | $0.0025 | 86 | 1 | 88s, failed 3 of 5 |
| MiMo v2.6 Pro | $0.014 | not scored | many | failed 2 of 5, one run took 8 minutes |

"Close to Opus" compares values only: colors, type scale sizes, font families, theme and density.

## What moved the cheap models close

- The prompt and schema now ask for CSS-ready values: unitless line heights, ASCII minus, the exact family name.
- `normalizeSpec` fixes the same slips in code, for any model.
- `extractDesign` converts oklch() colors to hex. Tailwind v4 sites report oklch and the models converted it wrong in their head.
- The prompt says the screenshot is only the first 900px. DeepSeek had called a big yellow section color "logo only".

## What DeepSeek still does worse than Opus

Judgment in the prose, not values. On notboring.software the color table is right but the description still calls the yellow a small logo mark. Worth a spot check when a sheet reads off, and the reason GPT Sol flex stays the fallback.
