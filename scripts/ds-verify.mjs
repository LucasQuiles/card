#!/usr/bin/env node
/* ds-verify — design-system consistency guard.
 *
 * Catches drift that Stylelint structurally cannot, keeping the landing and
 * portfolio pages on one system:
 *
 *   [E1] Dangling token references — a var(--x) whose --x is defined nowhere
 *        (typo'd token, or a token removed while a use lingered).
 *   [E2] Shared components redefined per-page — the SAME single-class selector
 *        defined in BOTH index.css and portfolio.css. Identical bodies are a
 *        hard error (copy-paste that must live in components.css); divergent
 *        bodies are a warning (a same-named component that renders differently
 *        on each page — a consistency smell to review).
 *   [E3] CSS load-order chain — every HTML page must load
 *        tokens.css -> base.css -> components.css, in that order, before its
 *        page stylesheet, so the cascade is identical across pages.
 *   [E4] Unreferenced tokens — a token defined in tokens.css that no rule
 *        consumes. The SSOT must have no dead entries: an unused token is a
 *        typo, an abandoned scale, or debt that buries real drift in noise.
 *        Add a token together with its consumer, or not yet.
 *
 * No dependencies; run via `npm run ds-verify` (and inside `npm run verify`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssDir = join(root, 'src', 'css');
const srcDir = join(root, 'src');

const read = (p) => readFileSync(p, 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const cssFiles = readdirSync(cssDir).filter((f) => f.endsWith('.css'));
const cssText = Object.fromEntries(cssFiles.map((f) => [f, read(join(cssDir, f))]));

/* Same-named components that intentionally render differently per page — a
 * reviewed, documented context-variant (like the card-vs-page radius split).
 * Listed here so the divergence guard stays quiet on known cases and only
 * alerts on NEW ones. Add here only after a deliberate decision. */
const INTENTIONAL_DIVERGENCE = new Set([
  '.footer-text', // card sub-copy (13px, centered, narrow) vs page footer copy (14px)
]);

const errors = [];
const warnings = [];

/* ── Parse only TOP-LEVEL rules (skips @media/@keyframes inner blocks) ── */
function topLevelRules(css) {
  css = stripComments(css);
  const rules = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    let sel = '';
    while (i < n && css[i] !== '{' && css[i] !== '}') sel += css[i++];
    if (i >= n) break;
    if (css[i] === '}') { i++; continue; }
    i++; // consume '{'
    sel = sel.trim();
    if (sel.startsWith('@')) {
      // at-rule with a block — skip its entire (possibly nested) body
      let depth = 1;
      while (i < n && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        i++;
      }
      continue;
    }
    let body = '';
    while (i < n && css[i] !== '}') body += css[i++];
    i++; // consume '}'
    rules.push({ sel, body });
  }
  return rules;
}

const normalizeBody = (body) =>
  body
    .split(';')
    .map((d) => d.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .sort()
    .join(';');

/* Map of single-class selector -> normalized body, for one file. */
function singleClassRules(css) {
  const map = new Map();
  for (const { sel, body } of topLevelRules(css)) {
    for (const part of sel.split(',').map((s) => s.trim())) {
      if (/^\.[a-z][a-z0-9-]*$/.test(part)) map.set(part, normalizeBody(body));
    }
  }
  return map;
}

/* ── [E1] token definitions vs references ────────────────────────────── */
const allCss = Object.values(cssText).join('\n');
const noComments = stripComments(allCss);

// Token names may contain underscores (e.g. --space-2_5, --tint-03) per the
// project's custom-property-pattern — the char class MUST include '_'.
const defined = new Set();
for (const m of noComments.matchAll(/(?:^|[{;\s])(--[a-z0-9_-]+)\s*:/g)) defined.add(m[1]);

const used = new Set();
for (const m of noComments.matchAll(/var\(\s*(--[a-z0-9_-]+)/g)) used.add(m[1]);

for (const ref of used) {
  if (!defined.has(ref)) errors.push(`[E1] dangling token: var(${ref}) is used but never defined`);
}

/* ── [E4] tokens.css-defined but never referenced ──────────────────────── */
const tokenDefs = new Set();
for (const m of stripComments(cssText['tokens.css'] || '').matchAll(/(?:^|[{;\s])(--[a-z0-9_-]+)\s*:/g)) {
  tokenDefs.add(m[1]);
}
for (const t of [...tokenDefs].filter((t) => !used.has(t)).sort()) {
  errors.push(`[E4] unreferenced token: ${t} is defined in tokens.css but consumed nowhere — wire it or remove it`);
}

/* ── [E2] shared components redefined across the two page stylesheets ─── */
const pageFiles = ['index.css', 'portfolio.css'].filter((f) => cssText[f]);
if (pageFiles.length === 2) {
  const [a, b] = pageFiles.map((f) => singleClassRules(cssText[f]));
  for (const [sel, bodyA] of a) {
    if (!b.has(sel)) continue;
    const bodyB = b.get(sel);
    if (bodyA === bodyB) {
      errors.push(`[E2] identical duplicate: '${sel}' defined the same in index.css & portfolio.css — hoist to components.css`);
    } else if (!INTENTIONAL_DIVERGENCE.has(sel)) {
      warnings.push(`same-named component '${sel}' differs between index.css & portfolio.css — confirm the divergence is intentional (allowlist in ds-verify.mjs if so)`);
    }
  }
}

/* ── [E3] CSS load-order chain in every HTML page ─────────────────────── */
const chain = ['css/tokens.css', 'css/base.css', 'css/components.css'];
for (const html of readdirSync(srcDir).filter((f) => f.endsWith('.html'))) {
  const links = [...read(join(srcDir, html)).matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]);
  let cursor = -1;
  for (const req of chain) {
    const at = links.indexOf(req);
    if (at === -1) { errors.push(`[E3] ${html} does not load ${req}`); cursor = Infinity; }
    else if (at < cursor) errors.push(`[E3] ${html} loads ${req} out of order (must be tokens -> base -> components)`);
    else cursor = at;
  }
}

/* ── report ──────────────────────────────────────────────────────────── */
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

if (errors.length) {
  console.error(`\nds-verify: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`ds-verify: OK (0 errors, ${warnings.length} warning(s))`);
