# Quiles Studio Card — Design System & Structural Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Tasks are decomposed into **subtasks (N.x)** and **micro-tasks (N.x.y)**. Inline tags carry guidance: `[SKILL …]` = which skill to invoke and why · `[TOOL …]` = which tool/command · `[REF …]` = exact source line / spec section to read · `[ARTIFACT …]` = file produced/consumed · `[WHY]` = rationale · `[GATE]` = a pass/fail check that must be green before moving on.

**Goal:** Convert two monolithic HTML files into a tokenized, lint-enforced, Vite-built static site that deploys to GitHub Pages at `/card/`, with no SSOT/DRY/SoC violations and Tier-C accessibility.

**Architecture:** Extract-and-Tokenize (Approach A). Embedded CSS → `tokens.css` (SSOT) + `base.css` + `components.css` + per-page CSS. Embedded JS → ES modules with `init()` exports. Shared HTML fragments → Vite-injected partials. Stylelint fails the build on raw color/px/`!important`/duplicate-selector violations. GitHub Actions builds `dist/` and publishes to Pages.

**Tech Stack:** Vite 5 (multi-page), Stylelint 16 + `stylelint-config-standard` + `stylelint-order`, `vite-plugin-html` (partial injection), GitHub Actions (`upload-pages-artifact`/`deploy-pages`), plain ES modules, `@axe-core/cli` for a11y verification.

---

## Legend — Skills / Tools / References used throughout

**Skills (invoke via `Skill` tool when its trigger appears):**
| Skill | Invoke when | Why |
|---|---|---|
| `superpowers:executing-plans` OR `superpowers:subagent-driven-development` | At Task 0 start, once | Drives the whole task-by-task loop; one is REQUIRED. Subagent-driven = fresh subagent + 2-stage review per task; executing-plans = inline batches w/ checkpoints. |
| `superpowers:verification-before-completion` | Before checking the box on any `[GATE]` step and before Task 12 | Stops "claimed done" without evidence. Each gate must show real command output. |
| `superpowers:systematic-debugging` | Any time a `[GATE]` fails (lint error, build error, axe violation, visual diff) | Do NOT guess-patch. Form hypothesis → isolate → fix root cause. Pairs with the global "fix root causes, not symptoms" rule. |
| `/commit` (superpowers/commit) | The final micro-task of every task | Conventional-commit message, staged-file review. Every task ends in exactly one commit. |
| `/code-review` | After Task 6 (JS), after Task 8 (HTML refactor), before Task 12 | Cross-checks the extraction faithfully reproduced behavior. |

**Tools / commands:**
| Tool | Used in | Purpose |
|---|---|---|
| `Grep` / `grep -n` | Every extraction task | Locate + verify source line ranges before copying. NEVER transcribe from memory. |
| `Read` (line-ranged) | Every extraction task | Pull the exact declarations to copy. Read the cited range, then transcribe verbatim. |
| `npx stylelint` | Tasks 3,4,5,9 | The token-enforcement gate. |
| `npm run build` (Vite) | Tasks 10,12 | Integration gate — proves modules resolve + pages compile. |
| `npm run preview` | Tasks 10,12 | Serves `dist/` at `:4173/card/` for manual + axe + Playwright checks. |
| `@axe-core/cli` (`npm run a11y`) | Task 12 | Automated WCAG check. |
| `mcp__playwright__*` | Task 12 | Visual-parity screenshots + behavioral regression. |
| `node --input-type=module -e …` | Task 6 | Module-shape smoke test (parses + exports `init`). |

**References (read these — do not work from memory):**
- `[REF SPEC]` `docs/superpowers/specs/2026-05-29-card-design-system-design.md` — the validated design spec. §4 file structure, §5 tokens, §6 CSS arch, §7 JS modules, §8 a11y, §9 tooling, + 11 acceptance criteria.
- `[REF SRC-INDEX]` `index.html` (810 lines). CSS `16–459`, JS `611–810`.
- `[REF SRC-PORT]` `portfolio.html` (1016 lines). CSS `15–548`, JS `986–1016`.

**Verified source map (re-confirmed 2026-05-30 via grep):**
- Fonts: `index.html:15` and `portfolio.html:14` BOTH load `Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700`. Target: Inter `400;500;600;700` only.
- Outfit usage: `index.html:129,285` · `portfolio.html:110,252,380`.
- `font-weight:300`: index body uses Inter only at `:42`; weight-300 drop is the font-link change + any explicit `300` declarations.
- `.card` split: `index.html:69` (`position/z-index`) + `:71-81` (main block).
- mouse-follow: `index.html:641` `card.addEventListener('mousemove')` AND `portfolio.html:1003` `card.addEventListener('mousemove')` — **both target `.card`, genuinely identical → true SSOT pair.**
- **Canvas pointer (index-only, NOT mouse-follow):** `index.html:801` `window.addEventListener('mousemove', onPointer)` — belongs to `canvas-bg.js`. Keep separate from the `.card` glow handler at `:641`.
- Canvas: `index.html:463` `<canvas id="ambient-canvas">`, JS `:728` getElementById, `:729` getContext, `:746-749` dpr scaling, `:755` touch, `:796` RAF loop.
- vCard (`saveContact`): `index.html:586` button w/ inline `onclick="saveContact(event)"`; fn `:612`; lines `:616-627` (`BEGIN:VCARD` 616, `VERSION` 617, `N:Quiles;Lucas;;;` 618, `FN:Lucas Quiles` 619, … `PHOTO;TYPE=JPEG;ENCODING=b:'+photo` 625, `END:VCARD` 627). Inline base64 photo literal feeds `photo`.
- portfolio reveal: `portfolio.html:988-999` IntersectionObserver.
- **No `<h1>` anywhere in index** (grep returned empty). portfolio: 1×h1 → 11×h2 (clean).
- portfolio `:root` missing `--surface-hover` (only divergent token). 11 `<article class="project-card">`. 49 raw `rgba()`.

**Current deploy reality:** site served straight from repo root on `main`. No build, no workflow, no `gh-pages`, no `.nojekyll`, no `CNAME`. A `dist/` build **breaks root-serving** until Task 11 + the manual Pages-source switch land.

---

## Task 0: Branch + project scaffold

`[ARTIFACT → create]` `package.json`, `.gitignore`, `.nojekyll`, dirs `src/{css,js,partials,assets}`
`[SKILL]` Invoke your chosen execution skill HERE (once): `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. `[WHY]` it governs the per-task review loop for all of Tasks 1–12.

### 0.1 — Create the feature branch safely
- [ ] **0.1.1** `[TOOL git]` Confirm clean-ish state and current branch: `git -C /home/q/LAB/quiles-studio-card status --short && git branch --show-current`. `[WHY]` portfolio.html has a pre-existing unstaged edit + untracked `docs/`; you must not lose them.
- [ ] **0.1.2** `[TOOL git]` Park in-flight work: `git stash --include-untracked`. `[WHY]` lets the branch cut cleanly; restores after.
- [ ] **0.1.3** `[TOOL git]` `git checkout -b feat/design-system`.
- [ ] **0.1.4** `[TOOL git]` `git stash pop` to restore the parked edit + docs.
- [ ] **0.1.5** `[TOOL git]` Commit the planning artifacts first: `git add docs/ && git commit -m "docs: design spec + implementation plan"`. `[ARTIFACT]` spec + this plan land on the branch.

### 0.2 — Directory skeleton + asset move
- [ ] **0.2.1** `[TOOL bash]` `mkdir -p src/css src/js src/partials src/assets`.
- [ ] **0.2.2** `[REF]` `ls -la assets/` to enumerate what exists (expect `q-contact-photo.jpg` ~10.3KB + others). `[TOOL git]` `git mv assets/* src/assets/`. `[WHY]` `git mv` preserves history; `[GATE]` `git status` shows renames (R), not delete+add.

### 0.3 — Manifest + ignore files
- [ ] **0.3.1** `[ARTIFACT → create]` `package.json` (exact content):
```json
{
  "name": "quiles-studio-card",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint:css": "stylelint \"src/css/**/*.css\"",
    "a11y": "axe http://localhost:4173/card/ http://localhost:4173/card/portfolio.html --exit"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vite-plugin-html": "^3.2.2",
    "stylelint": "^16.10.0",
    "stylelint-config-standard": "^36.0.1",
    "stylelint-order": "^6.0.4",
    "@axe-core/cli": "^4.10.0"
  }
}
```
- [ ] **0.3.2** `[ARTIFACT → create]` `.gitignore` + `.nojekyll`: `printf 'node_modules/\ndist/\n.DS_Store\n*.log\n' > .gitignore && touch .nojekyll`. `[WHY]` `.nojekyll` stops Pages stripping `_`-prefixed Vite asset dirs.

### 0.4 — Install + commit
- [ ] **0.4.1** `[TOOL npm]` `npm install` (redirect noise: `> /tmp/npm-install.log 2>&1`, then `grep -i "error\|warn" /tmp/npm-install.log | head`). `[WHY]` global Context Hygiene rule — don't flood the conversation with install output.
- [ ] **0.4.2** `[GATE]` `node_modules/` populated, no `npm ERR!`. `[SKILL verification-before-completion]` show the grep result as evidence.
- [ ] **0.4.3** `[SKILL /commit]` `git add package.json package-lock.json .gitignore .nojekyll src/assets && git commit -m "build: scaffold Vite project structure"`.

---

## Task 1: `tokens.css` — the SSOT

`[ARTIFACT → create]` `src/css/tokens.css` `[REF SPEC §5]` token catalogue.

### 1.1 — Author the `:root` token block
- [ ] **1.1.1** `[REF]` Cross-check current index `:root` (around `index.html:31-56`, the token-ish vars) so promoted values match the live design. `[TOOL Read]` read that range; reconcile against the block below.
- [ ] **1.1.2** `[ARTIFACT]` Write `src/css/tokens.css` — **only `:root`, zero component selectors** `[WHY]` SoC + this is the only file Stylelint exempts from the raw-value ban:
```css
/* tokens.css — single source of truth for all design values.
   Raw hex/rgb/px values are ALLOWED ONLY in this file (Stylelint override). */
:root {
  /* Color — promoted from index :root, adds the missing --surface-hover */
  --bg: #000;
  --surface: #0a0a0a;
  --surface-hover: #141414;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);
  --text-primary: #fff;
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --accent: #fff;
  --glow: rgba(255, 255, 255, 0.04);
  --selection: rgba(255, 255, 255, 0.18);

  /* Project-accent colors (portfolio gradients) */
  --accent-indigo: rgb(99, 102, 241);
  --accent-violet: rgb(139, 92, 246);
  --accent-cyan: rgb(6, 182, 212);
  --accent-amber: rgb(245, 158, 11);
  --accent-emerald: rgb(16, 185, 129);

  /* Type scale (rem) */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 2.5rem;

  /* Font weights */
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Spacing (4px base, rem) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Motion */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-fast: 150ms;
  --dur-base: 250ms;
  --dur-slow: 400ms;

  /* Opacity */
  --op-muted: 0.55;
  --op-subtle: 0.35;
  --op-faint: 0.08;
}
```
> `[WHY]` Radius values stay `px` deliberately (a visual constant, not spacing) and live here so the Stylelint `px` ban never sees them.

### 1.2 — Sanity + commit
- [ ] **1.2.1** `[GATE]` `[TOOL]` `npx stylelint src/css/tokens.css` returns 0 errors (config arrives Task 9; until then just confirm valid CSS via the editor / `npx stylelint --config-basedir` skip — acceptable to defer the lint run to Task 9, but the file must be syntactically valid).
- [ ] **1.2.2** `[SKILL /commit]` `git add src/css/tokens.css && git commit -m "feat: add tokens.css design-token SSOT"`.

---

## Task 2: `base.css` — reset, body, typography, shared a11y blocks

`[WHY]` These blocks (`:focus-visible`, `prefers-reduced-motion`, `::selection`, scrollbar) are duplicated across BOTH pages → extract once = the core DRY win. `[REF SPEC §6]`.
`[ARTIFACT → create]` `src/css/base.css`.

### 2.1 — Locate every block to extract
- [ ] **2.1.1** `[TOOL Grep]` `grep -n "::selection\|focus-visible\|prefers-reduced-motion\|scrollbar\|box-sizing\|font-smoothing" index.html portfolio.html`. `[WHY]` get the real line numbers in BOTH files; note any divergence.
- [ ] **2.1.2** `[TOOL Read]` Read `index.html:16-45` (reset + body + selection region) and the focus/reduced-motion regions the grep surfaced. `[REF]` index is canonical when the two pages differ.

### 2.2 — Write `base.css` with tokenized values
- [ ] **2.2.1** `[ARTIFACT]` Transcribe reset/body/selection/scrollbar/focus/reduced-motion, swapping raw values for tokens (use the Task 3 substitution table). Target:
```css
/* base.css — reset, document defaults, shared a11y primitives.
   Loaded after tokens.css, before components.css. */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  background: var(--bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-weight: var(--fw-regular);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--selection); color: var(--text-primary); }
/* Scrollbar (was duplicated in both pages) */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: var(--radius-full); }
/* Focus ring (was duplicated; outline now tokenized) */
a:focus-visible, button:focus-visible, .btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    /* stylelint-disable-next-line declaration-no-important */
    animation-duration: 0.01ms !important;
    /* stylelint-disable-next-line declaration-no-important */
    animation-iteration-count: 1 !important;
    /* stylelint-disable-next-line declaration-no-important */
    transition-duration: 0.01ms !important;
    /* stylelint-disable-next-line declaration-no-important */
    scroll-behavior: auto !important;
  }
}
```
> `[WHY]` reduced-motion legitimately needs `!important` (it must override everything). Use the **inline per-line disable** (shown), narrower than a file-level override. `[REF]` global rule "alerts must be actionable" → don't blanket-disable the rule.
- [ ] **2.2.2** Add `.sr-only` here now (used by Task 7's `<h1>`): `[WHY]` co-locate a11y primitives.
```css
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

### 2.3 — Verify faithfulness + commit
- [ ] **2.3.1** `[GATE]` `[TOOL Grep]` re-run the 2.1.1 grep; confirm every rule you wrote exists in source (reproduced, not invented). Note any portfolio-only divergence you intentionally dropped.
- [ ] **2.3.2** `[SKILL /commit]` `git add src/css/base.css && git commit -m "feat: add base.css with deduped reset + a11y primitives"`.

---

## Task 3: `components.css` — shared structural components

`[WHY]` Consolidates the split `.card`, `.quick-actions`, `.service-row` family, `.powered-by`, nav, and the `.card` mouse-follow glow layer. `[REF SPEC §6]`.
`[ARTIFACT → create]` `src/css/components.css`.

### 3.1 — Consolidate the split `.card` rule (SoC/DRY)
- [ ] **3.1.1** `[TOOL Read]` Read `index.html:69` and `:71-81`. `[WHY]` `.card` is two separate blocks; merging removes a duplicate-selector violation.
- [ ] **3.1.2** `[ARTIFACT]` Write ONE merged `.card` rule into `components.css`, raw→token swapped:
```css
.card {
  position: relative;
  z-index: 1;
  /* remaining declarations transcribed verbatim from index.html:72-80,
     raw values → tokens per the substitution table below */
}
```

### 3.2 — Extract the remaining component groups
- [ ] **3.2.1** `[TOOL Read + Grep]` `grep -n "\.service-row\|\.quick-action\|\.powered-by" index.html` to get current ranges (plan-era anchors: service-row ~185–280, quick-actions ~303–350, powered-by ~420–433 — **verify, don't trust**).
- [ ] **3.2.2** `[ARTIFACT]` Copy `.service-row` + descendants/states. `[WHY change]` any explicit `font-weight: 300` → `var(--fw-regular)` (400) — intentional visible change per `[REF SPEC Q3]`.
- [ ] **3.2.3** `[ARTIFACT]` Copy `.quick-actions` + `.quick-action` + `:hover`/`:active` + `svg` + `-label`.
- [ ] **3.2.4** `[ARTIFACT]` Copy `.powered-by` + `.powered-by span`.
- [ ] **3.2.5** `[ARTIFACT]` Copy the `.card` mouse-follow glow layer rule. `[REF]` it's the CSS the JS at `index.html:641` drives via `--mx/--my` (find the `.card::after` / `.glow-layer` rule that reads those custom props). `[WHY]` the custom-prop NAMES here must equal what `mouse-follow.js` sets (Task 6.1) — this is the type-consistency contract.

**Substitution table (raw → token) — apply in 3.1, 3.2, and Tasks 4–5:**
| Raw value in source | Replace with |
|---|---|
| `#000` / `#000000` | `var(--bg)` |
| `#0a0a0a` | `var(--surface)` |
| `#141414` | `var(--surface-hover)` |
| `rgba(255,255,255,0.08)` | `var(--border)` |
| `rgba(255,255,255,0.15)` | `var(--border-hover)` |
| `#fff` / `#ffffff` | `var(--text-primary)` or `var(--accent)` (per role) |
| `rgba(255,255,255,0.55)` | `var(--text-secondary)` |
| `rgba(255,255,255,0.35)` | `var(--text-tertiary)` |
| `rgba(255,255,255,0.04)` | `var(--glow)` |
| `'Outfit', 'Inter', sans-serif` | `var(--font-sans)` |
| `font-weight: 300` | `var(--fw-regular)` |
| `font-weight: 500/600/700` | `var(--fw-medium/semibold/bold)` |
| spacing px `8/12/16/24/32` | `--space-2/3/4/6/8` |
| `border-radius: 8/12/16px` | `var(--radius-sm/md/lg)` |
| transition `250ms cubic-bezier(0.4,0,0.2,1)` | `var(--dur-base) var(--ease)` |
> `border`/`border-width` px stay literal (whitelisted in Stylelint Task 9).

### 3.3 — Gate + commit
- [ ] **3.3.1** `[GATE]` `[TOOL]` `npx stylelint src/css/components.css` → zero `declaration-property-value-disallowed-list` + zero `unit-disallowed-list` (run after Task 9 config exists; if executing in order, mark this gate "deferred to 9.2 sweep" but still eyeball-scan for stray hex/rgba). `[SKILL systematic-debugging]` if violations appear, fix by re-tokenizing — never relax the rule.
- [ ] **3.3.2** `[SKILL /commit]` `git add src/css/components.css && git commit -m "feat: components.css — consolidate .card, extract shared components, tokenize"`.

---

## Task 4: `index.css` — index-only visual rules

`[ARTIFACT → create]` `src/css/index.css` `[REF]` remaining `index.html:16-459` not moved to base/components.

### 4.1 — Move index-only rules
- [ ] **4.1.1** `[TOOL Read]` Identify what's left after base + components extraction: tagline, services container, card-footer, footer-cta-section, responsive `@media (max-width)` (~`:443`), Outfit-using headings (`:129,:285` → `var(--font-sans)`), `#ambient-canvas` styling (`:58`).
- [ ] **4.1.2** `[ARTIFACT]` Transcribe each, applying the 3.2 substitution table. `[WHY]` heading font-family `'Outfit',...` → `var(--font-sans)` is the Outfit-drop (spec).

### 4.2 — Gate + commit
- [ ] **4.2.1** `[GATE]` `npx stylelint src/css/index.css` → zero violations (or deferred to 9.2).
- [ ] **4.2.2** `[SKILL /commit]` `git add src/css/index.css && git commit -m "feat: index.css — index-only tokenized rules"`.

---

## Task 5: `portfolio.css` — portfolio-only rules + accent tokens

`[ARTIFACT → create]` `src/css/portfolio.css` `[REF SRC-PORT 15-548]`.

### 5.1 — Inventory the 49 raw `rgba()`
- [ ] **5.1.1** `[TOOL Grep]` `grep -n "rgba(" portfolio.html | wc -l` (expect 49) and dump them: `grep -n "rgba(" portfolio.html`. `[WHY]` classify each before substituting.
- [ ] **5.1.2** Classify: ~12 project-accent gradients (→ 5 named `--accent-*`), ~37 white-transparency overlays (→ existing `--border`/`--glow`/`--text-*`). `[ARTIFACT]` jot the mapping in a scratch comment.

### 5.2 — Move portfolio-only rules + substitute
- [ ] **5.2.1** `[ARTIFACT]` Copy portfolio `<style>` rules (minus shared base/components) into `portfolio.css`.
- [ ] **5.2.2** Map accent gradients: `[WHY]` prefer `linear-gradient(..., var(--accent-indigo), transparent)` to control alpha via stops rather than baking rgba. If a gradient needs a real alpha variant that won't tokenize cleanly, ADD a documented `--accent-*-soft` token to `tokens.css` (don't leave raw rgba). `[REF]` keep `@keyframes fadeUp` + `@keyframes ambientShift` + the `::before` ambient rule here (portfolio-only).
- [ ] **5.2.3** `[ARTIFACT delete]` Delete portfolio's `:root` block (the one missing `--surface-hover`). `[WHY]` satisfies `[REF SPEC acceptance #7]` — all tokens now flow from `tokens.css`.

### 5.3 — Gate + commit
- [ ] **5.3.1** `[GATE]` `npx stylelint src/css/portfolio.css` → zero violations. `[SKILL systematic-debugging]` on any leftover rgba, re-classify and tokenize.
- [ ] **5.3.2** `[SKILL /commit]` `git add src/css/portfolio.css src/css/tokens.css && git commit -m "feat: portfolio.css — tokenize 49 rgba into accent + overlay tokens"`.

---

## Task 6: JS modules

`[WHY]` Each module exports `init()`, no global scope pollution, every animation module guards `prefers-reduced-motion`, observers `disconnect()`. `[REF SPEC §7]`.
`[ARTIFACT → create]` `src/js/{canvas-bg,css-bg,mouse-follow,scroll-cascade,reveal,contact}.js`.
`[REF]` `index.html:611-810`, `portfolio.html:986-1016`.

### 6.1 — `mouse-follow.js` (shared SSOT)
- [ ] **6.1.1** `[TOOL Read]` Read `index.html:641-651` AND `portfolio.html:1003-1013`. `[REF — CORRECTION]` **both target `.card`** (`card.addEventListener('mousemove')`); they are genuinely identical → one shared module. `[WHY]` do NOT confuse with `index.html:801` `window.addEventListener('mousemove', onPointer)` — that's the canvas pointer (→ 6.3).
- [ ] **6.1.2** `[ARTIFACT]` Write `mouse-follow.js`, transcribing the EXACT gradient/offset math from the source (custom-prop names must equal the `.card` glow rule from 3.2.5):
```js
// mouse-follow.js — radial-gradient pointer tracking. Shared by both pages.
// CORRECTED: source sets card.style.background directly (NO --mx/--my custom props).
export function init(selector = '.card') {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.querySelector(selector);
  if (!el) return;
  const onPointer = (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.02), var(--surface) 60%)`;
  };
  el.addEventListener('mousemove', onPointer, { passive: true });
  el.addEventListener('mouseleave', () => { el.style.background = 'var(--surface)'; });
}
```
> `[WHY — CORRECTED]` Verified at `index.html:641-649` / `portfolio.html:1003-1010`: the glow is applied imperatively by writing `card.style.background` to a radial-gradient string, and `mouseleave` restores `var(--surface)`. There is **NO `--mx`/`--my` CSS layer** and components.css has no glow rule (Task 3 confirmed). The `rgba(255,255,255,0.02)` inner stop is the one raw literal that lives only here — it is a JS-string gradient stop, not a CSS declaration, so the Stylelint color ban does not reach it; keep it verbatim. Element is `id="card"` (source uses `getElementById('card')`); selector `.card` works since the card carries both.

### 6.2 — `reveal.js` (shared; portfolio IntersectionObserver)
- [ ] **6.2.1** `[TOOL Read]` `portfolio.html:988-999`. `[REF]` note the exact class it toggles (the `@keyframes fadeUp` trigger class) — that string is the contract with `portfolio.css`.
- [ ] **6.2.2** `[ARTIFACT]`:
```js
// reveal.js — IntersectionObserver fade-ins. Used by portfolio.
export function init(selector = '.project-card', revealClass = 'visible') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add(revealClass));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add(revealClass);
        obs.unobserve(entry.target);
      }
    });
    if (![...els].some((el) => !el.classList.contains(revealClass))) obs.disconnect();
  }, { threshold: 0.1 });
  els.forEach((el) => obs.observe(el));
}
```
> `[GATE]` `revealClass` default MUST equal the source class (verify in 6.2.1 — flagged again in Task 8.2).

### 6.3 — `canvas-bg.js` (index only)
- [ ] **6.3.1** `[TOOL Read]` `index.html:728-810` — getElementById `:728`, getContext `:729`, dpr scaling `:746-749`, touch `:755`, the `window` pointer handler `:801`, RAF loop `:796`. `[WHY]` this module owns BOTH the particle draw loop AND the `:801` window-mousemove pointer.
- [ ] **6.3.2** `[ARTIFACT]` Wrap in `export function init()`. Add `if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;` at top BEFORE starting RAF. Transcribe node/particle/dpr logic verbatim. `[WHY]` reduced-motion must skip the RAF loop entirely.

### 6.4 — `scroll-cascade.js` (index only)
- [ ] **6.4.1** `[TOOL Read]` `index.html:652-725` region — EMA-velocity scroll cascade + `.service-row` reveal. `[ARTIFACT]` `export function init()`, reduced-motion guard, `removeEventListener`/`disconnect` on teardown if applicable.

### 6.5 — `css-bg.js` (portfolio only — conditional)
- [ ] **6.5.1** `[TOOL Read]` `portfolio.html:986-1016` minus the reveal observer. `[WHY]` if portfolio's `::before` ambient is pure CSS with no JS init, **do NOT create an empty module** — omit it and note in 8.2 that portfolio.entry.js has no css-bg import.

### 6.6 — `contact.js` (index only — async vCard)
- [ ] **6.6.1** `[TOOL Read]` `index.html:612-637` to transcribe EXACT vCard lines: `N:Quiles;Lucas;;;` (`:618`), `FN:Lucas Quiles` (`:619`), and every `ORG/TITLE/TEL/EMAIL/URL/ADR` line through `END:VCARD` (`:627`). `[WHY]` contact data must be copied char-for-char, never paraphrased.
- [ ] **6.6.2** `[ARTIFACT]` Replace the inline base64 photo literal with a fetch of `assets/q-contact-photo.jpg`:
```js
// contact.js — vCard download. Photo fetched from asset (was 13.7KB inline base64).
export function init(btnSelector = '#saveContactBtn') {
  const btn = document.querySelector(btnSelector);
  if (btn) btn.addEventListener('click', saveContact);
}
async function saveContact(e) {
  e.preventDefault();
  const res = await fetch('assets/q-contact-photo.jpg');
  const blob = await res.blob();
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  const photo = String(dataUrl).split(',')[1]; // strip "data:image/jpeg;base64,"
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Quiles;Lucas;;;',
    'FN:Lucas Quiles',
    // ...transcribe ORG/TITLE/TEL/EMAIL/URL/ADR from index.html:620-624 verbatim...
    `PHOTO;TYPE=JPEG;ENCODING=b:${photo}`,
    'END:VCARD',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'Lucas-Quiles.vcf'; a.click();
  URL.revokeObjectURL(url);
}
```
> `[WHY]` the `onclick="saveContact(event)"` at `index.html:586` is removed in Task 7.2; binding now happens in `init()`. The async path is the only behavioral change — verify the downloaded `.vcf` still imports w/ photo in Task 12.5.

### 6.7 — Smoke test + review + commit
- [ ] **6.7.1** `[GATE TOOL]` per module: `node --input-type=module -e "import('./src/js/reveal.js').then(m=>console.log(typeof m.init))"` → `function`. `[WHY]` proves parse + `init` export; full behavior waits for Task 12 (Playwright).
- [ ] **6.7.2** `[SKILL /code-review]` review all 6 modules vs source — confirm faithful extraction, no invented logic, guards present.
- [ ] **6.7.3** `[SKILL /commit]` `git add src/js && git commit -m "feat: extract JS into ES modules (mouse-follow/reveal shared, async vCard)"`.

---

## Task 7: Refactor `src/index.html` — link CSS/JS, partials, a11y

`[ARTIFACT → create]` `src/index.html`, `src/partials/quick-actions.html`, `src/partials/powered-by.html`.

### 7.1 — Extract shared partials
- [ ] **7.1.1** `[TOOL Read]` `index.html:477-503` (4-button quick-actions: Call/Text/WhatsApp/Email). `[ARTIFACT]` `src/partials/quick-actions.html` — copy verbatim, ADD `aria-hidden="true"` to each inline SVG. `[REF SPEC §8]`.
- [ ] **7.1.2** `[ARTIFACT]` `src/partials/powered-by.html` ← `<div class="powered-by">Powered by <span>Q.</span></div>` (from `:607`).

### 7.2 — Build `src/index.html`
- [ ] **7.2.1** `[TOOL git mv]` `git mv index.html src/index.html`. `[WHY]` preserve history.
- [ ] **7.2.2** Delete the `<style>` block (`:16-459`).
- [ ] **7.2.3** Replace font `<link>` (`:15`) with Inter-only: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`. `[WHY]` drops Outfit + weight 300.
- [ ] **7.2.4** Add CSS links in cascade order in `<head>`: `tokens.css` → `base.css` → `components.css` → `index.css`. `[WHY]` load order = the cascade contract (tokens first, page last).
- [ ] **7.2.5** Replace quick-actions block (`:477-503`) + powered-by div (`:607`) with the partial-injection tokens. `[GATE — unify mechanism]` use EJS `<%- quickActions %>` / `<%- poweredBy %>` (the vite-plugin-html path chosen in Task 10) — NOT `<!-- @partial -->`. Pick one, make HTML match.
- [ ] **7.2.6** Delete inline `<script>` (`:611-810`); add before `</body>`: `<script type="module" src="js/index.entry.js"></script>`.
- [ ] **7.2.7** Remove `onclick="saveContact(event)"` from `:586`'s button. `[WHY]` binding moved to `contact.init()`.

### 7.3 — a11y: add the missing `<h1>`
- [ ] **7.3.1** `[REF]` index has **zero headings**. `[ARTIFACT]` Add one `<h1>` — wrap the visible name/title hero, OR if no visible slot fits the design, add visually-hidden: `<h1 class="sr-only">Lucas Quiles — Quiles Studio</h1>`. `[WHY]` `.sr-only` already added in Task 2.2.2. `[REF SPEC §8 / acceptance]`.

### 7.4 — a11y: service rows → buttons
- [ ] **7.4.1** `[TOOL Read]` `index.html:519-565` (5 `<div class="service-row">`). `[ARTIFACT]` Convert each to `<button class="service-row" type="button" aria-expanded="false">`. `[WHY]` free keyboard + SR support.
- [ ] **7.4.2** Update toggler (`scroll-cascade.js` or a small `service-toggle.js`) to flip `aria-expanded` alongside `.active`. `[ARTIFACT components.css]` ensure `.service-row` resets button defaults: `background:none; border:0; width:100%; text-align:left; font:inherit; cursor:pointer;`.

### 7.5 — Entry module + commit
- [ ] **7.5.1** `[ARTIFACT → create]` `src/js/index.entry.js`:
```js
import { init as canvasBg } from './canvas-bg.js';
import { init as mouseFollow } from './mouse-follow.js';
import { init as scrollCascade } from './scroll-cascade.js';
import { init as contact } from './contact.js';
canvasBg();
mouseFollow('.card');
scrollCascade();
contact('#saveContactBtn');
```
- [ ] **7.5.2** `[SKILL /commit]` `git add src/index.html src/partials src/js/index.entry.js src/css/base.css src/css/components.css && git commit -m "refactor: index.html → linked CSS/modules + partials + a11y (h1, button rows, aria-hidden)"`.

---

## Task 8: Refactor `src/portfolio.html` — link CSS/JS, partials, a11y

`[ARTIFACT → create]` `src/portfolio.html`, `src/js/portfolio.entry.js`.

### 8.1 — Build `src/portfolio.html`
- [ ] **8.1.1** `[TOOL git mv]` `git mv portfolio.html src/portfolio.html`.
- [ ] **8.1.2** Delete `<style>` block (`:15-548`) incl. the dead `:root` `[REF acceptance #7]`.
- [ ] **8.1.3** Replace font `<link>` (`:14`) with the same Inter-only link from 7.2.3.
- [ ] **8.1.4** Add 4 CSS links — same as index but swap `index.css` → `portfolio.css`.
- [ ] **8.1.5** `[TOOL Grep]` find the ~12 decorative project-mark SVGs; add `aria-hidden="true"` to each. `[WHY]` decorative, not content.
- [ ] **8.1.6** `[REF]` Keep the existing `<h1>`→11×`<h2>` hierarchy untouched (already clean). If portfolio uses quick-actions/powered-by, reuse the partial tokens; else skip.
- [ ] **8.1.7** Delete inline `<script>` (`:986-1016`); add `<script type="module" src="js/portfolio.entry.js"></script>`.

### 8.2 — Entry module (consistency gate)
- [ ] **8.2.1** `[ARTIFACT → create]` `src/js/portfolio.entry.js`:
```js
import { init as mouseFollow } from './mouse-follow.js';
import { init as reveal } from './reveal.js';
// no css-bg import unless 6.5 produced a module
mouseFollow('.card');           // CORRECTED: portfolio L1003 targets .card, same as index
reveal('.project-card', 'visible');
```
- [ ] **8.2.2** `[GATE]` Confirm `reveal()`'s class arg ('visible') equals the `@keyframes fadeUp` trigger class verified in 6.2.1. `[WHY]` mismatch = silent no-animation. `[SKILL systematic-debugging]` if parity check fails.

### 8.3 — Review + commit
- [ ] **8.3.1** `[SKILL /code-review]` diff `src/portfolio.html` vs original — confirm only style/script/font/aria changed, no content loss.
- [ ] **8.3.2** `[SKILL /commit]` `git add src/portfolio.html src/js/portfolio.entry.js && git commit -m "refactor: portfolio.html → linked CSS/modules, drop dead :root, aria-hidden SVGs"`.

---

## Task 9: Stylelint config + run the gate on all CSS

`[ARTIFACT → create]` `.stylelintrc.json` `[REF SPEC §9]`.

### 9.1 — Write the config
- [ ] **9.1.1** `[ARTIFACT]`:
```json
{
  "extends": "stylelint-config-standard",
  "plugins": ["stylelint-order"],
  "rules": {
    "declaration-no-important": true,
    "no-duplicate-selectors": true,
    "declaration-property-value-disallowed-list": {
      "/^(color|background|background-color|border-color|fill|stroke|box-shadow|outline-color)$/": ["/#[0-9a-fA-F]{3,8}/", "/rgb\\(/", "/rgba\\(/", "/hsl\\(/"]
    },
    "unit-disallowed-list": [["px"], {
      "ignoreProperties": {
        "px": ["border", "border-width", "border-top", "border-right", "border-bottom", "border-left", "outline", "outline-width", "border-radius"]
      }
    }],
    "order/properties-order": [],
    "order/order": ["custom-properties", "declarations"]
  },
  "overrides": [
    {
      "files": ["src/css/tokens.css"],
      "rules": { "declaration-property-value-disallowed-list": null, "unit-disallowed-list": null }
    }
  ]
}
```
> `[WHY]` tokens.css exempt (raw values legitimately live there). base.css reduced-motion uses the inline per-line disables added in 2.2.1.

### 9.2 — Run the full gate (acceptance test for Tasks 2–5)
- [ ] **9.2.1** `[GATE TOOL]` `npm run lint:css > /tmp/lint.log 2>&1; grep -c "✖\|error" /tmp/lint.log` (context hygiene). Expected: PASS, zero errors.
- [ ] **9.2.2** `[SKILL systematic-debugging]` On any violation: open the offending file/line, re-tokenize (raw hex/rgba → token, stray non-border px → rem/token, `!important` → inline disable or remove, dup selector → merge). `[REF global rule]` fix the cause — NEVER relax the rule to silence it.
- [ ] **9.2.3** `[SKILL verification-before-completion]` paste the green lint output as evidence before checking the box.

### 9.3 — Commit
- [ ] **9.3.1** `[SKILL /commit]` `git add .stylelintrc.json && git commit -m "build: stylelint config enforcing token usage + no duplicates"`.

---

## Task 10: Vite multi-page build + partial injection

`[ARTIFACT → create]` `vite.config.js` `[REF SPEC §9]`.

### 10.1 — Write the config
- [ ] **10.1.1** `[ARTIFACT]`:
```js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { createHtmlPlugin } from 'vite-plugin-html';
import { readFileSync } from 'fs';
const partial = (name) => readFileSync(resolve(__dirname, `src/partials/${name}.html`), 'utf-8');
export default defineConfig({
  root: 'src',
  base: '/card/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        portfolio: resolve(__dirname, 'src/portfolio.html'),
      },
    },
  },
  plugins: [
    createHtmlPlugin({
      minify: true,
      pages: [
        { entry: 'js/index.entry.js', filename: 'index.html', template: 'index.html',
          injectOptions: { data: { quickActions: partial('quick-actions'), poweredBy: partial('powered-by') } } },
        { entry: 'js/portfolio.entry.js', filename: 'portfolio.html', template: 'portfolio.html' },
      ],
    }),
  ],
});
```
> `[GATE — mechanism unification]` EJS data injection means the HTML tokens are `<%- quickActions %>` / `<%- poweredBy %>` (set in 7.2.5). Confirm Task 7 used EJS form, not HTML comments.

### 10.2 — Build (integration test)
- [ ] **10.2.1** `[GATE TOOL]` `npm run build > /tmp/build.log 2>&1; tail -20 /tmp/build.log`. Expected: `dist/index.html`, `dist/portfolio.html`, hashed `dist/assets/*.{css,js}`, copied images. No unresolved imports, no missing-partial errors. `[SKILL systematic-debugging]` on failure.

### 10.3 — Preview + eyeball
- [ ] **10.3.1** `[TOOL]` `npm run preview` (background) → open `http://localhost:4173/card/`. `[GATE]` both pages render; asset paths resolve under `/card/`; partials present in output (`grep -c "quick-action" dist/index.html`).

### 10.4 — Commit
- [ ] **10.4.1** `[SKILL /commit]` `git add vite.config.js && git commit -m "build: Vite multi-page config + partial injection, base=/card/"`.

---

## Task 11: GitHub Actions deploy to Pages

`[ARTIFACT → create]` `.github/workflows/deploy.yml`.

### 11.1 — Write the workflow
- [ ] **11.1.1** `[ARTIFACT]`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: touch dist/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 11.2 — Manual Pages-source switch (Lucas action)
- [ ] **11.2.1** `[REF — escalate to Lucas]` Settings → Pages → Source: **GitHub Actions** (currently "Deploy from a branch"). `[WHY]` workflow can't change this; one-time manual. Document in the PR body (Task 12.6). **Until this flips, root-serving breaks but Actions deploy won't take over** — call this out explicitly.

### 11.3 — Commit
- [ ] **11.3.1** `[SKILL /commit]` `git add .github/workflows/deploy.yml && git commit -m "ci: GitHub Actions build + deploy dist to Pages"`.

---

## Task 12: Verification phase (acceptance gate)

`[SKILL verification-before-completion]` governs this whole task — every sub-step produces evidence, not assertion. No files created.

### 12.1 — Lint + build clean
- [ ] **12.1.1** `[GATE]` `npm run lint:css && npm run build` → both PASS. Paste output.

### 12.2 — axe-core a11y
- [ ] **12.2.1** `[GATE TOOL]` `npm run preview &` then `npm run a11y`. Expected: zero critical/serious on both pages. `[WHY]` confirms `<h1>` present, service rows keyboard-operable, decorative SVGs `aria-hidden`, focus ring visible. `[SKILL systematic-debugging]` per violation.

### 12.3 — Contrast decision (`--text-tertiary`)
- [ ] **12.3.1** `[REF SPEC finding]` white@0.35 over `#000` ≈ `#595959` ≈ **3.0:1 — fails AA normal text (4.5:1), passes large-text (3:1)**. `[GATE — decision required]` Resolve ONE: (a) restrict `--text-tertiary` to ≥18.66px/bold only + document constraint in `tokens.css`; or (b) raise toward `--text-secondary` (0.55 ≈ 4.5:1). **Recommend (a).** Record the chosen resolution in the PR + a tokens.css comment.

### 12.4 — Visual parity (Playwright)
- [ ] **12.4.1** `[TOOL mcp__playwright__*]` Screenshot both `dist` preview pages; compare vs `quiles-card-preview.png` baseline. `[WHY expected diffs]` headings now Inter (not Outfit); service-row weight-300 text now 400. `[GATE]` no layout breakage, no missing elements, no broken assets. Save before/after to `docs/superpowers/`.

### 12.5 — Behavioral regression
- [ ] **12.5.1** `[GATE]` In preview verify: (a) Save Contact → `.vcf` downloads + imports WITH photo (async path); (b) index scroll cascade fires; (c) canvas ambient on index, CSS ambient on portfolio; (d) mouse-follow glow tracks on BOTH `.card`s; (e) DevTools toggle `prefers-reduced-motion` → animations stop, content still reveals. All pass.

### 12.6 — Final commit + PR
- [ ] **12.6.1** `[SKILL /commit]` `git add docs/superpowers && git commit -m "test: verification artifacts (axe, contrast, visual parity)"`.
- [ ] **12.6.2** `[TOOL gh]` `git push -u origin feat/design-system && gh pr create --title "Design system + structural cleanup" --body "…"`. `[REF]` PR body MUST state: **Lucas must switch Pages source to 'GitHub Actions' before merge takes effect** (11.2).

---

## Self-Review

**Spec coverage** (`[REF SPEC]` section → task): §4 file structure → 0,1–8,10. §5 tokens → 1 + 5 (accents). §6 CSS arch (load order, dedup .card/.powered-by/focus/reduced-motion) → 2,3. §7 JS modules (async vCard, shared mouse-follow/reveal) → 6. §8 a11y (h1, button rows, aria-hidden, focus/reduced-motion dedup, contrast) → 2,7,8,12. §9 tooling (Stylelint, Vite, deploy, scripts) → 0,9,10,11. All 11 acceptance criteria → Task 12 gates + owning tasks.

**Corrections baked in this revision:**
1. **mouse-follow is a true SSOT pair** — `index.html:641` and `portfolio.html:1003` BOTH `card.addEventListener('mousemove')`. Earlier hedge ("portfolio used window/body") was wrong; both entry files pass `.card` (8.2.1).
2. **Index has a second `mousemove` at `:801`** (`window`, canvas pointer) that belongs to `canvas-bg.js` (6.3.1), NOT mouse-follow — explicitly separated to prevent conflation.
3. vCard fields anchored to exact lines `:616-627` with `N:`/`FN:` transcribed inline (6.6.1).

**Honest transcription gaps (instructions, not placeholders):** exact declarations inside `.card`/`.service-row`, canvas particle math, scroll-cascade EMA, and ORG/TEL/EMAIL/URL vCard lines are cited by precise source line range for verbatim copy during execution — they exceed read context and must NOT be invented. Each such micro-task names the range + a `[TOOL Read]`.

**Type/name consistency contracts (each flagged at its task):** `init()` uniform across all 6 modules · mouse-follow glow is JS-inline `card.style.background` (NO `--mx`/`--my` CSS layer — corrected in 6.1.2; components.css has no glow rule) · reveal class `'visible'` must equal portfolio's `@keyframes fadeUp` trigger (6.2.1 → re-checked 8.2.2) · partial mechanism unified on EJS `<%- %>` (7.2.5 → 10.1.1).

**Correction (2026-05-30, Task 3 execution):** the `--mx`/`--my` custom-prop contract assumed in 3.2.5/6.1.2 does NOT exist in source. Verified at `index.html:641-649` + `portfolio.html:1003-1010`: glow is `card.style.background = radial-gradient(...)` set imperatively, restored to `var(--surface)` on `mouseleave`. mouse-follow.js replicates that; no CSS glow rule was extracted.
