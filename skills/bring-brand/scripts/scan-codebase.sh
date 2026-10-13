#!/usr/bin/env bash
# Find where a codebase defines its design system: existing design docs, theme and
# token files (Tailwind v3 config, Tailwind v4 @theme, CSS custom properties, JS/JSON
# token files), font loading, and the shared UI component folders.
# Usage: scan-codebase.sh [repo-root]   (defaults to current directory)
set -u
ROOT="${1:-.}"
cd "$ROOT" 2>/dev/null || { echo "ERROR: cannot cd to $ROOT"; exit 1; }

PRUNE=( -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" -not -path "*/.nuxt/*" -not -path "*/.output/*" -not -path "*/build/*" -not -path "*/vendor/*" -not -path "*/.design-extract/*" )
SRC=( --include="*.css" --include="*.scss" --include="*.vue" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" --include="*.html" --include="*.svelte" --include="*.astro" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.next --exclude-dir=.nuxt --exclude-dir=.output --exclude-dir=build --exclude-dir=.design-extract )

echo "== EXISTING DESIGN DOCS =="
find . -maxdepth 5 \( -iname "DESIGN.md" -o -iname "design-system*" -o -iname "*style-guide*" -o -iname "styleguide*" -o -iname "brand.md" -o -iname "brand-guide*" \) "${PRUNE[@]}" 2>/dev/null | head -10

echo
echo "== FRAMEWORK =="
if [ -f package.json ]; then
  grep -oE '"(next|nuxt|vue|react|svelte|@sveltejs/kit|astro|tailwindcss|@tailwindcss/vite|@tailwindcss/postcss|styled-components|@emotion/react|@chakra-ui/react|@mui/material|bootstrap)"\s*:\s*"[^"]*"' package.json | head -15
else
  echo "(no package.json at root)"
fi

echo
echo "== TAILWIND CONFIG (v3) =="
find . -maxdepth 3 -name "tailwind.config.*" "${PRUNE[@]}" 2>/dev/null | head -5

echo
echo "== TAILWIND v4 @theme BLOCKS =="
grep -rl "@theme" "${SRC[@]}" . 2>/dev/null | head -5

echo
echo "== CSS FILES WITH :root CUSTOM PROPERTIES =="
ROOTS=$(find . -maxdepth 6 \( -name "*.css" -o -name "*.scss" \) "${PRUNE[@]}" 2>/dev/null | head -200 | tr '\n' '\0' | xargs -0 grep -l -E ":root|@theme" 2>/dev/null | head -8)
if [ -n "$ROOTS" ]; then
  echo "$ROOTS"
  echo "-- custom property count per file --"
  echo "$ROOTS" | while IFS= read -r f; do echo "$(grep -cE -- "--[A-Za-z][A-Za-z0-9-]*:" "$f") $f"; done
fi

echo
echo "== TOKEN FILES =="
find . -maxdepth 5 \( -iname "tokens.json" -o -iname "*tokens*.ts" -o -iname "*tokens*.js" -o -iname "theme.ts" -o -iname "theme.js" -o -iname "_variables.scss" -o -iname "variables.css" \) "${PRUNE[@]}" 2>/dev/null | head -10
find . -maxdepth 5 -type d -iname "tokens" "${PRUNE[@]}" 2>/dev/null | head -5

echo
echo "== FONTS =="
grep -rhoE "fonts\.googleapis\.com/css2?\?[^\"' )]+" "${SRC[@]}" . 2>/dev/null | sort -u | head -5
grep -rhoE "@font-face|@fontsource[^\"' ]*|next/font/[a-z]+|family=[A-Za-z+]+" "${SRC[@]}" --include="package.json" . 2>/dev/null | sort | uniq -c | sort -rn | head -8
grep -rhoE "font-family:[^;}]+" --include="*.css" --include="*.scss" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . 2>/dev/null | sed 's/^[[:space:]]*//' | sort | uniq -c | sort -rn | head -8

echo
echo "== SHARED UI COMPONENTS =="
find . -maxdepth 5 -type d \( -path "*components/ui" -o -path "*components/base" -o -path "*components/primitives" -o -path "*components/common" \) "${PRUNE[@]}" 2>/dev/null | head -5
find . -maxdepth 6 \( -iname "button.*" -o -iname "Button.*" -o -iname "card.*" -o -iname "Card.*" \) "${PRUNE[@]}" 2>/dev/null | grep -vE "\.(test|spec|stories)\." | head -8

echo
echo "== MOST-USED TAILWIND COLOR / RADIUS / SHADOW CLASSES (if any) =="
grep -rhoE "\b(bg|text|border)-(primary|secondary|accent|muted|brand|ink|[a-z]+-[0-9]{2,3})\b|\brounded(-[a-z0-9]+)?\b|\bshadow(-[a-z0-9]+)?\b" "${SRC[@]}" . 2>/dev/null | sort | uniq -c | sort -rn | head -25

echo
echo "== DONE =="
