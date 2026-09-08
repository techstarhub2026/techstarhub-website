
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Apply .scrolled class to the body as the page is scrolled down.
   * Elements are looked up once (not on every scroll event), and the class
   * toggle is batched to at most once per rendered frame via rAF, so a fast
   * scroll gesture doesn't force dozens of redundant style recalculations.
   */
  const scrolledBody = document.body;
  const scrolledHeader = document.querySelector('#header');
  const headerTracksScroll = scrolledHeader && (
    scrolledHeader.classList.contains('scroll-up-sticky') ||
    scrolledHeader.classList.contains('sticky-top') ||
    scrolledHeader.classList.contains('fixed-top')
  );

  let scrolledFrame = null;
  function toggleScrolled() {
    if (!headerTracksScroll || scrolledFrame) return;
    scrolledFrame = requestAnimationFrame(() => {
      scrolledBody.classList.toggle('scrolled', window.scrollY > 100);
      scrolledFrame = null;
    });
  }

  document.addEventListener('scroll', toggleScrolled, { passive: true });
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }
  mobileNavToggleBtn.addEventListener('click', mobileNavToogle);

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });

  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

    /**
   * Hero carousel indicators
   */
    let heroCarouselIndicators = select("#hero-carousel-indicators")
    let heroCarouselItems = select('#heroCarousel .carousel-item', true)
  // function heroCarouselSlide() {
    if (heroCarouselIndicators) {
      heroCarouselItems.forEach((item, index) => {
        (index === 0) ?
        heroCarouselIndicators.innerHTML += "<li data-bs-target='#heroCarousel' data-bs-slide-to='" + index + "' class='active'></li>":
          heroCarouselIndicators.innerHTML += "<li data-bs-target='#heroCarousel' data-bs-slide-to='" + index + "'></li>"
      });
    }
  // }
  // window.addEventListener('load', heroCarouselSlide);

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  let scrollTopFrame = null;
  function toggleScrollTop() {
    if (!scrollTop || scrollTopFrame) return;
    scrollTopFrame = requestAnimationFrame(() => {
      scrollTop.classList.toggle('active', window.scrollY > 100);
      scrollTopFrame = null;
    });
  }
  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop, { passive: true });

  /**
   * Respect the visitor's reduced motion preference
   */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * AOS is initialized once, in ux.js's retimeReveals() — not here. This file
   * used to call AOS.init() and stagger .hx-grid/.hx-service-grid/etc.
   * children on its own, and ux.js loads immediately after and did the exact
   * same two things again with tighter numbers (a 60ms stagger instead of
   * 100ms, a 620ms duration instead of 800ms). Two AOS.init() calls doesn't
   * cleanly hand off from one config to the other: each call registers its
   * own permanent 'load', 'resize' and 'orientationchange' listener inside
   * the library, so every scroll on the page ran AOS's full reveal pass
   * twice, forever, and the two staggering functions raced to overwrite the
   * same data-aos-delay attributes on the same elements. ux.js's numbers
   * always won the race (it runs second), so main.js's versions were dead
   * weight doing real work for no visible effect other than the doubled
   * listener overhead — removed rather than kept as an inert duplicate.
   */

  /**
   * Smooth scrolling for same-page hash links, offset by the sticky header
   */
  document.querySelectorAll('a[href*="#"]:not([href="#"]):not([data-bs-toggle]):not([data-bs-slide])').forEach(link => {
    link.addEventListener('click', function(e) {
      const url = new URL(this.href, window.location.href);
      if (url.pathname !== window.location.pathname || url.host !== window.location.host) return;

      const target = document.querySelector(url.hash);
      if (!target) return;

      e.preventDefault();
      const header = document.querySelector('#header');
      const offset = header ? header.offsetHeight + 10 : 0;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.pageYOffset - offset,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
      history.pushState(null, '', url.hash);
    });
  });

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Initiate Pure Counter
   */
  new PureCounter();

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

})();