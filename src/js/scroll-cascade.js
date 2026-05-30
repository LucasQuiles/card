// scroll-cascade.js — service rows expand sequentially on scroll down, collapse
// in reverse on scroll up. Index page only. Uses EMA velocity smoothing + a
// hysteresis buffer to avoid flicker at activation boundaries.
// Reduced-motion: skip the scroll-driven cascade entirely, but still activate the
// first row and keep click-to-toggle so every row stays reachable/readable.
export function init() {
  const serviceRows = document.querySelectorAll('.service-row');
  if (!serviceRows.length) return;

  const syncExpanded = (el) => {
    el.setAttribute('aria-expanded', el.classList.contains('active') ? 'true' : 'false');
  };

  serviceRows[0].classList.add('active');
  serviceRows.forEach(syncExpanded);
  let scrollLocked = false;

  // Click toggles individual row independent of scroll state
  serviceRows.forEach((row) => {
    row.addEventListener('click', () => {
      row.classList.toggle('active');
      syncExpanded(row);
      scrollLocked = true;
      setTimeout(() => { scrollLocked = false; }, 600);
    });
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const VELOCITY_CAP = 2.5;
  const BUFFER = 25; // hysteresis to prevent flicker at boundary

  // EMA velocity smoothing
  let emaVelocity = 0;
  let lastY = window.scrollY;
  let lastT = performance.now();

  window.addEventListener('scroll', () => {
    if (ticking || scrollLocked) return;

    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) {
      const instantV = Math.abs(window.scrollY - lastY) / dt;
      emaVelocity = emaVelocity * 0.55 + instantV * 0.45;
    }
    lastY = window.scrollY;
    lastT = now;

    requestAnimationFrame(() => {
      if (emaVelocity > VELOCITY_CAP) { ticking = false; return; }

      // Graduated activation — first row triggers at 55% viewport, last at 85%
      const actBase = window.innerHeight * 0.55;
      const actMax  = window.innerHeight * 0.85;
      const actStep = serviceRows.length > 1
        ? (actMax - actBase) / (serviceRows.length - 1)
        : 0;

      // Cascade frontier — enforce strict sequential ordering
      let frontier = -1;
      for (let i = 0; i < serviceRows.length; i++) {
        const rect = serviceRows[i].getBoundingClientRect();
        const rowMid = rect.top + rect.height / 2;
        const isActive = serviceRows[i].classList.contains('active');
        const line = actBase + actStep * i;
        // Hysteresis: harder to deactivate than to activate
        if (rowMid < (isActive ? line + BUFFER : line - BUFFER)) {
          frontier = i;
        } else {
          break; // cascade: no skipping rows
        }
      }

      serviceRows.forEach((row, i) => {
        if (i <= frontier) {
          row.classList.add('active');
        } else {
          row.classList.remove('active');
        }
        syncExpanded(row);
      });

      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}
