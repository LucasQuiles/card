// scroll-cascade.js — continuous scroll-driven accordion for the service rows.
//
// Openness is a function of overall scroll progress, sampled every frame — not
// a set of discrete open/close events. Page progress p = scrollY / maxScroll
// runs 0→1 top→bottom; each row opens across an overlapping sub-range of p, so
// the list is fully collapsed at the top of the scroll and fully expanded at
// the bottom, on any viewport, reversibly and with no snap. SPREAD sets how
// many rows morph together — a wide, soft focus band that sweeps down the list
// as you scroll rather than one row toggling at a time.
//
//   t_i = smoothstep( clamp( (p·(N + SPREAD) − i) / SPREAD ) )
//
// At p=0 every term is ≤0 → all rows collapsed; at p=1 every term is >1 → all
// rows expanded. Endpoints are exact because scrollY is pinned there, so the
// growing page height (rows add height as they open) can't drift the ends.
//
// t drives the row chrome through the CSS custom property --t (background,
// border, shadow, padding, and the +/− marker all interpolate in calc()); the
// JS writes the description box's height/opacity/visibility inline in px. A
// per-row eased follow (current lerps toward target each frame) low-passes any
// residual layout jitter into a smooth glide and doubles as the click
// animation. Click pins a row (open or closed) under permanent user control;
// the sampler then leaves it alone. Reduced motion: every row opens statically
// and the rAF sampler never runs.

const SPREAD = 2.5;        // rows morphing together — higher = wider, softer focus
const EASE_FACTOR = 0.24;  // per-frame approach to target; higher = snappier
const SETTLE_EPS = 0.004;  // |current − target| below this snaps and the loop idles

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
    target: 0,
    pin: null, // null → scroll-driven; 0 or 1 → user-pinned
  }));

  // Reduced motion: a fully open, static list is the calmest readable state.
  // Skip the sampler entirely; click still toggles (instant) so the control
  // keeps its contract.
  if (reducedMotion) {
    rows.forEach((r) => {
      r.current = r.target = 1;
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

  // Measure each description's natural (fully open) height — one read pass.
  const measure = () => {
    rows.forEach((r) => {
      const d = r.desc;
      if (!d) return;
      const s = d.style;
      const save = { h: s.height, v: s.visibility, p: s.paddingTop, o: s.opacity };
      s.visibility = 'hidden';
      s.opacity = '0';
      s.paddingTop = '';       // fall back to the CSS natural padding-top
      s.height = 'auto';
      r.natH = d.offsetHeight; // includes the natural padding-top
      s.height = save.h; s.visibility = save.v; s.paddingTop = save.p; s.opacity = save.o;
    });
  };

  // Write a row's current openness to the DOM.
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

  // Read pass: each row's target from overall page scroll progress.
  const sample = () => {
    const maxY = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = clamp01(window.scrollY / maxY);
    const reach = p * (rows.length + SPREAD);
    rows.forEach((r, i) => {
      if (r.pin !== null) { r.target = r.pin; return; }
      r.target = smoothstep(clamp01((reach - i) / SPREAD));
    });
  };

  // Eased follow loop — runs only while something is still moving.
  let ticking = false;
  const tick = () => {
    sample();
    let moving = false;
    rows.forEach((r) => {
      const diff = r.target - r.current;
      if (Math.abs(diff) < SETTLE_EPS) {
        if (r.current !== r.target) { r.current = r.target; paint(r); }
        return;
      }
      r.current += diff * EASE_FACTOR;
      paint(r);
      moving = true;
    });
    if (moving) requestAnimationFrame(tick);
    else ticking = false;
  };
  const kick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  };

  // Click pins the row under permanent user control; the sampler skips it after.
  rows.forEach((r) => {
    r.el.addEventListener('click', () => {
      const shown = (r.pin !== null ? r.pin : r.current) > 0.5;
      r.pin = shown ? 0 : 1;
      kick();
    });
  });

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); kick(); }, { passive: true });

  measure();
  rows.forEach(paint); // establish the collapsed initial state
  kick();
}
