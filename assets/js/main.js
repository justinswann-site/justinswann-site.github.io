/* Shell behaviour: active nav, breadcrumb, reveal-on-scroll, motion toggle. */
(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.remove('no-js');

  // ---- Reduce-motion preference (persisted) ----
  var KEY = 'js-reduce-motion';
  var toggle = document.getElementById('motion-toggle');
  function applyMotion(reduce) {
    html.classList.toggle('reduce-motion', reduce);
    if (window.QField) window.QField.setReduce(reduce);
    if (window.Bloch) window.Bloch.setReduce(reduce);
    if (toggle) toggle.checked = reduce;
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  var systemReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  applyMotion(saved === null ? systemReduce : saved === '1');
  if (toggle) toggle.addEventListener('change', function () {
    applyMotion(toggle.checked);
    try { localStorage.setItem(KEY, toggle.checked ? '1' : '0'); } catch (e) { /* ignore */ }
  });

  // ---- Reveal on scroll ----
  var revealTargets = document.querySelectorAll('.section-head, .panel, .milestones li, .tl-item, .project');
  Array.prototype.forEach.call(revealTargets, function (el, i) { el.classList.add('reveal'); el.style.transitionDelay = (Math.min(i % 6, 5) * 60) + 'ms'; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(revealTargets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(revealTargets, function (el) { el.classList.add('is-in'); });
  }

  // ---- Active section → nav + breadcrumb (scroll-position based) ----
  var sectionEls = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navLinks = document.querySelectorAll('[data-nav]');
  var crumb = document.getElementById('crumb');
  var names = { hero: 'overview', highlights: '2026-highlights', experience: 'experience', skills: 'skills', learning: 'learning', projects: 'side-projects', contact: 'contact' };
  var navKey = { hero: 'top' };
  var currentId = null;
  function setActive(id) {
    if (id === currentId) return;
    currentId = id;
    var key = navKey[id] || id;
    Array.prototype.forEach.call(navLinks, function (a) {
      var match = a.getAttribute('data-nav') === key;
      a.classList.toggle('is-active', match);
      if (match) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (crumb) crumb.textContent = names[id] || id;
  }
  var ticking = false;
  function updateActive() {
    ticking = false;
    var line = window.innerHeight * 0.4;
    var best = sectionEls[0] ? sectionEls[0].id : null;
    for (var i = 0; i < sectionEls.length; i++) {
      if (sectionEls[i].getBoundingClientRect().top <= line) best = sectionEls[i].id;
    }
    // bottom of page: last section wins
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2) best = sectionEls[sectionEls.length - 1].id;
    if (best) setActive(best);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateActive); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateActive();

  // ---- Footer year ----
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
