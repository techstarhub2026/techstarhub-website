/**
 * Pulls admin-managed events onto events.html.
 *
 * Same shape as site-content.js, courses-integration.js and
 * gallery-integration.js: one call to the shared admin API, and the events
 * already written into events.html are the fallback if it is unreachable,
 * slow, or empty.
 *
 * Expected response, at GET {API}/site/events:
 *   { "data": { "events": [ {
 *       "title":     "Arduino Day 2025",
 *       "startDate": "2025-03-24",       // required, yyyy-mm-dd
 *       "endDate":   "2025-03-25",       // optional; omit for a single day
 *       "location":  "Mtwara Technical High School, Mtwara",
 *       "image":     "<url>",
 *       "summary":   "<a sentence or two>",
 *       "tags":      ["Arduino Day", "Electronics"],
 *       "facts":     ["Open to students, developers and engineers", ...]
 *   }, ... ] } }
 *
 * Note what the admin does *not* supply: whether an event is past, upcoming
 * or running. That is derived from startDate/endDate by events-status.js on
 * every page load, so the admin's job is to enter a date once — the thing
 * they have to get right anyway — rather than to remember to come back and
 * re-flag every event the moment it finishes. An events list maintained by
 * hand drifts out of date the week nobody has time to check it; one derived
 * from dates cannot.
 */
(function () {
  'use strict';

  var API = 'https://store-production-1570.up.railway.app/api/v1';

  var section = document.getElementById('events');
  if (!section) return;
  var grid = section.querySelector('.hx-showcase');
  if (!grid) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** "2025-03-24" -> "24 March 2025", for the Key Facts line. */
  function humanDate(iso) {
    var parts = String(iso || '').split('-');
    if (parts.length !== 3) return '';
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];
    var m = months[+parts[1] - 1];
    if (!m) return '';
    return +parts[2] + ' ' + m + ' ' + parts[0];
  }

  function dateLine(ev) {
    var from = humanDate(ev.startDate);
    if (!from) return '';
    var to = ev.endDate && ev.endDate !== ev.startDate ? humanDate(ev.endDate) : '';
    return to ? from + ' – ' + to : from;
  }

  function render(events) {
    // An event with no start date has no place on a page organised entirely
    // around when things happen, and would be silently dropped by
    // events-status.js anyway — so it is filtered here rather than rendered
    // into a row that can never gain a badge or a status.
    var usable = events.filter(function (ev) { return ev && ev.startDate && ev.image; });
    if (!usable.length) return;

    grid.innerHTML = usable.map(function (ev) {
      var tags = (ev.tags || []).map(function (t) {
        return '<span>' + esc(t) + '</span>';
      }).join('');

      var facts = [];
      var when = dateLine(ev);
      if (when) facts.push('<li><i class="bi bi-calendar-event"></i> ' + esc(when) + '</li>');
      if (ev.location) facts.push('<li><i class="bi bi-geo-alt"></i> ' + esc(ev.location) + '</li>');
      (ev.facts || []).forEach(function (f) {
        facts.push('<li><i class="bi bi-check-circle-fill"></i> ' + esc(f) + '</li>');
      });

      return '<div class="hx-showcase-row" data-aos="fade-up"'
        + ' data-start="' + esc(ev.startDate) + '"'
        + (ev.endDate ? ' data-end="' + esc(ev.endDate) + '"' : '')
        + '>'
        + '<div class="hx-showcase-media">'
        + '<img src="' + esc(ev.image) + '" alt="' + esc(ev.title || 'Event') + '">'
        + '</div>'
        + '<div class="hx-showcase-body">'
        + (tags ? '<div class="hx-showcase-tags">' + tags + '</div>' : '<div class="hx-showcase-tags"></div>')
        + '<h3>' + esc(ev.title || '') + '</h3>'
        + (ev.summary ? '<p>' + esc(ev.summary) + '</p>' : '')
        + '<span class="hx-cta-group">'
        + '<a href="contact.html" class="hx-btn-primary">Get in Touch</a>'
        + '<a href="contact.html" class="hx-round-btn" aria-label="Get in touch about this event"><i class="bi bi-arrow-up-right"></i></a>'
        + '</span>'
        + (facts.length
            ? '<div class="hx-showcase-facts"><h4>Key Facts</h4><ul>' + facts.join('') + '</ul></div>'
            : '')
        + '</div>'
        + '</div>';
    }).join('');

    if (window.AOS && typeof window.AOS.refreshHard === 'function') window.AOS.refreshHard();

    // events-status.js has already run over the static rows and returned.
    // Re-running it is what stamps badges, statuses and the filter bar onto
    // this freshly-rendered set; it is written to be safe to call again.
    if (typeof window.hxRefreshEventStatus === 'function') window.hxRefreshEventStatus();
  }

  fetch(API + '/site/events')
    .then(function (res) {
      if (!res.ok) throw new Error('events unavailable');
      return res.json();
    })
    .then(function (json) {
      var d = (json && json.data) || {};
      render(d.events || []);
    })
    .catch(function () {
      /* keep the statically rendered events exactly as they are */
    });
})();
