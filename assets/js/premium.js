/**
 * premium.js — the motion engine behind premium.css.
 *
 * Loads last, after ux.js and the two integration scripts, and is additive in
 * exactly the same way they are: it reads the markup the page already has and
 * upgrades it in place. No template anywhere had to grow an animation
 * attribute for this to work, and removing this file plus premium.css returns
 * the site to its previous behaviour.
 *
 * The governing rule is that nothing here may ever leave content invisible.
 * Every effect starts from a hidden state written by JavaScript, so if this
 * file fails to parse the page renders normally rather than blank — the usual
 * failure mode of reveal-on-scroll libraries, and the reason they are so often
 * a liability.
 *
 * Contents:
 *   1. splitWords     — word-mask reveals on display headings
 *   2. autoReveal     — rise / curtain / rule-draw on everything else
 *   3. odometers      — digit-reel counters, replacing PureCounter's tick-up
 *   4. buttonRolls    — duplicate button labels for the hover roll
 *   5. magnets        — pointer attraction on the round buttons
 *   6. spotlights     — pointer-tracked warmth across cards
 *   7. marquee        — the partner logo band
 *   8. journey        — depth on the sticky word reel
 *   9. cursor         — the trailing pointer ring
 *  10. curtain        — the load-in sheet
 *  11. heroSlides     — re-arm the hero reveals on every carousel change
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Shared observer. One instance watching many elements is meaningfully
     cheaper than one per element, and `once` semantics are handled here so no
     individual effect has to remember to unobserve itself. */
  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })
    : null;

  /** Marks an element to reveal when it scrolls into view. */
  function watch(el) {
    if (!el || el.hasAttribute('data-px-watched')) return;
    el.setAttribute('data-px-watched', '');
    if (!io) { el.classList.add('is-in'); return; }
    io.observe(el);
  }

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ── 1. word-mask reveals ───────────────────────────────────────────── */
  /**
   * Wraps every word of a heading in a clipping span so the words can rise out
   * from behind their own baseline.
   *
   * Only text nodes are rewritten, so inline markup already inside the heading
   * — the orange `<span>` in "What We Offer", the decorative `.hx-rule` after
   * the hero titles — survives untouched and keeps its own styling.
   *
   * Headings longer than a strapline are skipped: forty separate clipping
   * boxes cost more than the effect returns, and a long paragraph revealing
   * word by word reads as a stutter rather than a flourish.
   */
  var MAX_WORDS = 22;

  function splitWords(el) {
    if (!el || el.classList.contains('px-split')) return false;
    if ((el.textContent || '').trim().split(/\s+/).length > MAX_WORDS) return false;

    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim()) nodes.push(node);
    }
    if (!nodes.length) return false;

    nodes.forEach(function (text) {
      var frag = document.createDocumentFragment();
      // Splitting on a capturing group keeps the original whitespace runs, so
      // the heading wraps exactly where it did before.
      text.nodeValue.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (!chunk.trim()) { frag.appendChild(document.createTextNode(chunk)); return; }
        var mask = document.createElement('span');
        mask.className = 'px-w';
        var inner = document.createElement('span');
        inner.className = 'px-wi';
        inner.textContent = chunk;
        mask.appendChild(inner);
        frag.appendChild(mask);
      });
      text.parentNode.replaceChild(frag, text);
    });

    // Stagger, capped so a ten-word headline does not finish half a second
    // after the eye has already moved past it.
    each(el.querySelectorAll('.px-wi'), function (w, i) {
      w.style.setProperty('--px-d', Math.min(i * 45, 520) + 'ms');
    });

    el.classList.add('px-split');
    return true;
  }

  /** Headings important enough to earn the treatment. */
  var HEADINGS = [
    '.hx-section-head h2',
    '.hx-hero-copy h2',
    '.hx-page-hero-body h1',
    '.offer-title',
    '.px-display',
    '.hx-why-lead h2',
    '.hx-cta-band h2',
    '.px-manifesto__panel h2',
    '.hx-svc-head h2'
  ].join(',');

  function headings() {
    if (reduced) return;
    each(document.querySelectorAll(HEADINGS), function (h) {
      if (splitWords(h)) watch(h);
    });
  }

  /* ── 2. everything else ─────────────────────────────────────────────── */
  /**
   * The site's existing reveal is AOS `fade-up`, which moves everything the
   * same distance at the same speed. This replaces it on the elements that
   * carry the page's structure with a shorter, quieter lift, and gives media
   * a wipe instead — so a photograph and a paragraph no longer arrive in
   * identical fashion.
   *
   * AOS attributes are stripped from anything taken over here; leaving both
   * systems on one element makes them fight over opacity.
   */
  function autoReveal() {
    if (reduced) return;

    function claim(el, mode, delay) {
      if (!el || el.hasAttribute('data-px-rise') || el.hasAttribute('data-px-curtain')) return;
      el.removeAttribute('data-aos');
      el.removeAttribute('data-aos-delay');
      el.setAttribute(mode, '');
      if (delay) el.style.setProperty('--px-d', delay + 'ms');
      watch(el);
    }

    // Supporting copy and buttons under a section head, sequenced behind the
    // heading's own word reveal so the block reads top to bottom.
    each(document.querySelectorAll('.hx-section-head'), function (head) {
      var step = 0;
      each(head.children, function (child) {
        if (child.tagName === 'H2') return; // handled by the word split
        claim(child, 'data-px-rise', 120 + (step++) * 90);
      });
    });

    // Cards, tiles and members. The stagger runs across the row rather than
    // down the page, which is how the eye actually crosses a grid.
    var GRIDS = '.hx-service-grid, .hx-team-grid, .hx-why-cards, .hx-testimonial-grid, .px-manifesto__grid, .hx-editorial, #ujuzi-course-teaser, #ujuzi-courses-grid, #ujuzi-courses-grid-rest';
    each(document.querySelectorAll(GRIDS), function (grid) {
      each(grid.children, function (child, i) {
        claim(child, 'data-px-rise', Math.min(i * 80, 480));
      });
    });

    // The services band's CTA now sits below the grid rather than inside the
    // section head, so it falls outside the loop above and is claimed by name
    // instead. Note it is never marked up as hidden in the HTML: the same
    // pass that hides an element is the one that reveals it, so a failure to
    // load this file leaves content visible rather than blank.
    claim(document.querySelector('.hx-svc-cta'), 'data-px-rise', 90);

    // Photography gets the wipe.
    each(document.querySelectorAll('.offer-media, .hx-about-media, .hx-why-media'), function (el) {
      claim(el, 'data-px-curtain', 0);
    });

    each(document.querySelectorAll('[data-px-draw]'), watch);
  }

  /* ── 3. odometers ───────────────────────────────────────────────────── */
  /**
   * Rebuilds each PureCounter figure as a set of digit reels.
   *
   * The original span is removed from the document rather than merely
   * emptied. PureCounter captured its element references when main.js ran, and
   * it will still write a value into whatever it holds — writing into a
   * detached node is harmless, whereas leaving the node in place would let it
   * paint over the reels mid-animation.
   *
   * site-content.js's renderStats() replaces #counts .row's entire innerHTML
   * once the live stats API answers — always strictly after this function's
   * first pass, since that fetch is asynchronous and this file's synchronous
   * work (including the first odometers() call) has always finished before
   * any fetch callback can run. The MutationObserver near the bottom of this
   * file then sees the freshly-inserted .purecounter spans and calls this
   * function again to convert them. Left alone, that means every visitor
   * whose stats API responds sees the fallback numbers already shipped in
   * the HTML roll into place once, then the whole row gets torn down and
   * rebuilt from live data and rolls into place a second time — the counters
   * appear to reset and re-count for no reason a visitor can see. This flag
   * remembers that the section has already played its one entrance, so a
   * later rebuild updates the digits without repeating the reveal.
   */
  var odometersRevealed = false;

  function odometers() {
    each(document.querySelectorAll('.purecounter[data-purecounter-end]'), function (span) {
      var end = parseInt(span.getAttribute('data-purecounter-end'), 10);
      if (isNaN(end)) return;

      var odo = document.createElement('span');
      odo.className = 'px-odo';
      odo.setAttribute('aria-label', end.toLocaleString());

      var chars = end.toLocaleString('en-US').split('');
      var digitIndex = 0;

      chars.forEach(function (ch) {
        if (!/[0-9]/.test(ch)) {
          // Separators sit outside the reels so they never move.
          var sep = document.createElement('span');
          sep.className = 'px-odo__s';
          sep.textContent = ch;
          sep.setAttribute('aria-hidden', 'true');
          odo.appendChild(sep);
          return;
        }

        var window_ = document.createElement('span');
        window_.className = 'px-odo__d';
        window_.setAttribute('aria-hidden', 'true');

        var reel = document.createElement('span');
        reel.className = 'px-odo__r';
        for (var n = 0; n <= 9; n++) {
          var cell = document.createElement('span');
          cell.textContent = String(n);
          reel.appendChild(cell);
        }
        // Left-most digit lands first; the rest cascade behind it.
        reel.style.setProperty('--px-d', (digitIndex++ * 70) + 'ms');
        reel.setAttribute('data-px-stop', ch);

        window_.appendChild(reel);
        odo.appendChild(window_);
      });

      span.parentNode.insertBefore(odo, span);
      span.parentNode.removeChild(span);

      function land() {
        each(odo.querySelectorAll('.px-odo__r'), function (reel) {
          reel.style.transform = 'translateY(-' + (parseInt(reel.getAttribute('data-px-stop'), 10) * 10) + '%)';
        });
      }

      // A rebuild after the section has already revealed once (live stats
      // replacing the static fallback) lands on the correct digits straight
      // away rather than re-running the whole rolling-reel entrance — see
      // the comment above odometersRevealed.
      if (reduced || !io || odometersRevealed) {
        land();
        return;
      }

      var once = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          land();
          odometersRevealed = true;
          once.disconnect();
        });
      }, { threshold: 0.4 });
      once.observe(odo);
    });
  }

  /* ── 4. button label rolls ──────────────────────────────────────────── */
  /**
   * Turns a button's own label into two stacked copies inside a clipping
   * frame, so hovering rolls the first out of the top as the second arrives
   * from the bottom. Only buttons whose label is a bare text node are touched
   * — anything already containing an icon or nested markup is left alone
   * rather than risking a rebuild that loses it.
   */
  function buttonRolls() {
    if (reduced) return;
    each(document.querySelectorAll('.hx-btn-primary, .uj-btn'), function (btn) {
      if (btn.querySelector('.px-roll')) return;
      var kids = Array.prototype.filter.call(btn.childNodes, function (n) {
        return n.nodeType !== 3 || n.nodeValue.trim();
      });
      if (kids.length !== 1 || kids[0].nodeType !== 3) return;

      var label = kids[0].nodeValue.trim();
      if (!label) return;

      btn.textContent = '';
      var frame = document.createElement('span');
      frame.className = 'px-roll';
      var inner = document.createElement('span');
      inner.className = 'px-roll-i';
      // Two copies: the visible one and the one waiting below the fold of the
      // frame. The second is hidden from assistive tech so the label is not
      // announced twice.
      var a = document.createElement('span');
      a.textContent = label;
      var b = document.createElement('span');
      b.textContent = label;
      b.setAttribute('aria-hidden', 'true');
      inner.appendChild(a);
      inner.appendChild(b);
      frame.appendChild(inner);
      btn.appendChild(frame);
      btn.classList.add('px-has-roll');
    });
  }

  /* ── 5. magnetic buttons ────────────────────────────────────────────── */
  /**
   * Draws a control a few pixels toward the pointer while it is nearby, and
   * releases it on the way out. The travel is capped at a third of the
   * element's own half-width, which keeps it feeling like attraction rather
   * than the button sliding out from under the cursor.
   *
   * Delegated from the document, the same way spotlights() below is — not
   * bound per-element. The three selectors it covers all include buttons
   * that site-content.js and store-integration.js render from live API data
   * well after this function's one-time call at init() (the hero's own CTA,
   * every highlight card's round arrow, the services CTA): a per-element
   * querySelectorAll().forEach() here would only ever see the buttons
   * present at that first call and silently miss every one of those,
   * permanently, for the rest of the session — confirmed by testing a button
   * injected after init() and finding it never received `data-px-magnet` at
   * all. Delegating means a button gets the effect the moment a pointer
   * first reaches it, regardless of when it was inserted.
   *
   * pointerenter/pointerleave don't bubble, so pointerover/pointerout carry
   * the enter/leave logic here instead (closest() tells them apart from a
   * move within the same element), matching the pattern the cursor-ring hot
   * state already uses further down this file.
   */
  var MAGNET = '.hx-round-btn, .hx-shop-nav, .scroll-top';

  function magnets() {
    if (reduced || !finePointer) return;

    function release(el) {
      el.classList.remove('is-pulling');
      el.style.setProperty('--px-mx', '0px');
      el.style.setProperty('--px-my', '0px');
    }

    document.addEventListener('pointerover', function (e) {
      var el = e.target.closest ? e.target.closest(MAGNET) : null;
      if (!el) return;
      var from = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(MAGNET) : null;
      if (from === el) return; // moved within the same control, not a fresh entry
      el.setAttribute('data-px-magnet', '');
      el.classList.add('is-pulling');
    }, { passive: true });

    document.addEventListener('pointerout', function (e) {
      var el = e.target.closest ? e.target.closest(MAGNET) : null;
      if (!el) return;
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(MAGNET) : null;
      if (to === el) return;
      release(el);
    }, { passive: true });

    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest ? e.target.closest(MAGNET) : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      var limit = Math.min(r.width, r.height) / 3;
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.setProperty('--px-mx', (dx * limit).toFixed(1) + 'px');
      el.style.setProperty('--px-my', (dy * limit).toFixed(1) + 'px');
    }, { passive: true });
  }

  /* ── 6. card spotlights ─────────────────────────────────────────────── */
  /**
   * Publishes the pointer's position inside a card as percentages, which
   * premium.css turns into a soft radial of brand orange. Delegated from the
   * document so cards fetched from the course and store APIs are covered
   * without re-running anything when they arrive.
   */
  var LIT = '.uj-card, .hx-shop-card, .hx-service, .hx-member, .hx-why-card';

  function spotlights() {
    if (reduced || !finePointer) return;

    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest(LIT) : null;
      if (!card) return;
      if (!card.classList.contains('px-lit')) card.classList.add('px-lit');
      var r = card.getBoundingClientRect();
      card.style.setProperty('--px-px', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      card.style.setProperty('--px-py', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ── 7. partner marquee ─────────────────────────────────────────────── */
  /**
   * Converts the partners grid into a continuously drifting band.
   *
   * The track is duplicated and the keyframe travels exactly -50%, so the
   * second copy lands where the first began and the loop has no seam. Duration
   * is derived from the real content width — a fixed duration would run a
   * six-logo band at a different speed from a twelve-logo one.
   */
  function marquee() {
    var section = document.querySelector('#partners');
    if (!section || section.querySelector('.px-marquee')) return;

    var logos = section.querySelectorAll('.partner-logo');
    if (logos.length < 3) return;

    var wrap = document.createElement('div');
    wrap.className = 'px-marquee';
    var track = document.createElement('div');
    track.className = 'px-marquee__track';

    var items = [];
    each(logos, function (logo) {
      var link = logo.querySelector('a') || logo;
      var item = document.createElement('div');
      item.className = 'px-marquee__item';
      var clone = link.cloneNode(true);
      each(clone.querySelectorAll('img'), function (img) {
        // The <img> being cloned here was already claimed by ux.js's
        // settleImages() before this function ever ran (it walks `main img`
        // at page init, well before premium.js loads) — which means it
        // already carries `data-ux-settle` and, once the real image has
        // loaded, `is-settled`. `cloneNode(true)` copies both attributes
        // onto every clone verbatim. ux.js's watchForImages() sees
        // `data-ux-settle` already present and skips the clone entirely,
        // assuming some earlier pass is already handling it — but no pass
        // ever actually ran on this specific node, so it never receives its
        // own `is-settled` and stays invisible forever. Stripping both here
        // makes the clone look exactly like the fresh node it actually is,
        // so watchForImages() arms it properly. Loading is also switched to
        // eager: these are a handful of small logo marks feeding a
        // decorative strip, not a reason to defer loading, and it removes
        // any doubt about the clone's own decode state.
        img.removeAttribute('data-ux-settle');
        img.classList.remove('is-settled');
        img.loading = 'eager';
      });
      item.appendChild(clone);
      items.push(item);
      track.appendChild(item);
    });

    // The second pass is decoration, so it is hidden from screen readers and
    // from the tab order — otherwise every partner is announced twice.
    items.forEach(function (item) {
      var copy = item.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      each(copy.querySelectorAll('a'), function (a) { a.setAttribute('tabindex', '-1'); });
      // Same reasoning as the settle/loading reset above: `item` already
      // carries `data-ux-settle` (set on its own <img> in the loop just
      // above) and possibly `is-settled` too by the time this second
      // cloneNode() runs, and both would otherwise be copied straight onto
      // this second, never-actually-armed copy.
      each(copy.querySelectorAll('img'), function (img) {
        img.removeAttribute('data-ux-settle');
        img.classList.remove('is-settled');
      });
      track.appendChild(copy);
    });

    wrap.appendChild(track);

    var row = section.querySelector('.row');
    var host = row ? row.parentNode : section.querySelector('.container');
    if (!host) return;
    if (row) row.parentNode.removeChild(row);
    host.appendChild(wrap);

    // ~90 pixels a second reads as a drift rather than a scroll.
    requestAnimationFrame(function () {
      var width = track.scrollWidth / 2;
      if (width > 0) wrap.style.setProperty('--px-marquee-dur', Math.max(24, width / 90) + 's');
    });
  }

  /* ── 8. journey depth ───────────────────────────────────────────────── */
  /**
   * The sticky word reel works on scroll position alone, but flat words
   * sliding past look like a list. Scaling and fading each word by its
   * distance from the centre of the stage gives the column depth, so words
   * appear to travel toward the viewer and away again.
   *
   * Only the words currently on screen are measured, and the work happens in a
   * single rAF per scroll event.
   */
  function journey() {
    var reel = document.querySelector('.px-journey__reel');
    if (!reel || reduced) return;
    if (window.matchMedia('(max-width: 991.98px)').matches) return;

    var words = Array.prototype.slice.call(reel.querySelectorAll('.px-journey__word'));
    if (!words.length) return;

    var ticking = false;

    function frame() {
      var mid = window.innerHeight / 2;
      words.forEach(function (word) {
        var r = word.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
        // 0 at the centre of the stage, 1 at either edge.
        var d = Math.min(1, Math.abs((r.top + r.height / 2) - mid) / mid);
        // Scale carries the depth. Opacity is left mostly to the veil
        // gradient over the stage; fading here as well double-dips and leaves
        // words looking washed out well before they reach the edge.
        var scale = 1 - d * 0.24;
        word.style.transform = 'scale(' + scale.toFixed(3) + ')';
        word.style.opacity = (1 - d * 0.25).toFixed(3);
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    window.addEventListener('resize', frame, { passive: true });
    frame();
  }

  /* ── 9. the pointer ─────────────────────────────────────────────────── */
  /**
   * A dot locked to the pointer and a ring that lags behind it. The lag is
   * produced by easing the ring's position toward the dot's by 18% each frame,
   * which is what reads as weight; a ring that simply tracks the pointer is
   * indistinguishable from the native cursor.
   *
   * The native cursor is deliberately left visible. Hiding it is the fashion,
   * but it makes text selection and form fields feel broken, and one dropped
   * frame leaves the visitor with no pointer at all.
   */
  function cursor() {
    if (reduced || !finePointer) return;

    var dot = document.createElement('div');
    dot.className = 'px-cursor';
    var ring = document.createElement('div');
    ring.className = 'px-cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var rx = tx, ry = ty;
    var running = false;

    function frame() {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      dot.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      // Keep running only while the ring still has ground to cover.
      if (Math.abs(tx - rx) > 0.2 || Math.abs(ty - ry) > 0.2) requestAnimationFrame(frame);
      else running = false;
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      dot.classList.add('is-on');
      ring.classList.add('is-on');
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      dot.classList.remove('is-on');
      ring.classList.remove('is-on');
    });

    // Delegated, so it covers cards and buttons that arrive from the APIs.
    var HOT = 'a, button, [role="button"], .uj-card, .hx-shop-card, .hx-service, input, textarea, select, .swiper-slide';
    document.addEventListener('pointerover', function (e) {
      var hot = e.target.closest ? e.target.closest(HOT) : null;
      dot.classList.toggle('is-hot', !!hot);
      ring.classList.toggle('is-hot', !!hot);
    }, { passive: true });
  }

  /* ── 10. the load-in sheet ──────────────────────────────────────────── */
  /**
   * A navy sheet over the page that lifts away once loading finishes, so the
   * first impression is a composed move rather than images popping in one by
   * one. It self-destructs on a timer as well as on `load`, because a single
   * slow third-party image must never be able to hold the page hostage.
   */
  function curtain() {
    // A page that has already finished loading by the time this runs — a
    // bfcache restore, or a script injected late — must not be covered up.
    if (reduced || document.readyState === 'complete') return;

    var sheet = document.createElement('div');
    sheet.className = 'px-curtain';
    sheet.setAttribute('aria-hidden', 'true');
    var mark = document.createElement('div');
    mark.className = 'px-curtain__mark';
    sheet.appendChild(mark);
    document.body.appendChild(sheet);

    var done = false;
    function lift() {
      if (done) return;
      done = true;
      sheet.classList.add('is-up');
      window.setTimeout(function () {
        if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
      }, 1000);
    }

    window.addEventListener('load', function () { window.setTimeout(lift, 220); });
    window.setTimeout(lift, 2600); // hard ceiling
  }

  /* ── 11. hero slides ────────────────────────────────────────────────── */
  /**
   * The hero is a Bootstrap carousel, so its headings are in the DOM from the
   * start and would all reveal at once on first paint. Instead each slide's
   * words are held back and released when that slide becomes active, which
   * means the reveal plays again on every rotation rather than only once.
   */
  function heroSlides() {
    if (reduced) return;
    var carousel = document.getElementById('heroCarousel');
    if (!carousel) return;

    each(carousel.querySelectorAll('.hx-hero-copy h2'), function (h) {
      h.removeAttribute('data-px-watched');
      if (io) io.unobserve(h);
      if (!h.closest('.carousel-item').classList.contains('active')) h.classList.remove('is-in');
    });

    function arm() {
      var active = carousel.querySelector('.carousel-item.active');
      if (!active) return;
      each(carousel.querySelectorAll('.hx-hero-copy h2'), function (h) {
        if (h.closest('.carousel-item') !== active) h.classList.remove('is-in');
      });
      var h = active.querySelector('.hx-hero-copy h2');
      if (h) requestAnimationFrame(function () { h.classList.add('is-in'); });

      var body = active.querySelector('.hx-hero-copy p');
      var cta = active.querySelector('.hx-hero-buttons');
      [body, cta].forEach(function (el, i) {
        if (!el) return;
        el.setAttribute('data-px-rise', '');
        el.style.setProperty('--px-d', (320 + i * 110) + 'ms');
        el.classList.remove('is-in');
        requestAnimationFrame(function () { el.classList.add('is-in'); });
      });
    }

    // site-content.js may replace the slides wholesale, in which case this
    // runs a second time over the new markup. The carousel element itself
    // survives that swap, so the listener is only ever bound once.
    if (!carousel.hasAttribute('data-px-armed')) {
      carousel.setAttribute('data-px-armed', '');
      carousel.addEventListener('slid.bs.carousel', arm);
    }
    arm();
  }

  /* ── boot ───────────────────────────────────────────────────────────── */
  function init() {
    curtain();
    headings();
    autoReveal();
    odometers();
    buttonRolls();
    magnets();
    spotlights();
    marquee();
    journey();
    cursor();
    heroSlides();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Three other scripts repaint parts of this page after it has run:
   * site-content.js swaps the hero slides, the services grid, the "what we
   * offer" block and the whole counters row for whatever the admin API
   * returns, while courses-integration.js and store-integration.js fill their
   * grids from their own APIs. Anything this file had already done to those
   * regions is discarded along with the markup it was done to — which is why
   * the counters lost their reels the moment the API answered.
   *
   * So the passes are simply run again over whatever has just landed. All of
   * them are idempotent: each one no-ops on anything it has already claimed,
   * and none of the nodes they insert match the trigger below, so re-running
   * cannot feed itself.
   */
  if ('MutationObserver' in window) {
    var REPAINTED = LIT + ', .purecounter, .swiper-slide, .hx-section-head, .offer-media, .stats-item, .hx-ed-item';
    var pending = null;

    new MutationObserver(function (records) {
      var relevant = records.some(function (r) {
        return Array.prototype.some.call(r.addedNodes, function (n) {
          if (n.nodeType !== 1 || !n.querySelector) return false;
          return n.matches(REPAINTED) || !!n.querySelector(REPAINTED);
        });
      });
      if (!relevant) return;
      window.clearTimeout(pending);
      // Debounced: a grid paints in one burst of mutations, not one per card.
      pending = window.setTimeout(function () {
        headings();
        autoReveal();
        odometers();
        buttonRolls();
        heroSlides();
      }, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
