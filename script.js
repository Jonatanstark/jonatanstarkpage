// Animated number counter
function animateCount(el, target, duration) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Observe stat items
const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      const numEl = el.querySelector('.stat-num');
      if (numEl) {
        const target = parseInt(numEl.dataset.target, 10);
        const delay = Array.from(el.parentElement.children).indexOf(el) * 100;
        setTimeout(() => animateCount(numEl, target, 1200), delay);
      }
      statObserver.unobserve(el);
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('.stat-item').forEach((el) => statObserver.observe(el));

// Observe now-strip
const stripObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        stripObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.3 }
);

const strip = document.querySelector('.now-strip');
if (strip) stripObserver.observe(strip);
