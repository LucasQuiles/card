# Quiles Studio — Digital Business Card

Static two-page card (index + portfolio) live at
**https://lucasquiles.github.io/card/**

## Stack

- Vite multi-page build, `base=/card/`
- Design-token SSOT in `src/css/tokens.css` (only file allowed raw values)
- Stylelint enforces tokens (no raw hex/rgb, no stray `px`, no `!important`)
- Native ES modules; `prefers-reduced-motion` guards throughout
- WCAG AA verified (axe-core, 0 violations)

## Develop

```bash
npm install
npm run dev          # local dev server
npm run lint:css     # token + style enforcement (must be 0 violations)
npm run build        # → dist/
npm run preview      # serve the production build
```

## Deploy

GitHub Pages serves the **`gh-pages`** branch root at `/card/`.
Deployment is a plain `git push` — no GitHub Actions, no special token scopes:

```bash
npm run deploy       # builds, then publishes dist/ to gh-pages
```

`scripts/deploy.sh` builds the site and force-pushes the output to `gh-pages`
(a build-artifact branch — `main` stays pure source). Pages picks it up within
~1 minute.

To repoint Pages after a fresh clone: **Settings → Pages → Source: Deploy from a
branch → `gh-pages` / `(root)`** — or via API:

```bash
gh api -X PUT repos/LucasQuiles/card/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'
```
