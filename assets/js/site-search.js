/**
 * Header search — opens a site-scoped web search, so it works on a static
 * host with no search index of its own.
 *
 * Runs on every page (unlike home.js, which this was pulled out of): the
 * markup and matching CSS exist on the home page and every inner page, but
 * this behaviour previously lived inside home.js's `if
 * (!document.body.classList.contains('home-2026')) return;` guard — so the
 * button rendered everywhere the markup was present, but only home.html's
 * copy of it actually opened anything.
 */
(function () {
  "use strict";

  const searchToggle = document.querySelector('#hx-search-toggle');
  const searchPanel = document.querySelector('#hx-search-panel');
  const searchInput = document.querySelector('#hx-search-input');
  const searchQuery = document.querySelector('#hx-search-q');

  if (!searchToggle || !searchPanel) return;

  searchToggle.addEventListener('click', () => {
    const open = searchPanel.classList.toggle('is-open');
    searchToggle.setAttribute('aria-expanded', String(open));
    if (open && searchInput) searchInput.focus();
  });

  searchPanel.addEventListener('submit', event => {
    const terms = searchInput ? searchInput.value.trim() : '';
    if (!terms) {
      event.preventDefault();
      return;
    }
    if (searchQuery) searchQuery.value = 'site:' + window.location.hostname + ' ' + terms;
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && searchPanel.classList.contains('is-open')) {
      searchPanel.classList.remove('is-open');
      searchToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', event => {
    if (!searchPanel.classList.contains('is-open')) return;
    if (searchPanel.contains(event.target) || searchToggle.contains(event.target)) return;
    searchPanel.classList.remove('is-open');
    searchToggle.setAttribute('aria-expanded', 'false');
  });
})();
