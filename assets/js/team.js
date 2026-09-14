/**
 * Team sections, loaded from the store's admin rather than hard-coded here.
 *
 * Staff and board used to be markup in index.html, staff.html and board.html,
 * so changing a person meant editing three files by hand. They are records in
 * the store's admin now; this renders whichever of the three grids is on the
 * current page from that data.
 *
 * Each grid opts in with data attributes, so a page only needs the container:
 *
 *     <div class="hx-team-grid" data-team-group="staff" data-team-limit="3">
 *
 * The existing markup stays in the HTML as-is and is replaced once the data
 * arrives — so if the API is unreachable the page still shows the last known
 * team rather than an empty section.
 */
(function () {
  var STORE_API_URL = 'https://store-production-1570.up.railway.app/api/v1';

  var grids = document.querySelectorAll('[data-team-group]');
  if (!grids.length) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * The home page links every card to TechStar's own channels, while the
   * staff and board pages link each person's. Passing the fallback set in
   * from the markup keeps that difference out of this file.
   */
  function socials(member, fallback) {
    var links = [
      { key: 'x', icon: 'bi-twitter-x', label: 'X' },
      { key: 'facebook', icon: 'bi-facebook', label: 'Facebook' },
      { key: 'instagram', icon: 'bi-instagram', label: 'Instagram' },
      { key: 'linkedin', icon: 'bi-linkedin', label: 'LinkedIn' },
    ];
    var out = '';
    for (var i = 0; i < links.length; i++) {
      var url = (member.socials && member.socials[links[i].key]) || fallback[links[i].key];
      // A person with no link for a network simply does not get that icon,
      // rather than the "#" placeholders the old markup carried.
      if (!url) continue;
      out += '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="'
        + esc(member.name) + ' on ' + links[i].label + '">'
        + '<i class="bi ' + links[i].icon + '"></i></a>';
    }
    return out;
  }

  function card(member, index, fallback) {
    var image = member.image && (member.image.md || member.image.sm || member.image.lg);
    var delay = index > 0 ? ' data-aos-delay="' + (index * 100) + '"' : '';
    return '<article class="hx-member" data-aos="fade-up"' + delay + '>'
      + (image
        ? '<img src="' + esc(image) + '" alt="' + esc(member.name) + '" loading="lazy" decoding="async">'
        : '')
      + '<div class="hx-member-info">'
      + '<h4>' + esc(member.name) + '</h4>'
      + '<span>' + esc(member.role) + '</span>'
      + '<div class="hx-socials">' + socials(member, fallback) + '</div>'
      + '</div>'
      + '</article>';
  }

  function render(grid, members) {
    var limit = parseInt(grid.getAttribute('data-team-limit'), 10);
    if (limit > 0) members = members.slice(0, limit);
    if (!members.length) return; // keep whatever the page already shows

    var fallback = {
      x: grid.getAttribute('data-social-x'),
      facebook: grid.getAttribute('data-social-facebook'),
      instagram: grid.getAttribute('data-social-instagram'),
      linkedin: grid.getAttribute('data-social-linkedin'),
    };

    grid.innerHTML = members.map(function (m, i) { return card(m, i, fallback); }).join('');

    // These cards did not exist when AOS scanned the page, so its observers
    // never saw them; without this they sit at opacity 0 forever.
    if (window.AOS && typeof window.AOS.refreshHard === 'function') window.AOS.refreshHard();
  }

  Array.prototype.forEach.call(grids, function (grid) {
    var group = grid.getAttribute('data-team-group');
    fetch(STORE_API_URL + '/team?group=' + encodeURIComponent(group))
      .then(function (res) {
        if (!res.ok) throw new Error('team api error');
        return res.json();
      })
      .then(function (json) { render(grid, (json && json.data) || []); })
      .catch(function () { /* leave the markup already on the page */ });
  });
})();
