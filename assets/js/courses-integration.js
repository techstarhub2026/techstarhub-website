/**
 * Pulls the live course catalogue from UjuziPlus.
 *
 * UjuziPlus is the learning platform and owns all course data; this page only
 * renders it. Nothing is duplicated into another database, so a course edited
 * there shows the change here on the next load.
 *
 * Drives two surfaces, whichever is present on the page:
 *   #ujuzi-courses-grid   — the full catalogue on courses.html (with filters)
 *   #ujuzi-course-teaser  — a short taster rail on the home page
 *
 * Degradation differs by surface: the courses page shows an explanation and a
 * route onward (the catalogue is that page's whole point), while the home-page
 * teaser removes itself silently rather than putting an error on the shop
 * window.
 */
(function () {
  var API = 'https://ujuziplus-production-99b7.up.railway.app/api/public/courses';

  var grid = document.getElementById('ujuzi-courses-grid');
  // The catalogue is split either side of the page intro, so the opening row
  // of courses sits above it and the remainder continues below.
  var gridRest = document.getElementById('ujuzi-courses-grid-rest');
  var FIRST_ROW = 3;
  var teaser = document.getElementById('ujuzi-course-teaser');
  if (!grid && !teaser) return;

  var filterBar = document.getElementById('ujuzi-course-filters');
  var countEl = document.getElementById('ujuzi-course-count');

  function setCount(n, cat) {
    if (!countEl) return;
    countEl.textContent = n === 0
      ? 'No courses in this category'
      : n + (n === 1 ? ' course' : ' courses') + (cat && cat !== 'All' ? ' in ' + cat : ' available now');
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function titleCase(v) {
    return String(v || '').charAt(0) + String(v || '').slice(1).toLowerCase();
  }

  function priceLabel(c) {
    if (c.isFree) return 'Free';
    var amount = c.discountPrice != null ? c.discountPrice : c.price;
    if (amount == null) return '';
    return 'TZS ' + Number(amount).toLocaleString();
  }

  /**
   * The course card.
   *
   * Ordered the way somebody deciding whether to enrol actually reads it:
   * picture, then title, then who is teaching, then the shape of the course
   * (category / hours / modules), then how many people are already on it, and
   * finally a footer strip carrying the price against the action. The footer
   * is separated by a rule so it reads as a control rather than a last line of
   * text, the same reason a checkout total sits in its own band.
   *
   * The star rating that appears on the UjuziPlus card is deliberately left
   * out - `rating` is not a stored column there, so there is no real figure
   * to show and inventing one would be worse than omitting it.
   *
   * The enrolment figure moved out of the meta row onto a line of its own. It
   * is the strongest thing on the card for a hesitant learner, and sitting
   * between a clock icon and a module count it was being read as trivia.
   */
  function card(c, colClass) {
    var meta = '<span class="uj-meta-item"><i class="bi bi-bookmark"></i>'
      + esc(c.category || 'Course') + '</span>';
    if (c.durationHours) {
      meta += '<span class="uj-meta-item"><i class="bi bi-clock"></i>' + esc(c.durationHours) + 'h</span>';
    }
    if (c.moduleCount) {
      meta += '<span class="uj-meta-item"><i class="bi bi-collection-play"></i>'
        + c.moduleCount + (c.moduleCount === 1 ? ' module' : ' modules') + '</span>';
    }

    // Only claimed once there is a number worth claiming; "1 learner" sells
    // nothing and reads as an empty room.
    var proof = Number(c.enrollmentCount) >= 10
      ? '<div class="uj-card__proof"><i class="bi bi-people-fill"></i>'
        + Number(c.enrollmentCount).toLocaleString() + ' learners enrolled</div>'
      : '';

    // "Free" is not badged over the picture as well as priced in the footer.
    // Two identical words on one card is noise, and the footer is where the
    // eye goes for cost. The badge is reserved for what the footer cannot say
    // on its own.
    var badges = '';
    if (!c.isFree && c.discountPrice != null) badges += '<span class="uj-badge uj-badge--sale">Sale</span>';

    var priceBlock;
    if (c.isFree) {
      priceBlock = '<span class="uj-price-free">Free</span>';
    } else {
      var amount = c.discountPrice != null ? c.discountPrice : c.price;
      var original = c.discountPrice != null && c.price != null
        ? '<span class="uj-price-was">TZS ' + Number(c.price).toLocaleString() + '</span>' : '';
      priceBlock = '<span class="uj-price">TZS ' + Number(amount).toLocaleString() + '</span>' + original;
    }

    // The instructor's initial, drawn as a disc, so the byline reads as a
    // person rather than another grey line under the title.
    var who = '';
    if (c.instructor) {
      var initial = String(c.instructor).trim().charAt(0).toUpperCase();
      who = '<p class="uj-card__subtitle">'
        + '<span class="uj-card__who" aria-hidden="true">' + esc(initial) + '</span>'
        + esc(c.instructor) + '</p>';
    }

    return '<div class="' + colClass + ' d-flex align-items-stretch">'
      + '<a class="uj-card px-lit" href="' + esc(c.url) + '" target="_blank" rel="noopener">'
      + '<div class="uj-card__media">'
      + (c.thumbnail
          ? '<img src="' + esc(c.thumbnail) + '" alt="' + esc(c.title) + '" loading="lazy" decoding="async">'
          : '')
      + (badges ? '<div class="uj-card__badges">' + badges + '</div>' : '')
      + '<span class="uj-card__play" aria-hidden="true"><i class="bi bi-play-fill"></i></span>'
      + '</div>'
      + '<div class="uj-card__body">'
      + '<h3 class="uj-card__title">' + esc(c.title) + '</h3>'
      + who
      + '<div class="uj-card__meta">' + meta + '</div>'
      + proof
      + '</div>'
      + '<div class="uj-card__footer">' + priceBlock
      + '<span class="uj-card__go" aria-hidden="true"><span>View course</span>'
      + '<i class="bi bi-arrow-right"></i></span>'
      + '</div>'
      + '</a></div>';
  }

  /** Removes the whole section a container sits in, heading included. */
  function dropSection(el) {
    if (!el) return;
    var section = el.closest('section');
    if (section) section.remove(); else el.remove();
  }

  /**
   * On the courses page the catalogue *is* the page, so an outage shows a
   * short explanation and a way onward rather than deleting the main content
   * and leaving a visitor staring at supporting copy. The home-page teaser is
   * secondary, so that one still removes itself silently.
   */
  function showUnavailable() {
    if (teaser) dropSection(teaser);
    if (gridRest) dropSection(gridRest);
    if (!grid) return;
    if (countEl) countEl.textContent = '';
    grid.innerHTML = '<div class="col-12"><div class="ujuzi-empty">'
      + '<i class="bi bi-wifi-off"></i>'
      + '<h3>Course catalogue is temporarily unavailable</h3>'
      + '<p>We could not load the course list just now. Please try again shortly, '
      + 'or get in touch and we will help you find the right programme.</p>'
      + '<a href="contact.html" class="hx-btn-primary">Contact Us</a>'
      + '</div></div>';
  }

  /** Paints a set of courses across the opening row and the block below it. */
  function paint(list) {
    if (!grid) return;
    var html = function (arr) {
      return arr.map(function (c) { return card(c, 'col-lg-4 col-md-6'); }).join('');
    };
    grid.innerHTML = html(list.slice(0, FIRST_ROW));
    if (gridRest) {
      gridRest.innerHTML = html(list.slice(FIRST_ROW));
      // An empty trailing block would leave a stray gap under the intro.
      var restSection = gridRest.closest('section');
      if (restSection) restSection.style.display = list.length > FIRST_ROW ? '' : 'none';
    }
  }

  function renderFilters(courses) {
    if (!filterBar) return;
    var cats = [];
    courses.forEach(function (c) {
      if (c.category && cats.indexOf(c.category) === -1) cats.push(c.category);
    });
    if (!cats.length) return;

    filterBar.innerHTML = ['All'].concat(cats).map(function (cat, i) {
      return '<button type="button" class="ujuzi-filter' + (i === 0 ? ' is-on' : '')
        + '" data-cat="' + esc(cat) + '">' + esc(cat) + '</button>';
    }).join('');

    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.ujuzi-filter');
      if (!btn) return;
      var cat = btn.dataset.cat;
      [].forEach.call(filterBar.querySelectorAll('.ujuzi-filter'), function (b) {
        b.classList.toggle('is-on', b === btn);
      });
      var shown = cat === 'All' ? courses : courses.filter(function (c) { return c.category === cat; });
      paint(shown);
      setCount(shown.length, cat);
      if (window.AOS && window.AOS.refreshHard) window.AOS.refreshHard();
    });
  }

  fetch(API)
    .then(function (res) {
      if (!res.ok) throw new Error('catalogue unavailable');
      return res.json();
    })
    .then(function (json) {
      var courses = (json && json.data) || [];
      if (!courses.length) {
        showUnavailable();
        return;
      }

      if (grid) {
        paint(courses); // replaces the loading skeletons in both grids
        setCount(courses.length);
        renderFilters(courses);
      }
      if (teaser) {
        teaser.innerHTML = courses.slice(0, 3)
          .map(function (c) { return card(c, 'col-lg-4 col-md-6'); }).join('');
      }
      if (window.AOS && window.AOS.refreshHard) window.AOS.refreshHard();
    })
    .catch(showUnavailable);
})();
