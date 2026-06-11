# Quiles Studio — Brand Assets

Legal: **Quiles Solutions LLC dba Quiles Studio**. Public brand: **Quiles Studio**.
All masters are vector (SVG). Raster exports are generated from them — never edit PNGs by hand.

## Structure
- `logo/` — the Q mark. `q-mark.svg` uses `currentColor` (inherits text color). `-white` / `-black` are fixed-fill. PNGs at 1024/512/256/128.
- `wordmark/` — mark + "Quiles Studio" lockups (horizontal, stacked). Text is outlined to paths — no font dependency.
- `favicon/` — `favicon.svg`, `.ico` (16/32/48), `favicon-16/32`, `apple-touch-icon` (180), `icon-192/512`, `icon-512-maskable`, `site.webmanifest`.
- `social/` — `og-image` (1200×630), `linkedin-banner` (1584×396), `avatar` (400×400).

## Usage rules
- **Clearspace:** keep padding ≥ the diameter of the dot on all sides.
- **Min size:** mark ≥ 24px; wordmark ≥ 120px wide.
- **Color:** white mark on dark (`#0a0a0c`/`#000`), black mark (`#0a0a0c`) on light. Monochrome only — no gradients, no recoloring the mark.
- **Don't:** stretch, rotate, add drop shadows (except the site's defined logo glow), place the white mark on a busy/light photo, or recreate the wordmark in a different font.

## Provenance
Mark reconstructed as clean vector from the original 1200² raster at 98.2% IoU (geometry: outer disc + tail + dot, counter knockout, nonzero winding). Wordmark set in Inter (SemiBold "Quiles" / Regular "Studio").
