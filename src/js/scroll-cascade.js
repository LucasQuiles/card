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
// so motion stays fluid rather than snapping. A rAF ticker (not a per-event
// paint) samples the freshest scrollY once per DISPLAY frame while a scroll is
// live and paints unpinned rows straight to target — so openness tracks the
// compositor 1:1 at the panel's true refresh rate, not the coarser scroll-event
// cadence, and there is no post-scroll settling. The ticker self-terminates a
// few frames after scroll stops, so it costs nothing at rest.
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
// Quintic ease (Perlin smootherstep): zero 1st AND 2nd derivative at 0 and 1,
// so each row eases in and settles with no residual acceleration at the ends of
// its travel — the cubic smoothstep it replaced still had a faint "arrive" snap.
const smootherstep = (v) => v * v * v * (v * (v * 6 - 15) + 10);
const RISE = 8; // px the description content glides up as it reveals (compositor transform)

export function init() {
  const els = Array.from(document.querySelectorAll('.service-row'));
  if (!els.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rows = els.map((el) => ({
    el,
    desc: el.querySelector('.service-desc'),
    inner: null, // rise/fade target — the description text wrapped so it can be
                 // translated inside the height-clipping box (set just below)
    natH: 0,
    current: 0,
    pin: null, // null → scroll-driven; 0 or 1 → user-pinned
    aria: null, // last-written aria-expanded boolean (paint skips no-op writes)
    vis: null,  // last-written visibility boolean
  }));

  // Wrap each description's text in an inline block so the reveal can glide the
  // content up (translateY) and fade it inside the box whose height animates —
  // the box is the clip window; the inner element moves within it. Done in JS so
  // the markup stays clean and no HTML entities are hand-edited. offsetHeight of
  // the (auto-height) box is unchanged by the wrapper, so measure() still reads
  // the true natural height.
  rows.forEach((r) => {
    if (!r.desc) return;
    let inner = r.desc.querySelector(':scope > .service-desc-inner');
    if (!inner) {
      inner = document.createElement('span');
      inner.className = 'service-desc-inner';
      inner.style.display = 'block';
      while (r.desc.firstChild) inner.appendChild(r.desc.firstChild);
      r.desc.appendChild(inner);
    }
    r.inner = inner;
  });

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

  // paint writes only what changed. --t/height/opacity move every frame (that
  // IS the animation), but aria-expanded and visibility are booleans that flip
  // once per open/close — rewriting them every frame churns the a11y tree and
  // the attribute for no visual effect, so they are guarded on r.aria/r.vis.
  const paint = (r) => {
    const t = r.current;
    r.el.style.setProperty('--t', t.toFixed(4));
    const expanded = t > 0.5;
    if (r.aria !== expanded) {
      r.el.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      r.aria = expanded;
    }
    const d = r.desc;
    if (!d) return;
    d.style.height = `${(t * r.natH).toFixed(2)}px`;
    // Opacity leads height slightly (t·1.15) so text reads before it fully
    // lands, then rides a quintic ease so the fade slows in and out rather than
    // ramping linearly. The content also glides up RISE→0 px on a compositor
    // transform, so it rises into place inside the clipping box (GPU, no reflow).
    if (r.inner) {
      r.inner.style.opacity = smootherstep(clamp01(t * 1.15)).toFixed(3);
      r.inner.style.transform = t > 0.999 ? '' : `translateY(${((1 - t) * RISE).toFixed(2)}px)`;
    } else {
      d.style.opacity = clamp01(t * 1.15).toFixed(3);
    }
    const vis = t > 0.001;
    if (r.vis !== vis) {
      d.style.visibility = vis ? 'visible' : 'hidden';
      r.vis = vis;
    }
  };

  const SPAN = rows.length + SPREAD;
  const targetFor = (i) => {
    const prog = clamp01(window.scrollY / openRange);
    return smootherstep(clamp01((prog * SPAN - i) / SPREAD));
  };

  // Scroll → a rAF ticker, not a per-event paint. A scroll listener that paints
  // on each event is capped at the browser's scroll-event cadence, which on iOS
  // momentum scroll and 120Hz displays is coarser than the actual refresh — the
  // rows then visibly step behind the finger. The ticker instead samples the
  // freshest scrollY once per DISPLAY frame while a scroll is live, so paint
  // tracks the compositor 1:1 at whatever the panel refreshes at. It runs only
  // during motion: three unchanged-scrollY frames (scroll settled) stop it, so
  // there is zero idle cost. Pinned rows are skipped here — the click animation
  // owns them on its own rAF loop.
  let ticking = false;
  let lastY = -1;
  let idle = 0;
  const tick = () => {
    const y = window.scrollY;
    if (y === lastY) {
      if (++idle > 3) { ticking = false; return; } // settled → release the loop
    } else {
      idle = 0;
      lastY = y;
      const prog = clamp01(y / openRange);
      rows.forEach((r, i) => {
        if (r.pin !== null) return;
        const t = smootherstep(clamp01((prog * SPAN - i) / SPREAD));
        if (r.current !== t) { r.current = t; paint(r); }
      });
    }
    requestAnimationFrame(tick);
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    lastY = -1;
    idle = 0;
    requestAnimationFrame(tick);
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
