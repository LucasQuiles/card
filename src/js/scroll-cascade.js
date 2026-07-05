// scroll-cascade.js — continuous scroll-driven accordion for the service rows.
//
// Openness is a function of how far the page has been scrolled, measured
// against a FIXED range — the scrollable distance when every row is fully
// expanded, captured once. Progress prog = clamp(scrollY / openRange) runs
// 0→1; each row opens across an overlapping sub-range of prog:
//
//   t_i = smoothstep( clamp( (prog·(N + SPREAD) − i) / SPREAD ) )
//
// so the list is fully collapsed at the top of the scroll (prog=0) and fully
// expanded by the collapsed-height bottom (prog=1). Opening adds height beyond
// that, and the rows stay expanded through it, so they are expanded at the true
// bottom on any viewport — reversibly, with a wide focus band (SPREAD rows
// morph together) sweeping down the list.
//
// Why a FIXED range, and why no easing on scroll: the live document height
// grows as rows open, so a live denominator (scrollY / liveScrollHeight) is a
// feedback loop — open → taller page → less progress → close → shorter page →
// open … — and an eased follow keeps animating after the wheel stops. Together
// they make the page drift and grow for a beat after you stop scrolling: the
// jumpiness. Pinning the denominator to a constant (the expanded range) makes
// prog depend only on scrollY, a stable input, so the loop is gone; the
// expanded range also gives each row a long travel of scroll to animate over,
// so motion stays fluid rather than snapping. Painting unpinned rows straight
// to their target each frame ties openness to the wheel 1:1 with no settling.
// Rows only
// ever grow/shrink at or below the reading position (higher-index rows sit
// lower and open later), so expansion pushes off-screen content down rather
// than shoving what is being read.
//
// t drives the row chrome through the CSS custom property --t (background,
// border, shadow, padding, and the +/− marker interpolate in calc()); the JS
// writes the description box height/opacity/visibility inline in px. Click pins
// a row (open or closed) under permanent user control and animates it there;
// the scroll sampler then leaves it alone. Reduced motion: every row opens
// statically and the sampler never runs.

const SPREAD = 2.5;        // rows morphing together — higher = wider, softer focus
const CLICK_EASE = 0.22;   // per-frame approach for the click (pin) animation only
const SETTLE_EPS = 0.004;  // |current − pin| below this snaps the click animation

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (v) => v * v * (3 - 2 * v);

export function init() {
  const els = Array.from(document.querySelectorAll('.service-row'));
  if (!els.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rows = els.map((el) => ({
    el,
    desc: el.querySelector('.service-desc'),
    natH: 0,
    current: 0,
    pin: null, // null → scroll-driven; 0 or 1 → user-pinned
  }));

  // Reduced motion: a static, fully readable list is calmest. Click still
  // toggles (instant) so the control keeps its contract.
  if (reducedMotion) {
    rows.forEach((r) => {
      r.current = 1;
      r.el.style.setProperty('--t', '1');
      r.el.setAttribute('aria-expanded', 'true');
      if (r.desc) {
        r.desc.style.height = 'auto';
        r.desc.style.opacity = '1';
        r.desc.style.visibility = 'visible';
      }
      r.el.addEventListener('click', () => {
        const open = r.el.getAttribute('aria-expanded') === 'true';
        r.el.setAttribute('aria-expanded', open ? 'false' : 'true');
        r.el.style.setProperty('--t', open ? '0' : '1');
        if (r.desc) {
          r.desc.style.height = open ? '0px' : 'auto';
          r.desc.style.opacity = open ? '0' : '1';
          r.desc.style.visibility = open ? 'hidden' : 'visible';
        }
      });
    });
    return;
  }

  let openRange = 1;

  // One synchronous read pass in two stages (no paint happens until control
  // returns to the event loop, so nothing flashes). Stage A collapses every
  // row to read each description's natural height; stage B opens every row to
  // read the fully EXPANDED scroll range — the fixed denominator. scrollY is
  // saved/restored because collapsing can transiently shrink the document
  // below the current offset and clamp it.
  const measure = () => {
    const savedY = window.scrollY;
    const savedT = rows.map((r) => r.el.style.getPropertyValue('--t'));
    const saved = rows.map((r) => (r.desc ? {
      h: r.desc.style.height, v: r.desc.style.visibility,
      p: r.desc.style.paddingTop, o: r.desc.style.opacity,
    } : null));

    // Stage A — collapse all, read natural heights.
    rows.forEach((r) => {
      r.el.style.setProperty('--t', '0');
      if (!r.desc) return;
      r.desc.style.height = '0px';
      r.desc.style.paddingTop = '0px';
      r.desc.style.opacity = '0';
      r.desc.style.visibility = 'hidden';
    });
    rows.forEach((r) => {
      if (!r.desc) return;
      const s = r.desc.style;
      s.paddingTop = '';   // fall back to the CSS natural padding-top
      s.height = 'auto';
      r.natH = r.desc.offsetHeight;
      s.height = '0px';
      s.paddingTop = '0px';
    });

    // Stage B — open all to natural height and read the expanded scroll range.
    // This range (not the collapsed one) is the denominator: a constant, so
    // prog depends only on scrollY — no feedback loop, no stationary drift —
    // yet it spans the whole expanded page, so each row animates across a long
    // stretch of scroll. The collapsed page barely overflows the viewport, so
    // a collapsed denominator gave near-zero travel and the rows snapped.
    rows.forEach((r) => {
      r.el.style.setProperty('--t', '1');
      if (!r.desc) return;
      r.desc.style.paddingTop = '';
      r.desc.style.height = `${r.natH}px`;
      r.desc.style.opacity = '1';
      r.desc.style.visibility = 'visible';
    });
    openRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    // Restore prior inline state.
    rows.forEach((r, i) => {
      r.el.style.setProperty('--t', savedT[i] || '0');
      if (!r.desc || !saved[i]) return;
      const s = r.desc.style;
      s.height = saved[i].h; s.visibility = saved[i].v;
      s.paddingTop = saved[i].p; s.opacity = saved[i].o;
    });
    if (window.scrollY !== savedY) window.scrollTo(0, savedY);
  };

  const paint = (r) => {
    r.el.style.setProperty('--t', r.current.toFixed(4));
    r.el.setAttribute('aria-expanded', r.current > 0.5 ? 'true' : 'false');
    const d = r.desc;
    if (!d) return;
    d.style.height = `${(r.current * r.natH).toFixed(2)}px`;
    // Text fades in a touch ahead of full height so it reads before it lands.
    d.style.opacity = clamp01(r.current * 1.15).toFixed(3);
    d.style.visibility = r.current > 0.001 ? 'visible' : 'hidden';
  };

  const targetFor = (i) => {
    const prog = clamp01(window.scrollY / openRange);
    return smoothstep(clamp01((prog * (rows.length + SPREAD) - i) / SPREAD));
  };

  // Scroll: paint every unpinned row straight to its target — 1:1 with the
  // wheel, no easing, no post-scroll drift. rAF-throttled so bursts of scroll
  // events collapse to one read+write pass per frame.
  let scrollScheduled = false;
  const onScroll = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      scrollScheduled = false;
      rows.forEach((r, i) => {
        if (r.pin !== null) return;
        const t = targetFor(i);
        if (r.current !== t) { r.current = t; paint(r); }
      });
    });
  };

  // Click: pin the row, then ease it to the pinned state (the one place easing
  // belongs — it is a discrete user action, not a scroll response).
  let animating = false;
  const animate = () => {
    let moving = false;
    rows.forEach((r) => {
      if (r.pin === null) return;
      const diff = r.pin - r.current;
      if (Math.abs(diff) < SETTLE_EPS) {
        if (r.current !== r.pin) { r.current = r.pin; paint(r); }
        return;
      }
      r.current += diff * CLICK_EASE;
      paint(r);
      moving = true;
    });
    if (moving) requestAnimationFrame(animate);
    else animating = false;
  };
  const kickAnim = () => {
    if (animating) return;
    animating = true;
    requestAnimationFrame(animate);
  };

  rows.forEach((r) => {
    r.el.addEventListener('click', () => {
      r.pin = r.current > 0.5 ? 0 : 1;
      kickAnim();
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    rows.forEach((r, i) => {
      if (r.pin === null) r.current = targetFor(i);
      paint(r);
    });
  }, { passive: true });

  measure();
  rows.forEach((r, i) => { r.current = targetFor(i); paint(r); });
}
