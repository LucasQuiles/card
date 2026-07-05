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

const SPREAD = 3.0;        // rows morphing together — higher = wider, softer focus
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
    pin: null, // null → scroll-driven; 0 or 1 → user-pinned (temporary override)
    sync: false, // true → easing back into the scroll-driven set after a pin release
    aria: null, // last-written aria-expanded boolean (paint skips no-op writes)
    vis: null,  // last-written visibility boolean
    opaque: false, // has the box opacity been lifted off its CSS-0 rest once
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

  // ── Reserved scroll length (constant document height) ──────────────────────
  // The morph maps openness to scroll position against a FIXED denominator
  // (openRange, the expanded scroll range). But the live document GROWS as rows
  // open, so when collapsed the page is shorter than the expanded range: on a
  // wheel that is invisible, but on touch a single flick hits a bottom that is
  // still receding (each row that opens adds height), so momentum under- and
  // over-shoots and the morph feels choppy. Fix: hold the document at its FULLY
  // EXPANDED height at all times.
  //
  // Reserved STATICALLY, once, not per frame: measure() sets a min-height floor
  // on the card's container equal to its fully-open height. The rows then grow
  // into space the container already reserves, so the container — and the
  // document — never change height as the accordion morphs. Zero per-frame layout
  // writes for the reservation: the floor is a hard constant, so document height
  // is exactly constant at every openness on every surface.
  //
  // Why not a per-frame shrinking spacer (the two approaches this replaces): a
  // spacer whose height is recomputed each scroll frame has to READ the card's
  // live height and WRITE its own inside the same frame the row heights are being
  // written — a reflow-timing race. A linear growth model (Σ(1−t_i)·growth_i)
  // drifted ~13px from the nonlinear real height mid-morph (the page "breathing");
  // the measured complement (expandedCardH − card.offsetHeight) read a card
  // height ~32px stale from the write it chased, drifting the ends. A static floor
  // has neither failure mode because it never writes during scroll at all. With
  // body{align-items:center}, any residual height wobble bounced the whole card —
  // a constant floor removes the wobble at the source.
  const card = document.getElementById('card') || els[0].closest('.card');
  const sizeHost = card ? card.parentNode : null; // container that carries the floor

  // One synchronous read pass in two stages (no paint happens until control
  // returns to the event loop, so nothing flashes). Stage A collapses every
  // row to read each description's natural height; stage B opens every row to
  // read the fully EXPANDED scroll range — the fixed denominator. scrollY is
  // saved/restored because collapsing can transiently shrink the document
  // below the current offset and clamp it.
  const measure = () => {
    const savedY = window.scrollY;
    // Drop the reserved floor before measuring, or a stale floor from a prior
    // (larger-viewport) measure would inflate the expanded read.
    if (sizeHost) sizeHost.style.minHeight = '';
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
    // The fully-open container height — the floor that holds the document
    // constant. Read while every row is open (before the restore below), with the
    // floor cleared (top of measure), so it is the TRUE expanded height.
    const reservedH = sizeHost ? sizeHost.offsetHeight : 0;
    openRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    // Restore prior inline state.
    rows.forEach((r, i) => {
      r.el.style.setProperty('--t', savedT[i] || '0');
      if (!r.desc || !saved[i]) return;
      const s = r.desc.style;
      s.height = saved[i].h; s.visibility = saved[i].v;
      s.paddingTop = saved[i].p; s.opacity = saved[i].o;
    });
    // Apply the floor: the container can no longer shrink below its expanded
    // height, so collapsing rows leave reserved (already-counted) space rather
    // than shortening the document. One write per measure, never during scroll.
    if (sizeHost) sizeHost.style.minHeight = `${reservedH}px`;
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
      // The inner wrapper owns the fade (so it can also glide up); the box's
      // own opacity must be lifted off its collapsed CSS rest (opacity:0) or it
      // multiplies the visible text back to zero. Written once per row, then
      // guarded — a constant, unlike the inner's per-frame fade.
      if (!r.opaque) { d.style.opacity = '1'; r.opaque = true; }
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
  //
  // Genuine scroll movement RELEASES any user pin: a manual tap is a temporary
  // override, so the first real scroll after it hands the row back to the scroll
  // mapping. Rather than snap (which would look like a glitch), the released row
  // is marked r.sync and the click-ease loop glides it into alignment with the
  // rest. The release is gated on !first so that merely starting the loop (a tap,
  // or a touchstart with no drag) does not count as movement and cancel the pin.
  let ticking = false;
  let lastY = -1;
  let idle = 0;
  const tick = () => {
    const y = window.scrollY;
    if (y === lastY) {
      if (++idle > 3) { ticking = false; return; } // settled → release the loop
    } else {
      const first = lastY === -1; // first painted frame of this scroll gesture
      idle = 0;
      lastY = y;
      const prog = clamp01(y / openRange);
      let released = false;
      rows.forEach((r, i) => {
        if (!first && r.pin !== null) { r.pin = null; r.sync = true; released = true; return; }
        if (r.pin !== null || r.sync) return; // pinned / re-aligning → animate owns it
        const t = smootherstep(clamp01((prog * SPAN - i) / SPREAD));
        if (r.current !== t) { r.current = t; paint(r); }
      });
      if (released) kickAnim(); // ease the just-released rows back into the set
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
    rows.forEach((r, i) => {
      // A pinned row eases to its fixed pin target; a released (r.sync) row eases
      // to its LIVE scroll target — so it catches up to where the scroll mapping
      // now wants it and rejoins the set seamlessly. targetFor(i) reads the
      // current scrollY, so a sync in progress tracks an ongoing scroll.
      let target;
      if (r.pin !== null) target = r.pin;
      else if (r.sync) target = targetFor(i);
      else return;
      const diff = target - r.current;
      if (Math.abs(diff) < SETTLE_EPS) {
        if (r.current !== target) { r.current = target; paint(r); }
        if (r.sync) r.sync = false; // realigned → hand back to the scroll ticker
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
      r.sync = false; // a fresh tap cancels any in-progress re-alignment
      kickAnim();
    });
  });

  measure();

  // One scroll-driven accordion for EVERY surface — wheel, trackpad, and touch
  // alike. Consistency across clients is the point: the same rAF sampler drives
  // the morph everywhere, and the reserved-height floor (above) makes the scroll
  // range identical on all of them, so a phone flick and a trackpad swipe
  // traverse the exact same mapping. Native momentum is never hijacked — we only
  // sample the scroll position the platform reports.
  //
  // The sampler is kicked by scroll AND by touchstart/touchmove. Kicking on
  // touch matters because a scroll listener alone starts the rAF loop only once
  // the browser dispatches its first coalesced scroll event, which on touch lags
  // the finger by a frame or two and reads as chop at the start of a drag.
  // touchstart wakes the loop on contact so openness tracks the compositor from
  // the first moved pixel; the loop then self-samples every DISPLAY frame
  // through the drag and the momentum coast, and self-terminates a few idle
  // frames after everything stops.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchstart', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });
  // Re-measure the reserved floor and re-sync every unpinned row to its scroll
  // target. Used for viewport changes AND for font load: init() runs measure()
  // at module time, which on a cold load is BEFORE the web fonts arrive, so the
  // descriptions are measured with fallback-font metrics and the floor locks a
  // few dozen px short of the real height. When the fonts swap in the text
  // reflows taller and the document would exceed the stale floor near the bottom
  // (the page grows as you approach it) — so we re-measure once fonts are ready.
  const relayout = () => {
    measure();
    rows.forEach((r, i) => {
      if (r.pin === null) r.current = targetFor(i);
      paint(r);
    });
  };
  window.addEventListener('resize', relayout, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  rows.forEach((r, i) => { r.current = targetFor(i); paint(r); });
}
