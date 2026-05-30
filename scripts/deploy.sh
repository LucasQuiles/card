#!/usr/bin/env bash
#
# Deploy the built site to the `gh-pages` branch.
# GitHub Pages serves that branch's root at https://lucasquiles.github.io/card/.
#
# Pure git push — no GitHub Actions, no `workflow` OAuth scope required.
# Usage:  npm run deploy
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Building…"
npm run build

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
