// mouse-follow.js — radial-gradient pointer glow. Shared by both pages.
// index uses #card (single); portfolio uses .project-card (many). querySelectorAll
// covers both: the gradient string is byte-identical on both source pages.
export function init(selector = '.card') {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  els.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.02), var(--surface) 60%)`;
    }, { passive: true });
    el.addEventListener('mouseleave', () => { el.style.background = 'var(--surface)'; });
  });
}
