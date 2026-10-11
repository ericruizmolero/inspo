import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore marks a name kept on purpose: an argument a signature needs, a key left out of a rest
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // 45 effects read what only the browser knows (storage, media queries, the extension) after mounting so the
      // server's markup matches, or reset local state when a prop changes; each fix is a redesign that moves renders
      "react-hooks/set-state-in-effect": "off",
      // 37 reports: 16 are the latest-value ref (ref.current = value during render, read later by a callback), the house
      // pattern; the other 21 read a ref during render (InspoCard's decoded images, PolishView's arrival, BriefPanel, Editable)
      "react-hooks/refs": "off",
      // The pictures are the team's references and remote captures: <img> is deliberate, not next/image
      "@next/next/no-img-element": "off",
    },
  },
  {
    // The compiler skips InspoClient and what was split out of it on purpose (docs/design-system/desarrollo.md): these
    // say why it skips them, not what is wrong. Only the files it skips today; one it starts compiling leaves this list
    files: [
      "components/InspoClient.tsx",
      "components/ProjectModes.tsx",
      "components/RefPage.tsx",
      "components/Toast.tsx",
      "hooks/use-add-dialog.ts",
      "hooks/use-add-references.ts",
      "hooks/use-agent.ts",
      "hooks/use-board-ratios.ts",
      "hooks/use-board-search.ts",
      "hooks/use-command-palette.ts",
      "hooks/use-kept-zoom.ts",
      "hooks/use-library-sync.ts",
      "hooks/use-panel-route.ts",
      "hooks/use-polish-votes.ts",
      "hooks/use-project-actions.ts",
      "hooks/use-selection.ts",
      "hooks/use-systems.ts",
      "hooks/use-tag-watch.ts",
      "hooks/use-url-search.ts",
    ],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    ".data/**",
    ".claude/**",
    ".vercel/**",
    "extension/dist/**",
    "public/**",
    "refs/**",
    "scratchpad/**",
  ]),
]);
