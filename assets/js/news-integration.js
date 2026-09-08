/**
 * Pulls the live news feed from the TechStar Store's blog engine.
 *
 * The store owns article publishing (draft/published workflow, cover images,
 * comments); this page only renders what's already public there. Full
 * reading — and commenting — happens on the store, at /blog/:slug, the same
 * way courses-integration.js sends a learner to UjuziPlus to actually enrol.
 *
 * Splits across the opening row and the block below the page intro, exactly
 * like courses-integration.js, and degrades the same way: an outage on this,
 * the page's whole point, shows a short explanation and a way onward rather
 * than leaving the page blank.
 */
(function () {
  var API = 'https://store-production-1570.up.railway.app/api/v1';
  var BLOG = 'https://store-production-1570.up.railway.app/blog/';

  var grid = document.getElementById('hx-news-grid');
  var gridRest = document.getElementById('hx-news-grid-rest');
  var FIRST_ROW = 3;
  if (!grid) return;

  var countEl = document.getElementById('hx-news-count');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setCount(n) {
    if (!countEl) return;
    countEl.textContent = n === 0 ? 'No news yet' : n + (n === 1 ? ' article' : ' articles');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function card(a) {
    var href = BLOG + encodeURIComponent(a.slug);
    var date = formatDate(a.publishedAt);

    return '<div class="col-lg-4 col-md-6 d-flex align-items-stretch">'
      + '<a class="uj-card px-lit" href="' + esc(href) + '" target="_blank" rel="noopener">'
      + '<div class="uj-card__media">'
      + (a.coverImage && a.coverImage.md
          ? '<img src="' + esc(a.coverImage.md) + '" alt="' + esc(a.title) + '" loading="lazy" decoding="async">'
          : '')
      + '<span class="uj-card__play" aria-hidden="true"><i class="bi bi-arrow-up-right"></i></span>'
      + '</div>'
      + '<div class="uj-card__body">'
      + '<h3 class="uj-card__title">' + esc(a.title) + '</h3>'
      + (a.excerpt ? '<p class="uj-card__subtitle">' + esc(a.excerpt) + '</p>' : '')
      + (date ? '<div class="uj-card__meta"><span class="uj-meta-item">'
          + '<i class="bi bi-calendar3"></i>' + esc(date) + '</span></div>' : '')
      + '</div>'
      + '<div class="uj-card__footer">'
      + '<span class="uj-card__go" aria-hidden="true"><span>Read more</span>'
      + '<i class="bi bi-arrow-right"></i></span>'
      + '</div>'
      + '</a></div>';
  }

  function showUnavailable() {
    if (gridRest) { var restSection = gridRest.closest('section'); if (restSection) restSection.style.display = 'none'; }
    if (countEl) countEl.textContent = '';
    grid.innerHTML = '<div class="col-12"><div class="ujuzi-empty">'
      + '<i class="bi bi-wifi-off"></i>'
      + '<h3>News is temporarily unavailable</h3>'
      + '<p>We could not load the news feed just now. Please try again shortly.</p>'
      + '<a href="contact.html" class="hx-btn-primary">Contact Us</a>'
      + '</div></div>';
  }

  function showEmpty() {
    if (gridRest) { var restSection = gridRest.closest('section'); if (restSection) restSection.style.display = 'none'; }
    setCount(0);
    grid.innerHTML = '<div class="col-12"><div class="ujuzi-empty">'
      + '<i class="bi bi-newspaper"></i>'
      + '<h3>No news yet</h3>'
      + '<p>Check back soon for updates and announcements from TechStar Innovation Hub.</p>'
      + '</div></div>';
  }

  fetch(API + '/articles?pageSize=9')
    .then(function (res) {
      if (!res.ok) throw new Error('news unavailable');
      return res.json();
    })
    .then(function (json) {
      var articles = (json && json.data) || [];
      if (!articles.length) {
        showEmpty();
        return;
      }
      grid.innerHTML = articles.slice(0, FIRST_ROW).map(card).join('');
      if (gridRest) {
        var rest = articles.slice(FIRST_ROW);
        gridRest.innerHTML = rest.map(card).join('');
        var restSection = gridRest.closest('section');
        if (restSection) restSection.style.display = rest.length ? '' : 'none';
      }
      setCount(articles.length);
      if (window.AOS && window.AOS.refreshHard) window.AOS.refreshHard();
    })
    .catch(showUnavailable);
})();
