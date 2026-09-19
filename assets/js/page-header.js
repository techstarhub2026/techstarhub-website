/**
 * Page headers — the per-page title, standfirst and photograph.
 *
 * Each page's heading lived in its own markup, so changing one meant editing
 * HTML. They are records now. What the reader sees at the top of a page is
 * just a breadcrumb: the tall photographic band that used to sit there put
 * 600px of decoration above content, and repeated a heading each page's own
 * first section already carries.
 *
 * So a record's title and standfirst are written into that first section's
 * heading, and its photograph is placed inside the content — not above it.
 * The page's own markup is the fallback throughout: a CMS outage must never
 * blank a page.
 */
(function () {
  var API = 'https://store-production-1570.up.railway.app/api/v1';

  var intro = document.querySelector('.hx-page-intro[data-page-key]');
  if (!intro) return;

  var key = intro.getAttribute('data-page-key');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * The heading block of the page's first real section.
   *
   * Several pages have none: their section head only restated the page's own
   * title above the content, so it was removed along with the photographic
   * band. Those pages open straight into their content and a record's title
   * and standfirst have nowhere to go, which is intended — everything below
   * tolerates a missing head rather than creating one.
   */
  function firstHead() {
    var main = document.querySelector('main.main');
    return main ? main.querySelector('.hx-section-head') : null;
  }

  function apply(header) {
    if (!header) return;

    var head = firstHead();

    if (head && header.title) {
      var h2 = head.querySelector('h2');
      // Only replace a heading the page has not already personalised with
      // markup of its own — an <h2> carrying spans is a designed thing.
      if (h2 && h2.children.length === 0) h2.textContent = header.title;
    }

    if (head && header.standfirst) {
      var p = head.querySelector('p');
      if (p) p.textContent = header.standfirst;
      else {
        var added = document.createElement('p');
        added.textContent = header.standfirst;
        head.appendChild(added);
      }
    }

    if (!header.image) return;

    var figure = document.createElement('figure');
    figure.className = 'hx-page-figure';
    figure.innerHTML = '<img src="' + esc(header.image) + '" alt="' +
      esc(header.title || '') + '" loading="lazy" decoding="async">';

    // Placing it after the first heading was still the top of the page: on
    // most pages that heading opens the document, so the photograph landed
    // exactly where the band used to be and read as the same thing.
    //
    // A page says where its photograph belongs by carrying a slot. Without
    // one it gets no photograph at all, which is the outcome to prefer —
    // these pages are meant to open with their own content.
    var slot = document.querySelector('[data-page-figure]');
    if (slot) slot.appendChild(figure);
  }

  fetch(API + '/site/page-headers')
    .then(function (res) {
      if (!res.ok) throw new Error('page headers unavailable');
      return res.json();
    })
    .then(function (json) {
      var headers = (json && json.data && json.data.headers) || {};
      apply(headers[key]);
    })
    .catch(function () { /* keep whatever the page already says */ });
})();
