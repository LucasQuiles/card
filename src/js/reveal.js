// reveal.js — IntersectionObserver fade-ins. Used by portfolio.
// Source threshold is 0.05 and reveal class is 'visible' (portfolio.css:
// .project-card.visible { animation: fade-up ... }). Source also staggers each
// card via animationDelay = idx * 0.08s based on its position among siblings.
export function init(selector = '.project-card', revealClass = 'visible') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add(revealClass));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const siblings = [...entry.target.parentElement.children].filter((c) =>
          c.classList.contains('project-card'),
        );
        const idx = siblings.indexOf(entry.target);
        entry.target.style.animationDelay = `${idx * 0.08}s`;
        entry.target.classList.add(revealClass);
        obs.unobserve(entry.target);
      }
    });
    if (![...els].some((el) => !el.classList.contains(revealClass))) obs.disconnect();
  }, { threshold: 0.05 });
  els.forEach((el) => obs.observe(el));
}
