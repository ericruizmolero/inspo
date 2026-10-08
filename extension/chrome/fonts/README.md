# Fonts

The one typeface of the Criterio design system, bundled so the popup and the import page load nothing at
runtime (the extension makes no third-party calls).

| File | Family | Axes | Source |
|---|---|---|---|
| `Satoshi-Variable.woff2` | Satoshi | wght 300 to 900 | Fontshare (api.fontshare.com) |

The file is **not in git**. Satoshi is under the ITF Free Font License (Indian Type Foundry, fontshare.com):
it may be self-hosted and embedded in our own apps, but not shared through a public repository, and it may
not be subset or converted. Run `npm run fonts` (scripts/fetch-fonts.mjs) from the repo root to download
the official file here before loading the extension unpacked or packing it for the store.
