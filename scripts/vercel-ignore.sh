#!/usr/bin/env bash
# Vercel's ignored build step (ignoreCommand in vercel.json): exit 0 skips the deploy, exit 1 deploys.
# The app deploys when something it serves changed since the last production deployment. The other parts of the
# repo deploy on their own and never wake it: marketing-site/ (Cloudflare, with its own watch paths), extension/
# (the Chrome Web Store, by hand) and skills/ (read from GitHub). The two lists the app imports from the marketing
# site (Discover's skills and resources) are the exception.
# Vercel clones ten commits deep, so the last deployment's commit (VERCEL_GIT_PREVIOUS_SHA) can be missing; then
# the commit before HEAD stands in. A redeploy of the same commit always builds. In doubt, build.
set -u
head="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$base" ] && [ "$base" = "$head" ]; then echo "redeploy of $head: building"; exit 1; fi
if [ -z "$base" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then base="HEAD^"; fi
git cat-file -e "$base^{commit}" 2>/dev/null || { echo "no commit to compare with: building"; exit 1; }
if git diff --quiet "$base" HEAD -- . ':!marketing-site' ':!extension' ':!skills' \
  && git diff --quiet "$base" HEAD -- marketing-site/src/skills.ts marketing-site/src/resources.ts; then
  echo "nothing the app serves changed since $base: deploy skipped"
  exit 0
fi
echo "the app changed since $base: building"
exit 1
