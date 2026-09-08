/**
 * TechStar Store — "most popular right now" carousel on the home page.
 *
 * Pulls the store's genuine best sellers (ranked by orders) and cycles them,
 * so the section shows movement and a changing selection rather than four
 * fixed cards. Swiper is already loaded by the page, but the site's own
 * initSwiper() runs on page load — these slides arrive over the network
 * afterwards, so the carousel is constructed here once the data lands.
 *
 * Update the two constants below when the store moves to its real domain.
 */
(function () {
  var STORE_WEB_URL = 'https://store-production-1570.up.railway.app';
  var STORE_API_URL = 'https://store-production-1570.up.railway.app/api/v1';
  var LIMIT = 12;

  var track = document.getElementById('hx-shop-grid');
  if (!track) return;

  var section = track.closest('.hx-shop');
  var dots = document.getElementById('hx-shop-dots');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Five stars with the average filled in — the shorthand shoppers scan for. */
  function stars(value) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<i class="bi bi-star' + (i <= Math.round(value) ? '-fill' : '') + '"></i>';
    }
    return '<span class="hx-shop-stars">' + out + '</span>';
  }

  function badge(product, index) {
    // Rank is only meaningful for the genuine top few; past that it is noise.
    if (index === 0) return '<span class="hx-shop-badge hx-shop-badge--rank">#1 Best seller</span>';
    if (product.discount) {
      return '<span class="hx-shop-badge hx-shop-badge--sale">&minus;' + product.discount.percent + '%</span>';
    }
    if (product.isNew) return '<span class="hx-shop-badge hx-shop-badge--new">New</span>';
    if (index < 3) return '<span class="hx-shop-badge hx-shop-badge--rank">#' + (index + 1) + ' Best seller</span>';
    return '';
  }

  function stockLine(p) {
    if (!p.inStock) {
      return '<span class="hx-shop-stock hx-shop-stock--out">Out of stock</span>';
    }
    if (p.totalStock > 0 && p.totalStock <= 5) {
      return '<span class="hx-shop-stock hx-shop-stock--low">Only ' + p.totalStock + ' left</span>';
    }
    return '<span class="hx-shop-stock">In stock</span>';
  }

  function slide(p, index) {
    var image = p.image && (p.image.md || p.image.sm || p.image.lg);
    var price = p.priceMax ? 'From ' + p.price.formatted : p.price.formatted;
    var was = p.wasPrice ? '<s>' + esc(p.wasPrice.formatted) + '</s>' : '';
    var url = STORE_WEB_URL + '/product/' + encodeURIComponent(p.slug);
    var rating = p.rating && p.rating.count > 0
      ? '<div class="hx-shop-rating">' + stars(p.rating.average)
        + '<small>(' + p.rating.count + ')</small></div>'
      : '<div class="hx-shop-rating"></div>';

    return '<div class="swiper-slide">'
      + '<a class="hx-shop-card px-lit" href="' + url + '" target="_blank" rel="noopener">'
      + '<div class="hx-shop-card-media">'
      + (image ? '<img src="' + esc(image) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' : '')
      + badge(p, index)
      + '<span class="hx-shop-view">View product <i class="bi bi-arrow-right"></i></span>'
      + '</div>'
      + '<div class="hx-shop-card-body">'
      + '<span class="hx-shop-card-cat">' + esc(p.subcategory ? p.subcategory.name : '') + '</span>'
      + '<h3>' + esc(p.name) + '</h3>'
      + rating
      + '<div class="hx-shop-card-price">' + esc(price) + was + '</div>'
      + stockLine(p)
      + '</div>'
      + '</a></div>';
  }

  function hideSection() {
    if (section) section.style.display = 'none';
  }

  function build(products) {
    track.innerHTML = products.map(slide).join('');

    if (typeof window.Swiper !== 'function') return; // cards still render, just static

    var swiper = new window.Swiper('#hx-shop-swiper', {
      slidesPerView: 1.15,
      spaceBetween: 20,
      // Looping needs enough slides to fill a viewport twice over, otherwise
      // Swiper duplicates too few and the track visibly jumps.
      loop: products.length >= 6,
      grabCursor: true,
      speed: 700,
      autoplay: {
        delay: 3200,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      navigation: { prevEl: '#hx-shop-prev', nextEl: '#hx-shop-next' },
      pagination: { el: '#hx-shop-dots', clickable: true },
      breakpoints: {
        576: { slidesPerView: 2, spaceBetween: 20 },
        768: { slidesPerView: 3, spaceBetween: 22 },
        1200: { slidesPerView: 4, spaceBetween: 24 },
      },
      a11y: {
        prevSlideMessage: 'Previous products',
        nextSlideMessage: 'Next products',
      },
    });

    // Motion is decoration here, so stop it for anyone who has opted out.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && swiper.autoplay) {
      swiper.autoplay.stop();
    }

    // Autoplay that keeps running in a background tab wastes cycles and means
    // the visitor returns to a position they never scrolled to.
    document.addEventListener('visibilitychange', function () {
      if (!swiper.autoplay) return;
      if (document.hidden) swiper.autoplay.stop();
      else swiper.autoplay.start();
    });
  }

  fetch(STORE_API_URL + '/products?pageSize=' + LIMIT + '&sort=bestSelling&inStock=true')
    .then(function (res) {
      if (!res.ok) throw new Error('store api error');
      return res.json();
    })
    .then(function (json) {
      var items = (json && json.data) || [];
      if (!items.length) { hideSection(); return; }
      build(items);
      if (dots) dots.classList.add('is-ready');
    })
    .catch(hideSection);
})();
