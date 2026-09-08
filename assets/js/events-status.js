/**
 * Event status and filtering on events.html.
 *
 * Every event row carries machine-readable dates in its markup:
 *
 *   <div class="hx-showcase-row" data-start="2025-03-08" data-end="2025-03-09">
 *
 * `data-start` is required, `data-end` optional (a single-day event may omit
 * it, and is then treated as ending the same day it starts). Both are plain
 * ISO yyyy-mm-dd — the same format the admin API returns dates in, so an
 * admin-fed row and a hand-written fallback row are read identically.
 *
 * Status is *derived*, never authored. That is the whole point: an event
 * cannot sit on the site advertised as "upcoming" a year after it happened
 * because nobody remembered to go back and change a label. The admin sets a
 * date once — the thing they already have to get right — and the site keeps
 * itself honest from there.
 *
 *   past      end date is before today
 *   live      today falls between start and end (inclusive)
 *   upcoming  start date is after today
 *
 * Rows are then sorted so the most relevant events lead: live first, then
 * upcoming soonest-first, then past most-recent-first.
 *
 * Exposed as window.hxRefreshEventStatus so events-integration.js can call
 * it again over the rows it renders from the admin API, which arrive well
 * after this file's first pass. Every step below is written to be safe to
 * repeat: badges and pills are only added where absent, and the filter bar
 * is rebuilt from scratch rather than appended to.
 */
(function () {
  'use strict';

  var LABELS = {
    live: 'Happening now',
    upcoming: 'Upcoming',
    past: 'Past event'
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Parses yyyy-mm-dd into a local-midnight Date.
   *
   * `new Date('2025-03-08')` parses as UTC midnight, which in any timezone
   * behind UTC is still the 7th locally — an event would read as a day early
   * for every visitor west of Greenwich. Splitting the parts and building a
   * local date avoids that entirely.
   */
  function parseDate(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3) return null;
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function todayAtMidnight() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function statusOf(start, end) {
    var today = todayAtMidnight();
    if (end < today) return 'past';
    if (start > today) return 'upcoming';
    return 'live';
  }

  function run() {
    var section = document.getElementById('events');
    if (!section) return;

    var grid = section.querySelector('.hx-showcase');
    if (!grid) return;

    /* ── read the rows ───────────────────────────────────────────────── */
    var rows = [].slice.call(grid.querySelectorAll('.hx-showcase-row'));
    var entries = [];

    rows.forEach(function (row) {
      var start = parseDate(row.getAttribute('data-start'));
      if (!start) return;                    // no date: leave the row alone
      var end = parseDate(row.getAttribute('data-end')) || start;
      entries.push({ row: row, start: start, end: end, status: statusOf(start, end) });
    });

    if (!entries.length) return;

    /* ── stamp each row ──────────────────────────────────────────────── */
    entries.forEach(function (entry) {
      var row = entry.row;
      row.classList.toggle('is-past', entry.status === 'past');
      row.setAttribute('data-status', entry.status);

      // The date badge on the photograph.
      var media = row.querySelector('.hx-showcase-media');
      if (media && !media.querySelector('.hx-event-date')) {
        var badge = document.createElement('span');
        badge.className = 'hx-event-date';
        badge.innerHTML =
          '<span class="hx-event-date__month">' + MONTHS[entry.start.getMonth()] + '</span>' +
          '<span class="hx-event-date__day">' + entry.start.getDate() + '</span>' +
          '<span class="hx-event-date__year">' + entry.start.getFullYear() + '</span>';
        media.appendChild(badge);
      }

      // The status pill, first in the tag row.
      var tags = row.querySelector('.hx-showcase-tags');
      if (tags && !tags.querySelector('.hx-event-status')) {
        var pill = document.createElement('span');
        pill.className = 'hx-event-status hx-event-status--' + entry.status;
        pill.textContent = LABELS[entry.status];
        tags.insertBefore(pill, tags.firstChild);
      }
    });

    /* ── order them ──────────────────────────────────────────────────── */
    var RANK = { live: 0, upcoming: 1, past: 2 };
    entries.slice().sort(function (a, b) {
      if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
      // Upcoming: soonest first. Past: most recent first.
      return a.status === 'past' ? b.start - a.start : a.start - b.start;
    }).forEach(function (entry) {
      grid.appendChild(entry.row);
    });

    /* ── the filter bar ──────────────────────────────────────────────── */
    var counts = { all: entries.length, upcoming: 0, past: 0 };
    entries.forEach(function (e) {
      // A live event belongs under "Upcoming" for filtering purposes:
      // someone looking for something to attend wants to see the thing
      // running today.
      if (e.status === 'past') counts.past++;
      else counts.upcoming++;
    });

    var FILTERS = [
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'past', label: 'Past' },
      { key: 'all', label: 'All' }
    ];

    // Rebuilt rather than appended to, so a second run over admin-rendered
    // rows replaces the first pass's bar instead of stacking another below it.
    var existingBar = section.querySelector('.hx-event-filters');
    if (existingBar) existingBar.parentNode.removeChild(existingBar);
    var existingEmpty = section.querySelector('.hx-event-empty');
    if (existingEmpty) existingEmpty.parentNode.removeChild(existingEmpty);

    var bar = document.createElement('div');
    bar.className = 'hx-event-filters';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filter events');

    var empty = document.createElement('p');
    empty.className = 'hx-event-empty';
    empty.hidden = true;

    function apply(key) {
      var shown = 0;
      entries.forEach(function (e) {
        var match = key === 'all'
          || (key === 'past' && e.status === 'past')
          || (key === 'upcoming' && e.status !== 'past');
        e.row.hidden = !match;
        if (match) shown++;
      });

      empty.hidden = shown > 0;
      if (!shown) {
        empty.textContent = key === 'upcoming'
          ? 'No upcoming events are scheduled right now — take a look at what we have run before.'
          : 'Nothing here yet.';
      }

      [].forEach.call(bar.children, function (btn) {
        var on = btn.getAttribute('data-filter') === key;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    FILTERS.forEach(function (f) {
      var n = counts[f.key];
      if (!n && f.key !== 'all') return;     // don't offer an empty filter
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hx-event-filter';
      btn.setAttribute('data-filter', f.key);
      btn.innerHTML = f.label + '<span class="hx-event-filter__count">' + n + '</span>';
      btn.addEventListener('click', function () { apply(f.key); });
      bar.appendChild(btn);
    });

    grid.parentNode.insertBefore(bar, grid);
    grid.parentNode.insertBefore(empty, grid.nextSibling);

    // Open on whichever view actually has something in it: a hub with
    // nothing scheduled should show its history rather than an empty page.
    apply(counts.upcoming ? 'upcoming' : 'past');
  }

  window.hxRefreshEventStatus = run;
  run();
})();
