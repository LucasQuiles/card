import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shared HTML fragments injected into both pages via `<%- name %>` tokens.
// A tiny transformIndexHtml plugin keeps this deterministic and dependency-free,
// and runs for every HTML entry (index + portfolio) in dev and build alike.
const partials = {
  quickActions: readFileSync(resolve(__dirname, 'src/partials/quick-actions.html'), 'utf-8'),
  poweredBy: readFileSync(resolve(__dirname, 'src/partials/powered-by.html'), 'utf-8'),
};

function htmlPartials() {
  return {
    name: 'html-partials',
    // `order: 'pre'` runs this BEFORE Vite's core HTML parse, so the `<%- %>`
    // tokens are replaced before parse5 (which rejects `<%`) ever sees them.
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Replacement functions (not strings) so `$` in partials is never
        // interpreted as a String.replace special pattern.
        return html
          .replace(/<%-\s*quickActions\s*-?%>/g, () => partials.quickActions)
          .replace(/<%-\s*poweredBy\s*-?%>/g, () => partials.poweredBy);
      },
    },
  };
}

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
  plugins: [htmlPartials()],
});
