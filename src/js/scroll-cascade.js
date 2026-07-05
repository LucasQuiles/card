// scroll-cascade.js — service rows expand one-shot as they enter the viewport.
// Index page only.
//
// Expand-only by design: the previous scroll-position cascade collapsed rows on
// scroll-up, which changed the document height under the user's finger and made
// scrolling feel janky. Rows now expand once (staggered when several qualify in
// the same frame) and never auto-collapse. A row the user toggles manually is
// theirs — the observer never overrides it afterwards.
// Reduced-motion: skip the auto-expansion entirely, but still activate the
// first row and keep click-to-toggle so every row stays reachable/readable.
const STAGGER_MS = 120;

export function init() {
  const serviceRows = document.querySelectorAll('.service-row');
  if (!serviceRows.length) return;

  const syncExpanded = (el) => {
    el.setAttribute('aria-expanded', el.classList.contains('active') ? 'true' : 'false');
  };

  serviceRows[0].classList.add('active');
  serviceRows.forEach(syncExpanded);

  // Click toggles a row and hands the user permanent control of it.
  serviceRows.forEach((row) => {
    row.addEventListener('click', () => {
      row.classList.toggle('active');
      row.dataset.userToggled = 'true';
      syncExpanded(row);
    });
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // One-shot: expand when a row clears the bottom ~25% of the viewport.
  // Entries that qualify together are staggered so the reveal reads as a
  // cascade instead of a simultaneous pop.
  const observer = new IntersectionObserver((entries) => {
    let stagger = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const row = entry.target;
      observer.unobserve(row);
      if (row.dataset.userToggled || row.classList.contains('active')) return;
      setTimeout(() => {
        // Re-check at fire time: the user may have claimed the row meanwhile.
        if (row.dataset.userToggled) return;
        row.classList.add('active');
        syncExpanded(row);
      }, stagger);
      stagger += STAGGER_MS;
    });
  }, { rootMargin: '0px 0px -25% 0px', threshold: 0 });

  serviceRows.forEach((row) => observer.observe(row));
}
