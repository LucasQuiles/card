// canvas-bg.js — interactive ambient background gradient. Index page only.
// Owns #ambient-canvas, dpr scaling, the 3 drifting gradient nodes, the RAF draw
// loop, and the WINDOW-level pointer/touch/scroll listeners (the window mousemove
// here is the ambient pointer — NOT the .card mouse-follow glow). Reduced-motion
// skips the whole animation.
export function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');
  let w, h;
  let pointer = { x: 0.5, y: 0.5 };
  let scroll = 0;
  let animId;

  // Gradient nodes — positions drift over time, influenced by input
  const nodes = [
    { x: 0.3, y: 0.2, vx: 0.0003, vy: 0.0002, r: 0.45, base: [28, 28, 32] },
    { x: 0.7, y: 0.8, vx: -0.0002, vy: 0.0003, r: 0.4, base: [24, 24, 28] },
    { x: 0.5, y: 0.5, vx: 0.0001, vy: -0.0004, r: 0.5, base: [20, 22, 26] },
  ];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onPointer(e) {
    const touch = e.touches ? e.touches[0] : e;
    pointer.x = touch.clientX / w;
    pointer.y = touch.clientY / h;
  }

  function onScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    const t = Date.now() * 0.0001;

    nodes.forEach((n, i) => {
      // Drift — slow autonomous wander + subtle input influence
      n.x += n.vx + (pointer.x - 0.5) * 0.0004;
      n.y += n.vy + (pointer.y - 0.5) * 0.0004 + (scroll - 0.5) * 0.0002;

      // Wrap at boundaries with smooth easing
      if (n.x < -0.2) n.vx = Math.abs(n.vx);
      if (n.x > 1.2) n.vx = -Math.abs(n.vx);
      if (n.y < -0.2) n.vy = Math.abs(n.vy);
      if (n.y > 1.2) n.vy = -Math.abs(n.vy);

      // Time-varying radius for organic motion
      const rad = n.r + Math.sin(t * (i + 1) * 2.3) * 0.08;
      const cx = n.x * w;
      const cy = n.y * h;
      const radius = rad * Math.max(w, h);

      // Very subtle grey gradient — barely visible
      const alpha = 0.025 + Math.sin(t * (i + 2) * 1.7) * 0.008;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(${n.base[0]}, ${n.base[1]}, ${n.base[2]}, ${alpha})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    animId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointer, { passive: true });
  window.addEventListener('touchmove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Pause the RAF loop while the tab is hidden (battery/CPU); the canvas is
  // position:fixed and always in-viewport, so tab visibility is the only gate.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
      animId = null;
    } else if (animId === null) {
      draw();
    }
  });

  draw();
}
