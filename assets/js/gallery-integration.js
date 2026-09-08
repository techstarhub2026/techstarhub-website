/**
 * Pulls admin-managed photos onto gallery.html.
 *
 * Follows the same shape as site-content.js and courses-integration.js: one
 * call to the shared admin API, and the static twelve photos already in
 * gallery.html's markup are the fallback if it is unreachable, slow, or
 * returns nothing — a CMS outage must never blank the gallery.
 *
 * Expected response, at GET {API}/site/gallery:
 *   { "data": { "gallery": [ { "image": "<url>", "caption": "<short text>" }, ... ] } }
 *
 * `image` is required; `caption` is optional — a photo with no caption
 * simply shows no hover label (see .hx-gallery-item__caption:empty in
 * premium.css) rather than an empty bar. There is no separate admin-facing
 * document for this: this file's own header is the contract the admin
 * console's gallery editor needs to satisfy, and site-content.js's matching
 * comment is the model this was written to match.
 */
(function () {
  var API = 'https://store-production-1570.up.railway.app/api/v1';

  var grid = document.getElementById('gallery-grid');
  if (!grid) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderGallery(items) {
    if (!items.length) return;

    grid.innerHTML = items.map(function (item) {
      var image = item.image || '';
      var caption = item.caption || '';
      var alt = caption || 'Gallery photo';

      return '<a class="hx-gallery-item glightbox" href="' + esc(image) + '"'
        + (caption ? ' data-glightbox="title: ' + esc(caption) + '"' : '')
        + '>'
        + '<img src="' + esc(image) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">'
        + '<span class="hx-gallery-item__caption">' + esc(caption) + '</span>'
        + '<span class="hx-gallery-item__icon"><i class="bi bi-arrows-angle-expand"></i></span>'
        + '</a>';
    }).join('');

    // GLightbox binds to .glightbox at page load, before this markup exists —
    // rebuild it over the fresh anchors the same way main.js built it once.
    if (typeof window.GLightbox === 'function') {
      window.GLightbox({ selector: '.glightbox' });
    }

    // Newly-inserted nodes carry data-aos attributes AOS has not seen.
    if (window.AOS && typeof window.AOS.refreshHard === 'function') window.AOS.refreshHard();
  }

  fetch(API + '/site/gallery')
    .then(function (res) {
      if (!res.ok) throw new Error('gallery unavailable');
      return res.json();
    })
    .then(function (json) {
      var d = (json && json.data) || {};
      renderGallery(d.gallery || []);
    })
    .catch(function () {
      /* keep the statically rendered twelve photos exactly as they are */
    });
})();
