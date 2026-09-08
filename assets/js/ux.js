/**
 * UX polish layer.
 *
 * Additive only — it reads the page's existing markup and augments it, so the
 * mirrored HTML and main.js stay untouched. Loading this file is the whole
 * install; removing it returns the site to its previous behaviour.
 *
 * Provides:
 *   1. a reading-progress bar
 *   2. a docked header that appears once the hero has scrolled past, and
 *      retracts while scrolling down
 *   3. image "settle" on load instead of a hard pop
 *   4. scroll-linked parallax on `data-ux-parallax` elements
 *   5. tighter reveal timing than the site's default 100ms-per-card stagger
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 1. reading progress ────────────────────────────────────────────
  function progressBar() {
    var wrap = document.createElement('div');
    wrap.className = 'ux-progress';
    var bar = document.createElement('div');
    bar.className = 'ux-progress__bar';
    wrap.appendChild(bar);
    document.body.appendChild(wrap);

    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      // A page shorter than the viewport has no progress to report.
      bar.style.width = max > 0 ? ((window.scrollY / max) * 100).toFixed(2) + '%' : '0%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ── 2. docked header ───────────────────────────────────────────────
  function dockedHeader() {
    var sourceNav = document.querySelector('#navmenu > ul');
    var brandImg = document.querySelector('.hx-brand-logo') || document.querySelector('.logo img');
    // The wordmark is navy, so on the navy dock it needs the same torn-paper
    // strip that sits behind it in the page header — without it the logo
    // all but disappears.
    var tapeImg = document.querySelector('.hx-brand-tape');
    if (!sourceNav) return;

    var dock = document.createElement('div');
    dock.className = 'ux-dock';
    dock.setAttribute('aria-hidden', 'true');

    // Brand — links home, same as the page header.
    var brand = document.createElement('a');
    brand.className = 'ux-dock__brand';
    brand.href = 'index.html';
    brand.setAttribute('aria-label', 'TechStar Innovation Hub home');
    if (tapeImg) {
      var tape = document.createElement('img');
      tape.src = tapeImg.getAttribute('src');
      tape.className = 'ux-dock__tape';
      tape.alt = '';
      tape.setAttribute('aria-hidden', 'true');
      brand.appendChild(tape);
    }
    if (brandImg) {
      var logo = document.createElement('img');
      logo.src = brandImg.getAttribute('src');
      logo.className = 'ux-dock__logo';
      logo.alt = '';
      brand.appendChild(logo);
    }
    dock.appendChild(brand);

    // Mirror the top-level nav. Dropdown parents are skipped: a hover panel in
    // a condensed bar is fiddly, and every child is reachable from the page
    // the parent links to anyway. Dropdown parents (a "#"-only href, like
    // Programs) get their own small hover panel instead of being skipped —
    // they carry real destinations once open and have no other route into
    // the dock's compact nav.
    var nav = document.createElement('nav');
    nav.className = 'ux-dock__nav';
    var cta = null;

    [].forEach.call(sourceNav.children, function (li) {
      var a = li.querySelector(':scope > a');
      if (!a) return;
      var href = a.getAttribute('href');

      if (li.classList.contains('dropdown')) {
        var children = [].map.call(li.querySelectorAll(':scope > ul > li > a'), function (childA) {
          return { href: childA.getAttribute('href'), text: childA.textContent.trim() };
        });
        if (!children.length) return;

        var item = document.createElement('div');
        item.className = 'ux-dock__item';

        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ux-dock__link ux-dock__link--dropdown';
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        var labelEl = a.querySelector('span');
        trigger.textContent = (labelEl ? labelEl.textContent : a.textContent).trim() + ' ';
        var chev = document.createElement('i');
        chev.className = 'bi bi-chevron-down';
        chev.setAttribute('aria-hidden', 'true');
        trigger.appendChild(chev);
        item.appendChild(trigger);

        var panel = document.createElement('div');
        panel.className = 'ux-dock__panel';
        children.forEach(function (c) {
          var childLink = document.createElement('a');
          childLink.href = c.href;
          childLink.textContent = c.text;
          panel.appendChild(childLink);
        });
        item.appendChild(panel);

        // Hover for a mouse, click for touch/keyboard — both just toggle one
        // class, so a screen reader's aria-expanded state and the panel's
        // visibility can never disagree.
        var openItem = function () {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        };
        var closeItem = function () {
          item.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        };
        item.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') openItem(); });
        item.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') closeItem(); });
        // Click only opens — never toggles closed. A mouse click always
        // arrives just after the pointerenter that already opened the
        // panel, so a toggle here would close it again on the same
        // interaction; touch and keyboard users, who get no pointerenter,
        // still reach it this way, and close it again via the outside-click
        // handler below (or Escape, further down).
        trigger.addEventListener('click', openItem);
        document.addEventListener('click', function (e) {
          if (!item.contains(e.target)) closeItem();
        });
        item.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { closeItem(); trigger.focus(); }
        });

        nav.appendChild(item);
        return;
      }

      if (!href || href === '#') return;

      // The Shop pill is the page's primary action — carry it as the CTA.
      if (li.classList.contains('nav-pill--shop')) {
        cta = document.createElement('a');
        cta.className = 'ux-dock__cta';
        cta.href = href;
        if (a.target) cta.target = a.target;
        if (a.rel) cta.rel = a.rel;
        cta.textContent = a.textContent.trim();
        return;
      }

      var link = document.createElement('a');
      link.href = href;
      link.className = 'ux-dock__link';
      link.textContent = a.textContent.trim();
      if (a.classList.contains('active')) link.classList.add('is-current');
      nav.appendChild(link);
    });

    dock.appendChild(nav);

    // Always give the dock a call to action, falling back to Contact.
    if (!cta) {
      var contact = document.querySelector('.hx-contact');
      cta = document.createElement('a');
      cta.className = 'ux-dock__cta';
      cta.href = contact ? contact.getAttribute('href') : 'contact.html';
      cta.textContent = contact ? contact.textContent.trim() : 'Contact Us';
    }
    dock.appendChild(cta);
    document.body.appendChild(dock);

    // Reveal once the original header has scrolled out of the way, and leave
    // it up for as long as the page stays scrolled — matching the reference
    // nav's own "is-stuck" behaviour, which appears almost immediately and
    // simply stays, rather than this dock's previous hide-on-down pattern.
    var header = document.querySelector('#header');
    var threshold = header ? header.offsetHeight : 80;
    var ticking = false;

    function update() {
      var show = window.scrollY > threshold;
      dock.classList.toggle('is-open', show);
      dock.setAttribute('aria-hidden', show ? 'false' : 'true');
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update(); // covers a page that loads already scrolled — a back/forward
              // navigation or an anchor link landing mid-page.
  }

  // ── 3. image settle ────────────────────────────────────────────────
  /**
   * Arms one <img> to fade/scale in once it has something to show, rather
   * than popping in at whatever moment the network happens to answer.
   *
   * `complete` and `naturalWidth` alone are not a reliable "this image is
   * ready" test: a node produced by `cloneNode()` from an already-loaded
   * `<img>` — premium.js's marquee band clones the partner logos this way —
   * can read `complete: true` with `naturalWidth` still 0, because cloning
   * does not carry over the browser's decode state for that specific node.
   * That combination fails the `complete && naturalWidth > 0` check below,
   * so the code falls through to waiting on a `load` event that a cached
   * image has no reason to ever fire again on the clone — the exact way the
   * partner logos ended up permanently stuck at opacity 0. A short fallback
   * timer is the backstop: whatever the image's state, it settles within a
   * fifth of a second of being armed, so nothing can be left invisible
   * indefinitely by a cloned or otherwise ambiguous load state.
   */
  function armSettle(img) {
    img.setAttribute('data-ux-settle', '');
    var done = function () { img.classList.add('is-settled'); };
    if (img.complete && img.naturalWidth > 0) {
      // Already cached — settle on the next frame so the transition runs.
      requestAnimationFrame(done);
    } else {
      img.addEventListener('load', done, { once: true });
      // A broken image must never be left invisible.
      img.addEventListener('error', done, { once: true });
      window.setTimeout(done, 200);
    }
  }

  function settleImages() {
    if (reduced) return;
    var imgs = document.querySelectorAll('main img, .hx-hero-art img');

    [].forEach.call(imgs, function (img) {
      // Skip anything already driving its own transform, and tiny icons.
      // Parallax writes an inline transform, which would override the settle.
      if (img.closest('.ux-dock')
        || img.classList.contains('hx-brand-tape')
        || img.hasAttribute('data-ux-parallax')) return;
      armSettle(img);
    });
  }

  /**
   * Images injected later (course cards, product teasers, hydrated hero)
   * never fire the pass above, so watch for them.
   */
  function watchForImages() {
    if (reduced || !('MutationObserver' in window)) return;
    var mo = new MutationObserver(function (records) {
      records.forEach(function (r) {
        [].forEach.call(r.addedNodes, function (node) {
          if (node.nodeType !== 1) return;
          var imgs = node.tagName === 'IMG' ? [node] : node.querySelectorAll('img');
          [].forEach.call(imgs, function (img) {
            if (img.hasAttribute('data-ux-settle')
              || img.hasAttribute('data-ux-parallax')
              || img.closest('.ux-dock')) return;
            armSettle(img);
          });
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ── 4. scroll-linked parallax ──────────────────────────────────────
  /**
   * Drifts an element against the scroll on `data-ux-parallax` elements, the
   * attribute value being the total travel in pixels (default 28).
   *
   * Only transform is touched, so the browser composites it on the GPU and
   * never reflows. An IntersectionObserver keeps the maths to elements
   * actually on screen — a page-wide scroll handler measuring every element
   * is what makes naive parallax stutter.
   */
  function parallax() {
    if (reduced) return;
    var els = [].slice.call(document.querySelectorAll('[data-ux-parallax]'));
    if (!els.length || !('IntersectionObserver' in window)) return;

    var live = [];
    var ticking = false;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = live.indexOf(e.target);
        if (e.isIntersecting && i === -1) live.push(e.target);
        else if (!e.isIntersecting && i > -1) live.splice(i, 1);
      });
      if (live.length) update();
    }, { rootMargin: '120px 0px' });

    els.forEach(function (el) {
      el.style.willChange = 'transform';
      io.observe(el);
    });

    function update() {
      var vh = window.innerHeight;
      live.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var range = parseFloat(el.getAttribute('data-ux-parallax')) || 28;
        // -1 when the element is entering at the bottom, +1 leaving at the
        // top; 0 as it passes the middle of the viewport.
        var progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        progress = Math.max(-1, Math.min(1, progress));
        el.style.transform = 'translate3d(0,' + (progress * range).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking && live.length) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  // ── 5. tighten the reveal rhythm ───────────────────────────────────
  /**
   * main.js staggers grid children by 100ms each, so a fourth card lands
   * 400ms after the first and reads as lag. Re-spacing to 60ms keeps the
   * sequence legible while feeling like one movement. This runs before
   * AOS.init (which fires on window load), so AOS reads the new values.
   */
  function retimeReveals() {
    if (!reduced) {
      document.querySelectorAll('.row, .hx-grid, .hx-service-grid, .hx-team-grid, .hx-why-cards')
        .forEach(function (row) {
          var items = [].filter.call(row.children, function (c) { return c.hasAttribute('data-aos'); });
          items.forEach(function (item, i) {
            item.setAttribute('data-aos-delay', String(i * 60));
          });
        });
    }

    // The one and only AOS.init() call for the whole site — main.js used to
    // make its own call here too, with a longer 800ms duration and a
    // different offset, and having both fire on 'load' meant AOS registered
    // two permanent scroll listeners that each re-walked every [data-aos]
    // element on every scroll for the rest of the page's life. `disable`
    // mirrors what main.js's call used to set: without it, a visitor who has
    // asked for reduced motion would get no AOS.init() at all now that this
    // is the only call, and every [data-aos] element would stay at its
    // pre-reveal opacity: 0 forever.
    window.addEventListener('load', function () {
      if (window.AOS && typeof window.AOS.init === 'function') {
        window.AOS.init({
          duration: reduced ? 0 : 620,
          easing: 'ease-out-cubic',
          offset: 90,
          once: true,
          mirror: false,
          disable: reduced,
        });
      }
    });
  }

  // ── 6. footer newsletter ───────────────────────────────────────────
  /**
   * Posts the footer's subscribe form to the admin API. This used to live as
   * an inline <script> block at the bottom of each page's body — copied by
   * hand onto every page that had a footer, which is how three of them
   * (team.html, pricing.html, starter-page.html) ended up with a form that
   * looked identical to every other page's but silently did nothing on
   * submit. One shared handler here, loaded on every page, closes that gap
   * for good: a page either has the #newsletter-form markup or it doesn't,
   * and there is no third copy-paste step to forget.
   */
  function newsletterForm() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = document.getElementById('email').value;
      var responseMessageDiv = document.getElementById('response-message');
      var errorMessageDiv = document.getElementById('error-message');
      responseMessageDiv.classList.remove('d-block');
      errorMessageDiv.classList.remove('d-block');

      fetch('https://techstar-admin.onrender.com/forms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      })
        .then(function (response) {
          return response.json().then(function () {
            if (response.ok) {
              responseMessageDiv.textContent = 'Your subscription request has been sent. Thank you!';
              responseMessageDiv.classList.add('d-block');
              form.reset();
            } else {
              errorMessageDiv.textContent = 'There was an error processing your request. Ensure the Email Address is valid';
              errorMessageDiv.classList.add('d-block');
            }
          });
        })
        .catch(function (error) {
          console.error('Error:', error);
          errorMessageDiv.textContent = 'An unexpected error occurred. Please try again later.';
          errorMessageDiv.classList.add('d-block');
        });
    });
  }

  // ── 7. footer year ─────────────────────────────────────────────────
  /**
   * Keeps the copyright year current without anyone having to remember to
   * bump a hard-coded number in the footer of fifteen HTML files every
   * January.
   */
  function footerYear() {
    var el = document.getElementById('hx-footer-year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function init() {
    progressBar();
    // dockedHeader() is retired: the page header is now permanently fixed
    // and frosted (see home.css/inner-pages.css), so there is one nav design
    // for the whole site rather than a second, differently-styled bar that
    // took over once scrolled. The function is left defined above rather
    // than deleted, in case a docked mirror is ever wanted again.
    settleImages();
    watchForImages();
    parallax();
    retimeReveals();
    newsletterForm();
    footerYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
