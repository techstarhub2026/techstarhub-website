/**
 * Programme pages — the five bootcamps behind the Programs menu.
 *
 * Their wording lived only in each page's markup, and the admin screen that
 * appeared to edit them wrote to a table nothing on this site ever read: a
 * save succeeded, and the page never changed. They are records now.
 *
 * Matched by the page's own data-page-key (program-stem, program-kids, …)
 * against the slug of the record, so renaming a programme in the admin does
 * not break the link between them.
 *
 * The markup is the fallback throughout. A CMS outage leaves each page saying
 * exactly what it says today.
 */
(function () {
  var API = 'https://store.techstarhub.or.tz/api/v1';

  var intro = document.querySelector('.hx-page-intro[data-page-key]');
  if (!intro) return;

  var key = intro.getAttribute('data-page-key');
  if (key.indexOf('program-') !== 0) return;

  var body = document.querySelector('.hx-showcase-body');
  if (!body) return;

  fetch(API + '/site/programs')
    .then(function (res) {
      if (!res.ok) throw new Error('programs unavailable');
      return res.json();
    })
    .then(function (json) {
      var rows = (json && json.data) || [];
      if (!rows.length) return;

      // The page's key is program-stem; the record's slug is whatever the
      // admin generated from its title. Match on the tail of the key, and
      // fall back to position for the pages whose slug has since drifted.
      var tail = key.replace('program-', '');
      var row = rows.filter(function (r) {
        return (r.slug || '').indexOf(tail) !== -1;
      })[0];

      if (!row) {
        var order = ['stem', 'kids', 'trainer', 'youth', 'girls'];
        row = rows[order.indexOf(tail)];
      }
      if (!row) return;

      if (row.title) {
        var h2 = body.querySelector('h2');
        if (h2 && h2.children.length === 0) h2.textContent = 'More about the ' + row.title;
      }

      if (row.excerpt) {
        var p = body.querySelector('p');
        if (p) p.textContent = row.excerpt;
      }

      if (row.image && row.image.lg) {
        var img = document.querySelector('.hx-showcase-media img');
        if (img) {
          img.src = row.image.lg;
          img.alt = row.title || img.alt;
        }
      }
    })
    .catch(function () { /* keep whatever the page already says */ });
})();
