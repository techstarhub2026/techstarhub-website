/**
 * Home page behaviour: hero tabs, slide counter, header search, and
 * premium scroll/hover motion (tilt, reveal). Scoped to body.home-2026.
 */
(function() {
  "use strict";

  if (!document.body.classList.contains('home-2026')) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  /**
   * Keep the hero tabs in sync with the carousel
   */
  const carousel = document.querySelector('#heroCarousel');

  if (carousel) {
    carousel.addEventListener('slid.bs.carousel', event => {
      const index = event.to;

      // Queried on every slide, not cached at load: site-content.js rebuilds
      // these buttons from the admin's slides, and a cached list would leave
      // this toggling classes on detached nodes while the visible tabs froze.
      const tabs = [...document.querySelectorAll('#hx-hero-tabs button')];

      // Match on the slide each tab actually targets rather than on its
      // position in the list, so a tab can be added or removed without
      // silently mis-highlighting every slide after it.
      const slideOf = tab => Number(tab.dataset.bsSlideTo);
      tabs.forEach(tab => tab.classList.toggle('active', slideOf(tab) === index));

      // A brief spring pop on the newly-active tab, whether the slide
      // changed by auto-advance or a click -- a small tactile confirmation.
      if (!prefersReducedMotion) {
        const activeTab = tabs.find(tab => slideOf(tab) === index);
        if (activeTab) {
          activeTab.classList.remove('hx-tab-pop');
          // Force a reflow so the class can be re-added even if it fires
          // again before the previous animation finished.
          void activeTab.offsetWidth;
          activeTab.classList.add('hx-tab-pop');
        }
      }
    });
  }

  /**
   * Header search now lives in its own file, site-search.js, loaded on
   * every page rather than gated behind this file's home-2026-only guard —
   * see that file for the implementation.
   */

  /**
   * Subtle pointer-tilt on cards — a light premium touch, skipped on touch
   * devices and for anyone who has asked for reduced motion.
   *
   * Delegated from the document rather than bound to each card directly.
   * site-content.js's renderHighlights() replaces .hx-highlights .hx-grid's
   * entire innerHTML once the admin API answers, which discards whatever
   * listeners were on the cards this querySelectorAll() saw at page load —
   * a card that arrives afterwards silently never tilts for the rest of the
   * session. Delegating means a card gets the effect from the first time a
   * pointer reaches it, whether it was in the original HTML or rendered
   * later. mousemove and mouseleave don't bubble, so mouseover/mouseout
   * (which do) take their place, using closest() to find the card and to
   * tell a same-card move apart from an actual entry/exit.
   */
  if (!prefersReducedMotion && hasFinePointer) {
    const TILT = '.hx-card, .hx-service, .hx-member, .hx-why-card';
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
  }

})();
