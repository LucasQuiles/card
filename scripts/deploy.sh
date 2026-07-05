#!/usr/bin/env bash
#
# Deploy the built site to the `gh-pages` branch.
# GitHub Pages serves that branch's root at https://lucasquiles.github.io/card/.
#
# Pure git push — no GitHub Actions, no `workflow` OAuth scope required.
# Usage:  npm run deploy
#
# Release gate: runs the full `npm run verify` (lint:css + ds-verify + build)
# before publishing, so no deploy can ship design-system drift or a broken
# build. This is the local equivalent of .github/workflows/ci.yml for hosts
# whose git token lacks the `workflow` scope (can't push Actions workflows).
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Verifying (lint + ds-verify + build)…"
npm run verify

SHA="$(git rev-parse --short HEAD)"
REMOTE="$(git remote get-url origin)"

echo "→ Publishing dist/ to gh-pages (built from ${SHA})…"
cd dist
touch .nojekyll                      # tell Pages to skip Jekyll processing
git init -q
git checkout -q -b gh-pages
git add -A
git commit -qm "deploy: ${SHA}"
git push -qf "$REMOTE" gh-pages       # force: gh-pages holds only build output
cd ..
rm -rf dist/.git                      # dist/ is gitignored; drop the throwaway repo

echo "✓ Deployed ${SHA} → https://lucasquiles.github.io/card/"
