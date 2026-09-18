/**
 * Page headers — the title band at the top of each inner page.
 *
 * Each page's heading and standfirst used to live in its own markup, so
 * changing one meant editing HTML. They are records now; this replaces what
 * the page ships with once the admin answers, and leaves the markup exactly
 * as it is when it does not — a CMS outage must never blank a page's title.
 *
 * The page says which record it wants through `data-page-key` on the band.
 * A photograph on the record is placed *after* the page's first content
 * section rather than behind the title: these bands used to be 600px of
 * full-bleed photography that pushed everything a reader came for below the
 * fold, which is exactly what this replaces.
 */
(function () {
  var API = 'https://store-production-1570.up.railway.app/api/v1';

  var band = document.querySelector('.hx-page-hero[data-page-key]');
  if (!band) return;

  var key = band.getAttribute('data-page-key');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function apply(header) {
    if (!header) return;

    if (header.title) {
      var h1 = band.querySelector('h1');
      // The rule is a decorative bar inside the heading; keep it.
      if (h1) h1.innerHTML = esc(header.title) + ' <span class="hx-rule"></span>';
    }

    if (header.standfirst) {
      var p = band.querySelector('.hx-inner > p');
      if (p) p.textContent = header.standfirst;
    }

    if (header.image) {
      var main = document.querySelector('main.main');
      var firstBlock = main && main.querySelector('.hx-block');
      if (!firstBlock) return;

      var figure = document.createElement('figure');
      figure.className = 'hx-page-figure';
      figure.innerHTML = '<img src="' + esc(header.image) + '" alt="' + esc(header.title || '') + '" loading="lazy" decoding="async">';

      var inner = firstBlock.querySelector('.hx-inner');
      var head = inner && inner.querySelector('.hx-section-head');
      if (head && head.parentNode) head.parentNode.insertBefore(figure, head.nextSibling);
      else if (inner) inner.insertBefore(figure, inner.firstChild);
    }
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
