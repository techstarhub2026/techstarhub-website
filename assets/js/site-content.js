/**
 * Hydrates the home page from the TechStar admin.
 *
 * The hero carousel, highlight cards and impact counters are authored in the
 * admin console and served by /api/v1/site/home. Everything here is
 * *progressive*: the markup already in index.html renders on its own, and is
 * only replaced once real content arrives. If the API is unreachable, slow, or
 * returns an empty set, the page keeps exactly what it shipped with — a CMS
 * outage must never blank the front page.
 */
(function () {
  var API = 'https://store-production-1570.up.railway.app/api/v1';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ── hero carousel ──────────────────────────────────────────────────
  function renderHero(slides) {
    var inner = document.querySelector('#heroCarousel .carousel-inner');
    var tabs = document.getElementById('hx-hero-tabs');
    if (!inner || !tabs || !slides.length) return;

    inner.innerHTML = slides.map(function (s, i) {
      // A slide with no image keeps the branded gradient used by the store slide.
      var bg = s.image
        ? '<div class="hx-hero-bg" style="background-image: url(' + esc(s.image) + ')"></div>'
        : '<div class="hx-hero-bg hx-hero-bg--store" aria-hidden="true"></div>';

      var external = /^https?:/i.test(s.buttonUrl || '');
      var target = external ? ' target="_blank" rel="noopener"' : '';
      var button = s.buttonText && s.buttonUrl
        ? '<div class="hx-hero-buttons"><span class="hx-cta-group">'
          + '<a href="' + esc(s.buttonUrl) + '"' + target + ' class="hx-btn-primary">' + esc(s.buttonText) + '</a>'
          + '<a href="' + esc(s.buttonUrl) + '"' + target + ' class="hx-round-btn" aria-label="' + esc(s.buttonText) + '">'
          + '<i class="bi bi-arrow-up-right"></i></a>'
          + '</span></div>'
        : '';

      // Optional foreground art fills the empty half of the banner beside
      // the copy — for the store slide that is the TechStar Store mark.
      var art = s.artwork
        ? '<div class="hx-hero-art"><img src="' + esc(s.artwork) + '" alt="" loading="lazy"></div>'
        : '';

      return '<div class="carousel-item' + (i === 0 ? ' active' : '') + '">'
        + bg
        + '<div class="hx-hero-body"><div class="hx-hero-copy">'
        + '<h2>' + esc(s.title) + ' <span class="hx-rule"></span></h2>'
        + (s.subtitle ? '<p>' + esc(s.subtitle) + '</p>' : '')
        + button
        + '</div>' + art + '</div></div>';
    }).join('');

    tabs.innerHTML = slides.map(function (s, i) {
      return '<button type="button"' + (i === 0 ? ' class="active"' : '')
        + ' data-bs-target="#heroCarousel" data-bs-slide-to="' + i + '">'
        + esc(s.tabLabel) + '</button>';
    }).join('');

    // Bootstrap bound itself to the markup we just replaced — rebuild it.
    if (window.bootstrap && window.bootstrap.Carousel) {
      var el = document.getElementById('heroCarousel');
      var existing = window.bootstrap.Carousel.getInstance(el);
      if (existing) existing.dispose();
      window.bootstrap.Carousel.getOrCreateInstance(el, { interval: 6000, ride: 'carousel' });
    }
  }

  // ── highlight cards ────────────────────────────────────────────────
  function renderHighlights(cards) {
    var grid = document.querySelector('.hx-highlights .hx-grid');
    if (!grid || !cards.length) return;

    grid.innerHTML = cards.map(function (c, i) {
      var link = c.linkUrl || '#';
      var external = /^https?:/i.test(link);
      var target = external ? ' target="_blank" rel="noopener"' : '';
      var arrow = '<a href="' + esc(link) + '"' + target + ' class="hx-round-btn" aria-label="' + esc(c.title) + '">'
        + '<i class="bi bi-arrow-up-right"></i></a>';
      var delay = i ? ' data-aos-delay="' + (i * 100) + '"' : '';

      // The orange card uses the site's alternate layout: image first, then
      // the label and title beneath it.
      if (c.variant === 'orange') {
        return '<article class="hx-card hx-card--orange" data-aos="fade-up"' + delay + '>'
          + '<div class="hx-card-blob">'
          + (c.image ? '<img src="' + esc(c.image) + '" alt="' + esc(c.title) + '" loading="lazy" decoding="async">' : '')
          + '</div>'
          + '<div class="hx-card-foot"><span class="hx-pill">' + esc(c.pill) + '</span>'
          + '<div class="hx-card-bottom"><h3>' + esc(c.title) + '</h3>' + arrow + '</div>'
          + '</div></article>';
      }

      return '<article class="hx-card hx-card--navy" data-aos="fade-up"' + delay + '>'
        + '<div class="hx-card-top"><span class="hx-pill">' + esc(c.pill) + '</span>' + arrow + '</div>'
        + '<h3>' + esc(c.title) + '</h3>'
        + '<div class="hx-card-media">'
        + (c.image ? '<img src="' + esc(c.image) + '" alt="' + esc(c.title) + '" loading="lazy" decoding="async">' : '')
        + '<span class="hx-play-dot"><i class="bi bi-arrow-up-right"></i></span>'
        + '</div></article>';
    }).join('');
  }

  // ── services ───────────────────────────────────────────────────────
  /**
   * Trims an excerpt to one terse clause for a services card's description
   * line. The admin's excerpt field is written as a full sentence for the
   * rich-text view elsewhere, but a card in this grid wants a line, not a
   * paragraph. Cuts at the first comma or period under ~60 characters;
   * failing that, cuts at the last whole word under the limit and adds an
   * ellipsis.
   */
  function shorten(text) {
    var s = String(text || '').trim();
    if (s.length <= 60) return s.replace(/[.,]$/, '');
    var head = s.slice(0, 60);
    var lastBreak = Math.max(head.lastIndexOf(', '), head.lastIndexOf('. '));
    if (lastBreak > 20) return head.slice(0, lastBreak);
    var lastSpace = head.lastIndexOf(' ');
    return head.slice(0, lastSpace > 20 ? lastSpace : 60) + '…';
  }

  /**
   * A card title sits on one line beside its category label, so it has room
   * for a couple of words — the site's actual service names are full phrases
   * ("Digital Skills, Coding, AI, and IoT Training"), which wrap to three
   * lines there and shove the description out of alignment with the card
   * next to it. This curated map is what keeps the titles scannable: a
   * short, punchy label per known service.
   *
   * The full name is never lost — it becomes the media link's `aria-label`
   * in renderServices() below, so it's still what a screen reader announces
   * and still exactly what the admin wrote, and it's this map that's out of
   * date if a heading changes, not the CMS record.
   */
  var SERVICE_SHORT_LABELS = {
    'Digital Skills, Coding, AI, and IoT Training': 'Coding & AI',
    'ICT and Digital Solution Consulting': 'ICT Consulting',
    'Prototyping and Testing': 'Prototyping',
    'PCB Design and Development': 'PCB Design',
    '3D Printing and Scanning': '3D Printing',
    'TechStar STEM and IoT - Robotics Kits': 'Robotics Kits'
  };

  /**
   * Falls back to a short label for any service an admin adds later that
   * isn't in the curated map above — takes the first clause of the heading
   * (up to a comma or " and ") and caps it at 20 characters, so a new,
   * unanticipated heading degrades to something that still fits the giant
   * type instead of silently reintroducing the wrapped-list bug.
   */
  function shortLabel(heading) {
    var known = SERVICE_SHORT_LABELS[heading];
    if (known) return known;
    var head = String(heading || '').split(/,| and /i)[0].trim();
    return head.length > 20 ? head.slice(0, 20).trim() + '…' : head;
  }

  /**
   * Six of the site's own service categories, one per card, filling the
   * editorial grid in index.html. Each card carries a media link, a short
   * title beside a category label, and a description line.
   *
   * The layout's staggered rhythm comes from a fixed six-item span cycle in
   * CSS (`.hx-ed-a` through `.hx-ed-f`, alternating 7- and 5-column spans
   * with vertical offsets), so the class is assigned by position and the
   * cycle simply repeats if an admin ever adds a seventh service — a longer
   * list keeps the same rhythm rather than falling out of the grid. The
   * three aspect ratios cycle on their own, shorter, period so that two
   * cards sitting side by side are never the same shape.
   *
   * The category label and the description are both handled below rather
   * than taken straight from the API — see SERVICE_CATEGORIES and
   * describe().
   */
  var ED_SPANS = ['hx-ed-a', 'hx-ed-b', 'hx-ed-c', 'hx-ed-d', 'hx-ed-e', 'hx-ed-f'];
  var ED_RATIOS = ['ar-32', 'ar-34', 'ar-34', 'ar-32', 'ar-43', 'ar-34'];

  /**
   * The category label beside each title. The admin API has no such field,
   * and falling back to one constant for every card produced six identical
   * labels down the page — a column of noise that said nothing about any of
   * the six offers. So it is derived from the service instead, the same way
   * shortLabel() derives the title: a curated word per known service, and
   * for anything an admin adds later, nothing at all. An absent label simply
   * leaves the title with the row to itself, which reads as deliberate;
   * a wrong or repeated one does not.
   */
  var SERVICE_CATEGORIES = {
    'Digital Skills, Coding, AI, and IoT Training': 'Training',
    'ICT and Digital Solution Consulting': 'Advisory',
    'Prototyping and Testing': 'Engineering',
    'PCB Design and Development': 'Hardware',
    '3D Printing and Scanning': 'Fabrication',
    'TechStar STEM and IoT - Robotics Kits': 'STEM & IoT'
  };

  /**
   * The description line under each title. The layout this section follows
   * sets its copy as a bolded label plus a clause, twice — what a learner
   * starts with, and where that leads — and that two-beat structure is a
   * good part of why the grid reads as a set of routes rather than a list of
   * topics. A plain excerpt from the API is one flat clause and loses it, so
   * the pairs are curated per known service here.
   *
   * Anything an admin adds later falls back to its own trimmed excerpt: one
   * card reading as a plain sentence among five structured ones is a much
   * smaller problem than a card whose stated path is invented.
   */
  var SERVICE_PATHS = {
    'Digital Skills, Coding, AI, and IoT Training':
      ['digital skills, coding, AI and IoT', 'bootcamp → project build → certification'],
    'ICT and Digital Solution Consulting':
      ['a digital transformation roadmap', 'cloud setup → team training → support'],
    'Prototyping and Testing':
      ['an idea turned into a working model', 'testing → refinement → production'],
    'PCB Design and Development':
      ['a custom board designed to spec', 'validation → small batch → assembly'],
    '3D Printing and Scanning':
      ['rapid prototypes and digital replicas', 'scanning → iteration → finished parts'],
    'TechStar STEM and IoT - Robotics Kits':
      ['affordable, hands-on learning kits', 'classroom → club → competition']
  };

  function describe(service) {
    var pair = SERVICE_PATHS[service.heading];
    if (!pair) return esc(shorten(service.excerpt));
    return '<b>Start:</b> ' + esc(pair[0]) + '. <b>Path:</b> ' + esc(pair[1]) + '.';
  }

  function renderServices(services) {
    var grid = document.querySelector('.hx-editorial');
    if (!grid || !services.length) return;

    grid.innerHTML = services.map(function (s, i) {
      // Only a link the admin actually set for this service. There used to be
      // a `|| 'courses.html'` fallback here, which meant a service with no
      // link of its own — 3D Printing, PCB Design — still rendered as a
      // clickable card that dropped the visitor on the course catalogue,
      // somewhere with nothing to do with what they clicked. A card with
      // nowhere specific to go is now simply not a link.
      var href = s.linkUrl || '';
      var external = /^https?:/i.test(href);
      var target = external ? ' target="_blank" rel="noopener"' : '';
      var span = ED_SPANS[i % ED_SPANS.length];
      var ratio = ED_RATIOS[i % ED_RATIOS.length];
      var cat = s.category || SERVICE_CATEGORIES[s.heading] || '';

      var media = '<div class="hx-ed-media ' + ratio + '">'
        + (s.image
            ? '<img src="' + esc(s.image) + '" alt="' + esc(s.heading) + '" loading="lazy" decoding="async">'
            : '')
        + '</div>';

      return '<article class="hx-ed-item ' + span + '">'
        + (href
            ? '<a class="hx-ed-item__media" href="' + esc(href) + '"' + target
              + ' aria-label="' + esc(s.heading) + '">' + media + '</a>'
            : '<div class="hx-ed-item__media">' + media + '</div>')
        + '<div class="hx-ed-item__body">'
        + '<div class="hx-ed-item__head">'
        + '<h3 class="hx-ed-item__title">' + esc(shortLabel(s.heading)) + '</h3>'
        + (cat ? '<span class="hx-ed-item__cat">' + esc(cat) + '</span>' : '')
        + '</div>'
        + '<p class="hx-ed-item__path">' + describe(s) + '</p>'
        + '</div>'
        + '</article>';
    }).join('');
  }

  // ── "What We Offer" ────────────────────────────────────────────────
  function renderOffer(offer) {
    if (!offer) return;
    var section = document.getElementById('about');
    if (!section) return;

    // The design sets the final word of the heading in the accent colour.
    var title = section.querySelector('.offer-title');
    if (title && offer.title) {
      var words = String(offer.title).trim().split(/\s+/);
      var last = words.length > 1 ? words.pop() : '';
      title.innerHTML = esc(words.join(' ')) + (last ? ' <span>' + esc(last) + '</span>' : '');
    }

    var lead = section.querySelector('.offer-lead');
    if (lead && offer.lead) lead.textContent = offer.lead;

    var list = section.querySelector('.offer-list');
    if (list && offer.bullets && offer.bullets.length) {
      list.innerHTML = offer.bullets.map(function (b) {
        return '<li><i class="bi bi-check-circle"></i> <span>' + esc(b) + '</span></li>';
      }).join('');
    }

    var link = section.querySelector('.read-more');
    if (link) {
      if (offer.linkUrl) link.setAttribute('href', offer.linkUrl);
      var label = link.querySelector('span');
      if (label && offer.linkText) label.textContent = offer.linkText;
    }

    // Updated in place: this element carries the parallax hook and sits
    // beside a decorative wave, both of which a rebuild would discard.
    var img = section.querySelector('.offer-media img');
    if (img && offer.image) {
      img.setAttribute('src', offer.image);
      if (offer.title) img.setAttribute('alt', offer.title);
    }
  }

  // ── impact counters ────────────────────────────────────────────────
  function renderStats(stats) {
    var row = document.querySelector('#counts .row');
    if (!row || !stats.length) return;

    row.innerHTML = stats.map(function (s) {
      return '<div class="col-lg-3 col-md-6">'
        + '<div class="stats-item text-center w-100 h-100">'
        + '<span data-purecounter-start="0" data-purecounter-end="' + Number(s.value)
        + '" data-purecounter-duration="1" class="purecounter"></span>'
        + '<p>' + esc(s.label) + (s.suffix ? esc(s.suffix) : '') + '</p>'
        + '</div></div>';
    }).join('');

    // PureCounter latched onto the elements we just discarded.
    if (typeof window.PureCounter === 'function') new window.PureCounter();
  }

  fetch(API + '/site/home')
    .then(function (res) {
      if (!res.ok) throw new Error('site content unavailable');
      return res.json();
    })
    .then(function (json) {
      var d = (json && json.data) || {};
      renderHero(d.heroSlides || []);
      renderHighlights(d.highlights || []);
      renderServices(d.services || []);
      renderOffer(d.offer);
      renderStats(d.stats || []);

      // Newly-inserted nodes carry data-aos attributes that AOS has not seen.
      if (window.AOS && typeof window.AOS.refreshHard === 'function') window.AOS.refreshHard();
    })
    .catch(function () {
      /* keep the statically rendered page exactly as it is */
    });
})();
