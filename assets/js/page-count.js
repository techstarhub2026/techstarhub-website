/**
 * The count in a page head — "12 photographs", "6 board members".
 *
 * It is what makes the head worth its space: without it the head only repeats
 * the page's name, which is the thing the old photographic band was removed
 * for doing. With it, a reader learns something before scrolling.
 *
 * The lists it counts arrive from the admin after this file runs, so the
 * count is observed rather than taken once: team.js, gallery-integration.js
 * and events-integration.js each replace their grid wholesale, and a number
 * read before that lands would describe the fallback markup instead.
 */
(function () {
  var el = document.querySelector('[data-page-count]');
  if (!el) return;

  var COUNTS = {
    gallery:  { selector: '.hx-gallery-item', one: 'photograph', many: 'photographs' },
    board:    { selector: '.hx-member',       one: 'board member', many: 'board members' },
    staff:    { selector: '.hx-member',       one: 'team member', many: 'team members' },
    events:   { selector: '.hx-showcase-row', one: 'event', many: 'events' },
    // These three render their cards from the admin, so the count is of
    // .uj-card__body — one per card, where .uj-card itself carries extra
    // modifier classes that vary between pages.
    news:     { selector: '.uj-card__body',   one: 'story', many: 'stories' },
    courses:  { selector: '.uj-card__body',   one: 'course', many: 'courses' },
    projects: { selector: '.hx-project',      one: 'project', many: 'projects' }
  };

  var spec = COUNTS[el.getAttribute('data-page-count')];
  if (!spec) return;

  function render() {
    var n = document.querySelectorAll(spec.selector).length;
    el.textContent = n ? n + ' ' + (n === 1 ? spec.one : spec.many) : '';
  }

  render();

  // Redraw as the admin's content replaces the markup's. Watching main is
  // enough: every one of these grids is rewritten inside it.
  var main = document.querySelector('main.main');
  if (!main || typeof MutationObserver !== 'function') return;

  var pending;
  new MutationObserver(function () {
    window.clearTimeout(pending);
    pending = window.setTimeout(render, 60);
  }).observe(main, { childList: true, subtree: true });
})();
