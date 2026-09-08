/**
 * Inner-page behaviour: the same subtle pointer-tilt the homepage gives its
 * cards, so hover feels identical across the whole site. Scoped to
 * body.inner-page; skipped on touch devices and for reduced-motion visitors.
 */
(function() {
  "use strict";

  if (!document.body.classList.contains('inner-page')) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (prefersReducedMotion || !hasFinePointer) return;

  /**
   * Delegated from the document rather than bound to each element directly.
   * courses.html's course grid and any other inner-page list backed by
   * courses-integration.js/store-integration.js can render .hx-price,
   * .hx-event or .hx-article elements after this script has already run its
   * one-time querySelectorAll() — a per-element binding here would silently
   * never tilt anything added later. The homepage's equivalent effect in
   * home.js had exactly this gap (confirmed there by testing a card injected
   * after its own querySelectorAll() and finding it never received the
   * effect); fixed the same way here before this page grows the same kind
   * of dynamic content. mousemove/mouseleave don't bubble, so
   * mousemove/mouseout (mouseout does bubble) carry the logic instead,
   * using closest() to find the tilting element and to tell a same-element
   * move apart from an actual entry/exit.
   */
  const TILT = '.hx-feature, .hx-event, .hx-member, .hx-price, .hx-info, .hx-quote, .hx-article';
  let frame = null;

  document.addEventListener('mouseover', event => {
    const el = event.target.closest(TILT);
    if (!el) return;
    const from = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(TILT) : null;
    if (from === el) return;

    const move = moveEvent => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (moveEvent.clientX - rect.left) / rect.width - 0.5;
        const py = (moveEvent.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty('--tilt-x', (py * -5).toFixed(2) + 'deg');
        el.style.setProperty('--tilt-y', (px * 5).toFixed(2) + 'deg');
        frame = null;
      });
    };

    el.addEventListener('mousemove', move);
    el.addEventListener('mouseout', function reset(outEvent) {
      const to = outEvent.relatedTarget && outEvent.relatedTarget.closest ? outEvent.relatedTarget.closest(TILT) : null;
      if (to === el) return;
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseout', reset);
    });
  });

})();
