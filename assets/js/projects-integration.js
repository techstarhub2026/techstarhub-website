/**
 * Pulls the live project list from the TechStar admin console.
 *
 * Same admin, same API family as site-content.js and events-integration.js —
 * projects are authored under "Projects" in the console (the underlying
 * `/admin/site/projects` table also backs the Programs menu's five bootcamp
 * pages, but this feed only surfaces the ones with an ongoing/completed
 * status, which the programme pages don't set).
 *
 * Split across two grids by `status`:
 *   #hx-projects-ongoing    — work currently in progress
 *   #hx-projects-completed  — delivered work
 *
 * Progressive like the rest of the site: the skeleton placeholders already in
 * projects.html render first, and are only replaced once real data arrives.
 * An unreachable API leaves each section with a plain "check back soon"
 * message rather than blanking the page.
 */
(function () {
  var API = 'https://store-production-1570.up.railway.app/api/v1';

  var ongoingGrid = document.getElementById('hx-projects-ongoing');
  var completedGrid = document.getElementById('hx-projects-completed');
  if (!ongoingGrid && !completedGrid) return;

  var ongoingCount = document.getElementById('hx-project-count-ongoing');
  var completedCount = document.getElementById('hx-project-count-completed');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * The excerpt is the admin's own short summary — written for this card,
   * unlike the full contentHtml body which belongs to a detail page this
   * site does not yet have. No excerpt just means no second line, not a
   * fallback built from the rich content (that would drag in markup).
   */
  function card(p) {
    var link = p.linkUrl || '';
    var external = /^https?:/i.test(link);
    var target = external ? ' target="_blank" rel="noopener"' : '';
    var action = link
      ? '<span class="uj-card__go" aria-hidden="true"><span>Learn more</span>'
        + '<i class="bi bi-arrow-right"></i></span>'
      : '';

    var inner = '<div class="uj-card__media">'
      + (p.image && p.image.md
          ? '<img src="' + esc(p.image.md) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async">'
          : '')
      + '</div>'
      + '<div class="uj-card__body">'
      + '<h3 class="uj-card__title">' + esc(p.title) + '</h3>'
      + (p.excerpt ? '<p class="uj-card__subtitle">' + esc(p.excerpt) + '</p>' : '')
      + '</div>'
      + (action ? '<div class="uj-card__footer">' + action + '</div>' : '');

    var col = '<div class="col-lg-4 col-md-6 d-flex align-items-stretch">';
    return link
      ? col + '<a class="uj-card px-lit" href="' + esc(link) + '"' + target + '>' + inner + '</a></div>'
      : col + '<div class="uj-card px-lit">' + inner + '</div></div>';
  }

  function emptyState(kind) {
    return '<div class="col-12"><div class="ujuzi-empty">'
      + '<i class="bi bi-kanban"></i>'
      + '<h3>No ' + kind + ' projects yet</h3>'
      + '<p>Check back soon, or get in touch to hear what we&rsquo;re working on.</p>'
      + '<a href="contact.html" class="hx-btn-primary">Contact Us</a>'
      + '</div></div>';
  }

  function unavailable(grid, countEl) {
    if (countEl) countEl.textContent = '';
    if (!grid) return;
    grid.innerHTML = '<div class="col-12"><div class="ujuzi-empty">'
      + '<i class="bi bi-wifi-off"></i>'
      + '<h3>Projects are temporarily unavailable</h3>'
      + '<p>We could not load the project list just now. Please try again shortly.</p>'
      + '<a href="contact.html" class="hx-btn-primary">Contact Us</a>'
      + '</div></div>';
  }

  function setCount(el, n) {
    if (!el) return;
    el.textContent = n === 0 ? '' : n + (n === 1 ? ' project' : ' projects');
  }

  function paint(grid, countEl, list, kind) {
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = emptyState(kind);
      setCount(countEl, 0);
      return;
    }
    grid.innerHTML = list.map(card).join('');
    setCount(countEl, list.length);
  }

  fetch(API + '/site/projects')
    .then(function (res) {
      if (!res.ok) throw new Error('project list unavailable');
      return res.json();
    })
    .then(function (json) {
      var all = (json && json.data) || [];
      var ongoing = all.filter(function (p) { return p.status !== 'completed'; });
      var completed = all.filter(function (p) { return p.status === 'completed'; });

      paint(ongoingGrid, ongoingCount, ongoing, 'ongoing');
      paint(completedGrid, completedCount, completed, 'completed');

      if (window.AOS && window.AOS.refreshHard) window.AOS.refreshHard();
    })
    .catch(function () {
      unavailable(ongoingGrid, ongoingCount);
      unavailable(completedGrid, completedCount);
    });
})();
