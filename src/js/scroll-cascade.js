// scroll-cascade.js — service rows expand one-shot as they enter the viewport.
// Index page only.
//
// Expand-only by design: the previous scroll-position cascade collapsed rows on
// scroll-up, which changed the document height under the user's finger and made
// scrolling feel janky. Rows now expand once (staggered when several qualify in
// the same frame) and never auto-collapse. A row the user toggles manually is
// theirs — the observer never overrides it afterwards.
//
// Motion is driven here via the Web Animations API, not CSS transitions. The
// old CSS transitioned grid-template-rows — a layout property the compositor
// can't animate — so every frame reflowed the whole column, and staggered
// setTimeout expansions compounded those reflows into jank. Now: class flips
// and measurements are batched (writes, then one read pass, then animation
// starts), the cascade stagger rides each animation's `delay` with
// fill:'backwards' instead of timers, and each animation interpolates one
// description box between concrete pixel heights while opacity fades on the
// compositor.
//
// Reduced-motion: skip the auto-expansion entirely, but still activate the
// first row and keep click-to-toggle (instant, no animation) so every row
// stays reachable/readable.
const STAGGER_MS = 120;
const EXPAND_MS = 450;
const EASE = 'cubic-bezier(0.22, 0.1, 0.25, 1)';

export function init() {
  const serviceRows = document.querySelectorAll('.service-row');
  if (!serviceRows.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const syncExpanded = (el) => {
    el.setAttribute('aria-expanded', el.classList.contains('active') ? 'true' : 'false');
  };

  const descOf = (row) => row.querySelector('.service-desc');

  // Expand a batch of rows with one cascading reveal. Write pass (cancel
  // stale animations, flip classes), then one read pass (target boxes), then
  // start all animations — stagger comes from `delay`, and fill:'backwards'
  // holds each description collapsed until its turn.
  const expandRows = (rows) => {
    rows.forEach((row) => {
      descOf(row)?.getAnimations().forEach((anim) => anim.cancel());
      row.classList.add('active');
      syncExpanded(row);
    });
    if (reducedMotion) return;

    const boxes = rows.map((row) => {
      const desc = descOf(row);
      return desc && {
        desc,
        height: desc.offsetHeight,
        paddingTop: getComputedStyle(desc).paddingTop,
      };
    });

    boxes.forEach((box, i) => {
      if (!box) return;
      box.desc.animate(
        [
          { height: '0px', paddingTop: '0px', opacity: 0 },
          { height: `${box.height}px`, paddingTop: box.paddingTop, opacity: 1 },
        ],
        { duration: EXPAND_MS, easing: EASE, delay: i * STAGGER_MS, fill: 'backwards' },
      );
    });
    // No forwards fill: when an animation ends, the natural CSS state (auto
    // height) takes over, so expanded rows stay responsive to reflow.
  };

  const collapseRow = (row) => {
    const desc = descOf(row);
    // Measure before the class flip — if an expand is mid-flight we collapse
    // from the box's current animated size, not from a snap to full height.
    const from = desc && !reducedMotion && {
      height: `${desc.offsetHeight}px`,
      paddingTop: getComputedStyle(desc).paddingTop,
      opacity: getComputedStyle(desc).opacity,
    };
    desc?.getAnimations().forEach((anim) => anim.cancel());
    row.classList.remove('active');
    syncExpanded(row);
    if (!from) return;

    // visibility rides the keyframes so the text stays readable while it
    // shrinks, then the collapsed CSS (visibility:hidden) removes it from
    // the a11y tree when the animation ends.
    desc.animate(
      [
        { ...from, visibility: 'visible' },
        { height: '0px', paddingTop: '0px', opacity: 0, visibility: 'hidden' },
      ],
      { duration: EXPAND_MS, easing: EASE },
    );
  };

  serviceRows.forEach(syncExpanded);
  expandRows([serviceRows[0]]);

  // Click toggles a row and hands the user permanent control of it.
  serviceRows.forEach((row) => {
    row.addEventListener('click', () => {
      row.dataset.userToggled = 'true';
      if (row.classList.contains('active')) collapseRow(row);
      else expandRows([row]);
    });
  });

  if (reducedMotion) return;

  // One-shot: expand when a row clears the bottom ~25% of the viewport.
  // Rows that qualify together cascade via staggered animation delays so the
  // reveal reads as a sequence instead of a simultaneous pop.
  const observer = new IntersectionObserver((entries) => {
    const rows = [];
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const row = entry.target;
      observer.unobserve(row);
      if (row.dataset.userToggled || row.classList.contains('active')) return;
      rows.push(row);
    });
    if (rows.length) expandRows(rows);
  }, { rootMargin: '0px 0px -25% 0px', threshold: 0 });

  serviceRows.forEach((row) => observer.observe(row));
}
