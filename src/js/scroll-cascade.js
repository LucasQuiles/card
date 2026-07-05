// scroll-cascade.js — scroll-driven accordion for the index-page service rows.
//
// Behavior: every row loads collapsed. As a row scrolls into the reading zone
// (a band around the vertical middle of the viewport) it gently expands; as
// it leaves that zone — scrolling down past it OR scrolling back up away from
// it — it settles closed again. At rest, only the row(s) currently in the
// reading zone sit open. A row the user clicks becomes user-owned
// (dataset.userToggled) and the observers never auto-toggle it afterwards.
//
// Hysteresis / band geometry: two IntersectionObservers with nested bands.
// A row EXPANDS when it touches the inner band (middle ~24% of the viewport)
// and COLLAPSES only once it has fully left the outer band (middle ~60%).
// The ~18%-of-viewport dead zone between the two edges is taller than any
// single description box, so the layout shift from one row collapsing can
// never carry a neighbour across both edges at once — no feedback loop, no
// twitching at the boundary. A short per-row settle timer (SETTLE_MS)
// absorbs rapid re-fires while an edge is being crossed mid-gesture, and
// the browser's native scroll anchoring compensates for height changes
// above the viewport focus, so collapses behind the reader don't yank the
// page under their finger.
//
// Motion is driven via the Web Animations API, not CSS transitions. The
// old CSS transitioned grid-template-rows — a layout property the compositor
// can't animate — so every frame reflowed the whole column, and staggered
// setTimeout expansions compounded those reflows into jank. Now: class flips
// and measurements are batched (writes, then one read pass, then animation
// starts), the rare multi-row cascade rides each animation's `delay` with
// fill:'backwards' instead of timers, opacity fades on the compositor, and
// each animation interpolates one description box between concrete pixel
// heights. Expand is slightly slower than collapse — opening greets, closing
// gets out of the way.
//
// Reduced-motion: open every row up front and skip the scroll observers
// entirely. Rationale: with animation disabled, scroll-driven toggling would
// make content pop in/out mid-scroll — the least calm option. A fully open,
// static list is the calmest readable state. Click-to-toggle still works
// (instant, no animation) so the control keeps its contract.
const STAGGER_MS = 120;
const EXPAND_MS = 500;
const COLLAPSE_MS = 400;
const SETTLE_MS = 100;
const EASE = 'cubic-bezier(0.22, 0.1, 0.25, 1)';

// Inner band: expand when a row enters the middle ~24% of the viewport.
// Outer band: collapse only after a row fully exits the middle ~60%.
const EXPAND_BAND = '-38% 0px -38% 0px';
const COLLAPSE_BAND = '-20% 0px -20% 0px';

export function init() {
  const serviceRows = Array.from(document.querySelectorAll('.service-row'));
  if (!serviceRows.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const syncExpanded = (el) => {
    el.setAttribute('aria-expanded', el.classList.contains('active') ? 'true' : 'false');
  };

  const descOf = (row) => row.querySelector('.service-desc');

  // Per-row settle timers: each observer event replaces the row's pending
  // action, so a boundary wobble (expand→collapse→expand within SETTLE_MS)
  // resolves to the last intent instead of firing all three.
  const pending = new Map();
  const cancelPending = (row) => {
    clearTimeout(pending.get(row));
    pending.delete(row);
  };
  const schedule = (row, fn) => {
    cancelPending(row);
    pending.set(row, setTimeout(() => {
      pending.delete(row);
      fn();
    }, SETTLE_MS));
  };

  // Expand a batch of rows with one cascading reveal. Write pass (cancel
  // stale animations, flip classes), then one read pass (target boxes), then
  // start all animations — stagger comes from `delay`, and fill:'backwards'
  // holds each description collapsed until its turn. Single-row expands
  // (the common case) get delay 0 — one thing moves at a time.
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
      { duration: COLLAPSE_MS, easing: EASE },
    );
  };

  serviceRows.forEach(syncExpanded);

  // Click toggles a row and hands the user permanent control of it.
  serviceRows.forEach((row) => {
    row.addEventListener('click', () => {
      row.dataset.userToggled = 'true';
      cancelPending(row);
      if (row.classList.contains('active')) collapseRow(row);
      else expandRows([row]);
    });
  });

  if (reducedMotion) {
    // Calmest readable state: everything open, nothing ever moves on scroll.
    serviceRows.forEach((row) => {
      row.classList.add('active');
      syncExpanded(row);
    });
    return;
  }

  // Settled expands are coalesced through one rAF flush so rows whose timers
  // land in the same frame share a single batched write/read/animate pass
  // (and pick up the cascade stagger) instead of thrashing layout per row.
  let expandQueue = [];
  let flushScheduled = false;
  const queueExpand = (row) => {
    expandQueue.push(row);
    if (flushScheduled) return;
    flushScheduled = true;
    requestAnimationFrame(() => {
      flushScheduled = false;
      const rows = expandQueue.filter(
        (r) => !r.dataset.userToggled && !r.classList.contains('active'),
      );
      expandQueue = [];
      if (rows.length) expandRows(rows);
    });
  };

  // Inner band — a row touching the reading zone opens.
  const expandObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const row = entry.target;
      if (!entry.isIntersecting || row.dataset.userToggled) return;
      if (row.classList.contains('active')) {
        // Re-entered the zone with a collapse still pending — keep it open.
        cancelPending(row);
        return;
      }
      schedule(row, () => queueExpand(row));
    });
  }, { rootMargin: EXPAND_BAND, threshold: 0 });

  // Outer band — only a row fully OUTSIDE it closes. Rows cross the outer
  // edge before the inner one, so on re-entry any pending timer here is a
  // stale collapse; on exit, any pending timer is a stale expand. Either
  // way the old intent dies before the new one is scheduled.
  const collapseObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const row = entry.target;
      if (row.dataset.userToggled) return;
      if (entry.isIntersecting) {
        cancelPending(row);
        return;
      }
      cancelPending(row);
      if (row.classList.contains('active')) {
        schedule(row, () => collapseRow(row));
      }
    });
  }, { rootMargin: COLLAPSE_BAND, threshold: 0 });

  // Keep observing for the page's lifetime — rows react every time they
  // pass through the reading zone, in both scroll directions.
  serviceRows.forEach((row) => {
    expandObserver.observe(row);
    collapseObserver.observe(row);
  });
}
