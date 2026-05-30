# Design Spec — Quiles Studio Card: Design System & Structural Cleanup

**Date:** 2026-05-29
**Status:** Draft (pending swarm validation + user approval)
**Scope:** Structural cleanup + design system + accessibility. **NO SEO.**

---

## 1. Problem Statement

Two monolithic HTML files (`index.html` 810 lines / 40K, `portfolio.html` 1017 lines / 38K)
carry embedded CSS (~460 / ~548 lines) and embedded JS (~195 / ~27 lines). Audit found:

- **SSOT drift:** `portfolio.html` `:root` is missing `--surface-hover` that `index.html`
  defines (only divergent token; other 9 are identical). Verified.
- **DRY violations:** `.card` rule is **split across two blocks** (index L69 shorthand +
  L71–81 main) — not an identical duplicate, but `no-duplicate-selectors` flags it and it
  must be consolidated. Mouse-follow gradient JS copy-pasted near-verbatim in both pages
  (index L641, portfolio L1003 — differs only in selector scope). Quick-actions bar
  (4 buttons: Call/Text/WhatsApp/Email, identical in both) HTML+CSS duplicated.
  Also duplicated and NOT yet covered by extraction: `.powered-by` footer, `:focus-visible`
  block, `prefers-reduced-motion` query, `::selection` + scrollbar styling, inline SVG icons.
- **Inconsistency:** two font families (Inter 5 weights `300;400;500;600;700` + Outfit 3
  weights `500;600;700`), ad-hoc px spacing, raw `rgba()` in portfolio (49 total — ~12 are
  project-accent gradient colors, ~37 white-transparency overlays), scattered inline timings.
- **SoC:** structure + style + behavior all interleaved in single files; no enforcement.
- **Payload:** ~13.7KB (14,011 char) inline base64 JPEG photo literal in `saveContact()`
  (index L614). Asset equivalent `assets/q-contact-photo.jpg` already exists (10.3KB).
- **A11y (corrected by swarm):** `index.html` has **zero headings** (no `<h1>` at all — not
  "skips"); `portfolio.html` is actually clean (1×h1 → 11×h2, no skips). Service rows are
  non-semantic `<div>` toggles (confirmed). Decorative SVGs (5 service icons, 12 project
  marks) lack `aria-hidden`. `:focus-visible` ring and `prefers-reduced-motion` **already
  exist** (duplicated in both) — the work is consolidate + refine, not add. Reduced-motion
  is currently complete-but-blunt (universal selector). Faint gray contrast unverified.

## 2. Goals / Non-Goals

**Goals**
- Single source of truth for all design tokens (color, type, space, radius, transition, opacity).
- Eliminate DRY/SSOT/SoC violations via file extraction + shared modules/partials.
- Enforce token usage and structural rules with Stylelint (fail-on-violation).
- Meet Tier-C accessibility (semantic structure, focus, reduced-motion, AA contrast).
- Light Vite build → static `dist/` for GitHub Pages at `/card/` base path.

**Non-Goals**
- No SEO (Open Graph, canonical, manifest, favicon optimization) — explicitly dropped.
- No visual redesign beyond what token normalization + Outfit→Inter implies.
- No framework (no React/Vue/Web Components). Plain HTML/CSS/ES modules.

## 3. Decisions (locked)

| # | Decision |
|---|----------|
| Q1 | Scope: structural + design system + a11y. NO SEO. |
| Q2 | Build: Vite, multi-page, static output to `dist/` for GH Pages. |
| Q3 | Fonts: **Inter only**, drop Outfit. Weights 400/500/600/700 (drop 300). |
| Q4 | Ambient bg: Canvas on index, CSS `::before` animation on portfolio (formalized, not unified). |
| Q5 | Quick-actions bar: shared HTML partial injected at build via Vite. |
| Approach | A — Extract-and-Tokenize (not Web Components). |

> **Visible change flag (Q3):** dropping Outfit re-renders 5 heading sites (index L129/285,
> portfolio L110/252/380) in Inter. Dropping weight 300 affects index L215. Intentional; must
> be visually QA'd.

## 4. Target File Structure

```
quiles-studio-card/
├── src/
│   ├── index.html
│   ├── portfolio.html
│   ├── css/
│   │   ├── tokens.css        # :root custom props only, zero selectors
│   │   ├── base.css          # reset, body, typography defaults, shared layout primitives
│   │   ├── components.css    # .quick-actions, .service-row, .card, nav, mouse-follow gradient
│   │   ├── index.css         # index-only visual rules
│   │   └── portfolio.css     # portfolio-only visual rules
│   ├── js/
│   │   ├── canvas-bg.js      # ambient 3-node canvas animation (index only)
│   │   ├── css-bg.js         # CSS ::before ambient init (portfolio only)
│   │   ├── mouse-follow.js   # radial-gradient pointer tracking (BOTH — single source)
│   │   ├── scroll-cascade.js # EMA velocity + service-row reveals (index only)
│   │   ├── reveal.js         # IntersectionObserver fade-ins (both)
│   │   └── contact.js        # vCard generation, photo fetched from asset (index only)
│   ├── partials/
│   │   └── quick-actions.html  # shared 4-button bar (Call/Text/WhatsApp/Email)
│   └── assets/                  # logos, q-contact-photo.jpg, powered-by
├── vite.config.js
├── .stylelintrc.json
└── package.json
```

## 5. Design Tokens (`tokens.css` — the SSOT)

**Colors** (promote existing index `:root` set; add the missing `--surface-hover`):
```
--bg:#000; --surface:#0a0a0a; --surface-hover:#141414;
--border:rgba(255,255,255,.08); --border-hover:rgba(255,255,255,.15);
--text-primary:#fff; --text-secondary:rgba(255,255,255,.55);
--text-tertiary:rgba(255,255,255,.35); --accent:#fff; --glow:rgba(255,255,255,.04);
```
Portfolio's raw `rgba()` project-accent gradients → named tokens. ~12 accent-color uses
across the **11** project cards; distinct base colors observed: indigo `rgba(99,102,241)`,
violet `rgba(139,92,246)`, cyan `rgba(6,182,212)`, amber `rgba(245,158,11)`, emerald
`rgba(16,185,129)` → `--accent-indigo/violet/cyan/amber/emerald`. The ~37 white-transparency
overlays map to existing `--border`/`--glow`/`--text-*` tokens (no new tokens needed).

**Type scale** (rem): `--text-xs .75` `--text-sm .875` `--text-base 1` `--text-lg 1.125`
`--text-xl 1.5` `--text-2xl 2` `--text-3xl 2.5`. Weights: 400/500/600/700.

**Spacing** (4px base, rem): `--space-1 .25` … `--space-12 3`.

**Radius:** `--radius-sm/md/lg/full`.
**Transitions:** `--ease` + `--dur-fast/base/slow`.
**Opacity:** `--op-muted/subtle/faint`.

## 6. CSS Architecture

**Load order** (cascade-critical): `tokens.css` → `base.css` → `components.css` → page CSS.

**Dedup actions:**
- Consolidate the split `.card` rule (L69 + L71–81) into one block.
- Mouse-follow gradient styles → `components.css`.
- Quick-actions styles → `components.css` (pairs with shared partial).
- **`.powered-by` footer** → `components.css` + shared partial `partials/powered-by.html`
  (was missed in first draft; duplicated in both pages).
- **`:focus-visible` ring, `prefers-reduced-motion` query, `::selection`, scrollbar styling**
  → `base.css` (currently duplicated verbatim in both files — consolidate, don't recreate).

**Scoping rule:** shared structural class → `components.css`; one-page visual → that page's
file; anything theme-able → token, never inline.

## 7. JS Modules

Each module exports `init()`; pages call only what they need. Vite per-page entry tree-shakes.

**Behavior changes folded in:**
- vCard photo: drop ~13.7KB inline base64 → `fetch('assets/q-contact-photo.jpg')`, encode at
  call time. **`saveContact` must become `async`** (await fetch → Blob → base64, strip the
  `data:image/jpeg;base64,` prefix before the vCard `ENCODING=b` field). Net saving is modest
  (~13.7KB literal → ~10.3KB asset + 1 request); the real win is HTML cleanliness + photo
  updatable without code edit. Keep a sync fallback only if offline single-file use is needed
  (not a requirement here).
- `mouse-follow` + `reveal` become shared imports (SSOT — edit once, both pages update).
  Note: `reveal.js` (IntersectionObserver) currently exists **only in portfolio**; index uses
  `scroll-cascade`. Shared module serves portfolio; index keeps cascade. No behavior change.

**Guard rails:**
- Every animation module checks `prefers-reduced-motion` before starting.
- Observers `disconnect()` on completion (no leaks).
- No global scope pollution — module-scoped.

## 8. Accessibility (Tier-C, enforced)

Baseline corrected by swarm — current state in parentheses:

- **Add a single `<h1>`** to `index.html` (currently **zero headings** — not "skips").
  Portfolio is already clean (1×h1 → 11×h2) — leave as-is.
- Service rows → real `<button aria-expanded>` toggles (currently non-semantic `<div>`s
  toggling `.active` via JS — no keyboard support).
- Quick-actions already have `aria-label` per button (verified) — preserve through extraction.
- **Add `aria-hidden="true"`** to decorative SVGs: 5 service icons (index) + 12 project marks
  (portfolio) currently expose unlabeled SVGs to screen readers.
- Portfolio cards already `<article>` (verified) — preserve.
- `:focus-visible` ring **already exists** (duplicated) — consolidate into `base.css`, convert
  the outline color to a token.
- `prefers-reduced-motion` **already exists and is complete** (universal-selector kill) — keep
  coverage, just dedupe into `base.css`. Optional: scope by interaction type.
- Contrast: verify `--text-tertiary` (rgba .35) + glow layers hit WCAG AA — the only genuinely
  unverified a11y item (faint grays are the risk).
- Verify: axe-core manual pass in the plan's verification phase.

## 9. Tooling

**Stylelint** (`.stylelintrc.json`): `stylelint-config-standard` +
- `declaration-property-value-disallowed-list`: regex-block raw hex/rgb/hsl in value position.
- **Exclude `tokens.css`** from the color ban via `overrides` (files glob) — tokens are where
  raw values legitimately live.
- For raw px: prefer **`unit-disallowed-list: ["px"]` with `ignoreProperties`** (whitelist
  `border`/`border-width`) over fragile `1px`-only regex (swarm recommendation). `0` is
  unitless so no conflict.
- `declaration-no-important` (NOT in standard preset — enable explicitly); `no-duplicate-selectors`.
- Property ordering via **`stylelint-order`** plugin (`npm i -D stylelint-order`).

**Vite** (`vite.config.js`): multi-page input via `rollupOptions.input` (2 HTML entries).
**Constraint (swarm):** Vite treats the root `index.html` as the dev entry. Either keep
`index.html` at project root, OR set `root: 'src'` and point `input` at `src/index.html` +
`src/portfolio.html` with `build.outDir: '../dist'`. Partial injection (`vite-plugin-html`
or small custom plugin) for `quick-actions.html` + `powered-by.html`. `base: '/card/'`
(Vite auto-rewrites asset paths; keep HTML/CSS asset refs relative `assets/…`, not `/assets/…`).

**Deploy (GAP closed by swarm — was missing):** site is currently served straight from repo
root on `main` (no build, no workflow, no `gh-pages` branch, no `CNAME`/`.nojekyll`). Moving to
a `dist/` build **breaks root-serving** unless a publish path is added. Add a GitHub Actions
workflow (`.github/workflows/deploy.yml`): on push to `main` → `npm ci && npm run build` →
upload `dist/` via `actions/upload-pages-artifact` → `actions/deploy-pages`. Switch the repo's
Pages source to "GitHub Actions". Add `.nojekyll`. Add `node_modules/` + `dist/` to `.gitignore`.

**package.json scripts:** `dev`, `build`, `preview`, `lint:css`.

## 10. Acceptance Criteria

1. `.card` rule consolidated into one block; both pages share one `components.css`.
   `.powered-by`, `:focus-visible`, reduced-motion, `::selection`, scrollbar all deduped.
2. `tokens.css` is the only place colors/spacing/type/radius/transition values are defined.
3. Stylelint passes with zero raw hex/rgb/px-spacing violations in component+page CSS.
4. Single font family (Inter) loaded; no Outfit reference remains.
5. No inline base64 photo in HTML; vCard photo sourced from `assets/`.
6. `mouse-follow` and `reveal` exist as single shared modules imported by both pages.
7. `portfolio.html` `:root` no longer diverges from index (uses shared `tokens.css`).
8. `index.html` has an `<h1>`; service rows are `<button aria-expanded>`; decorative SVGs are
   `aria-hidden`; each page passes axe-core with no critical violations; reduced-motion still
   disables animation; `--text-tertiary` contrast verified ≥ WCAG AA (or token darkened).
9. `npm run build` emits static `dist/` that renders identically (modulo Outfit→Inter) at `/card/`.
10. **Deploy works end-to-end:** GitHub Actions workflow builds and publishes `dist/` to Pages;
    live `https://lucasquiles.github.io/card/` serves the built output (not stale root files).
11. No behavioral regression: vCard download (now async), scroll cascade, canvas/CSS ambient,
    mouse-follow all work.
```
