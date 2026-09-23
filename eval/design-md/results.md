# DESIGN.md model eval

Run 2026-09-23T09:48. Same tokens and screenshot for every model.

| Site | Model | Provider | Cost | Time | Out tok (reasoning) | Colors measured | Fonts measured | Duplicates | Desc words | Ranges ok |
|---|---|---|---|---|---|---|---|---|---|---|
| 21st.dev | anthropic/claude-opus-5 | Claude Platform on AWS | $0.2004 | 71s | 4915 (467) | 8/11 | 3/3 | 0 | 139 | yes |
| 21st.dev | xiaomi/mimo-v2.6-pro | Xiaomi | $0.0239 | 474s | 27386 (23269) | 6/9 | 3/3 | 0 | 166 | yes |
| 21st.dev | openai/gpt-6-sol | OpenAI | $0.0416 | 49s | 3959 (1287) | 6/9 | 3/3 | 0 | 139 | yes |
| 21st.dev | openai/gpt-6-sol:floor | OpenAI | $0.0329 | 44s | 4077 (1387) | 3/6 | 4/4 | 1 | 150 | yes |
| 21st.dev | deepseek/deepseek-v4.1-flash | DeepInfra | $0.0035 | 118s | 5683 (1804) | 6/8 | 3/3 | 0 | 162 | yes |
| craigmod.com | anthropic/claude-opus-5 | Claude Platform on AWS | $0.1686 | 60s | 4188 (0) | 10/11 | 2/2 | 0 | 147 | yes |
| craigmod.com | xiaomi/mimo-v2.6-pro | Xiaomi | $0.0084 | 124s | 6382 (2969) | 9/11 | 2/2 | 0 | 159 | yes |
| craigmod.com | openai/gpt-6-sol | OpenAI | $0.0459 | 38s | 3101 (516) | 9/10 | 0/2 | 0 | 143 | yes |
| craigmod.com | openai/gpt-6-sol:floor | OpenAI | $0.0226 | 27s | 3021 (516) | 9/9 | 2/2 | 0 | 151 | yes |
| craigmod.com | deepseek/deepseek-v4.1-flash | DeepInfra | $0.0029 | 107s | 4899 (1835) | 10/10 | 2/2 | 0 | 159 | yes |
| notboring.software | anthropic/claude-opus-5 | Claude Platform on AWS | $0.1246 | 52s | 3601 (0) | 8/8 | 1/2 | 0 | 140 | yes |
| notboring.software | xiaomi/mimo-v2.6-pro | Xiaomi | $0.0082 | 138s | 6727 (3931) | 7/7 | 1/2 | 0 | 169 | yes |
| notboring.software | openai/gpt-6-sol | OpenAI | $0.0400 | 35s | 2754 (450) | 7/7 | 2/2 | 0 | 149 | yes |
| notboring.software | openai/gpt-6-sol:floor | OpenAI | $0.0198 | 23s | 2701 (256) | 7/7 | 2/2 | 0 | 156 | yes |
| notboring.software | deepseek/deepseek-v4.1-flash | AtlasCloud | $0.0065 | 46s | 4179 (1197) | 8/8 | 2/2 | 0 | 155 | yes |
| stripe.com | anthropic/claude-opus-5 | Claude Platform on AWS | $0.1541 | 56s | 4045 (0) | 11/11 | 1/1 | 0 | 150 | yes |
| stripe.com | xiaomi/mimo-v2.6-pro | – | – | – | – | – | – | – | – | failed: OpenRouter 200: Provider timed out after 16433ms |
| stripe.com | openai/gpt-6-sol | OpenAI | $0.0471 | 38s | 2821 (408) | 9/9 | 1/1 | 0 | 146 | yes |
| stripe.com | openai/gpt-6-sol:floor | OpenAI | $0.0259 | 28s | 3280 (747) | 9/9 | 2/2 | 1 | 144 | yes |
| stripe.com | deepseek/deepseek-v4.1-flash | Together | $0.0076 | 39s | 4452 (1269) | 9/9 | 1/1 | 0 | 172 | yes |
| vocabbie.app | anthropic/claude-opus-5 | Claude Platform on AWS | $0.1607 | 65s | 4660 (0) | 11/12 | 3/3 | 0 | 141 | yes |
| vocabbie.app | xiaomi/mimo-v2.6-pro | – | – | – | – | – | – | – | – | failed: OpenRouter 200: Provider timed out after 15426ms |
| vocabbie.app | openai/gpt-6-sol | OpenAI | $0.0446 | 40s | 2850 (516) | 8/8 | 1/1 | 0 | 148 | yes |
| vocabbie.app | openai/gpt-6-sol:floor | OpenAI | $0.0240 | 28s | 3190 (770) | 9/9 | 1/1 | 0 | 143 | yes |
| vocabbie.app | deepseek/deepseek-v4.1-flash | Together | $0.0086 | 38s | 5747 (2255) | 9/9 | 2/3 | 0 | 148 | yes |

## Average per model

| Model | Runs ok | Avg cost | Avg time | Total duplicates |
|---|---|---|---|---|
| anthropic/claude-opus-5 | 5/5 | $0.1617 | 61s | 0 |
| xiaomi/mimo-v2.6-pro | 3/5 | $0.0135 | 245s | 0 |
| openai/gpt-6-sol | 5/5 | $0.0439 | 40s | 0 |
| openai/gpt-6-sol:floor | 5/5 | $0.0250 | 30s | 2 |
| deepseek/deepseek-v4.1-flash | 5/5 | $0.0058 | 69s | 0 |

## Decision (2026-09-23)

DeepSeek v4.1 Flash becomes the default for DESIGN.md generation.

- $0.006 per DESIGN.md against $0.16 for Opus 5 through OpenRouter. 28 times cheaper.
- 5 of 5 runs ok, 0 repeated entries, colors and fonts grounded in the measurement as often as Opus.
- Read side by side on 21st.dev, the text is as specific as Opus. One miss: it merged the CTA blue #1436f4 into #4b73ff.
- MiMo Pro was dropped: 2 of 5 timed out, and on 21st.dev it reasoned for 23k tokens and 8 minutes.
- GPT Sol on the flex tier (`:floor`) is the fallback: $0.025, fastest, but 2 repeated entries across 5 runs.

DeepSeek is served by several providers (DeepInfra, Together, AtlasCloud, CoreWeave in this run). All of them honoured the strict schema with `require_parameters`. Watch the duplicate count if quality drops, and pin providers then.
