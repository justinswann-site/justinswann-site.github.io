/* Quantum particle field
   Particles live in superposition between two ghost positions. Near the pointer
   they "collapse" to one of them (observer effect) and slowly decohere back.
   Some particles are entangled: measuring one collapses its partner to the
   opposite state. Honors prefers-reduced-motion and the on-page toggle. */
(function () {
  'use strict';
  var canvas = document.getElementById('qfield');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d', { alpha: true });

  var W = 0, H = 0, DPR = 1;
  var particles = [];
  var pointer = { x: -9999, y: -9999, active: false };
  var running = false, rafId = 0, last = 0;
  var reduce = false;

  var COLORS = {
    cyan: [79, 240, 224],
    violet: [155, 123, 255],
    pink: [255, 106, 213]
  };

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
    if (reduce) drawStatic();
  }

  function seed() {
    var area = W * H;
    var count = Math.max(28, Math.min(110, Math.round(area / 16000)));
    if (W < 768) count = Math.min(count, 42);
    particles = [];
    for (var i = 0; i < count; i++) {
      var cx = rand(0, W), cy = rand(0, H);
      var sep = rand(14, 44);
      var ang = rand(0, Math.PI * 2);
      particles.push({
        cx: cx, cy: cy,
        vx: rand(-0.08, 0.08), vy: rand(-0.06, 0.06),
        sep: sep, ang: ang, spin: rand(-0.004, 0.004),
        phase: rand(0, Math.PI * 2), freq: rand(0.4, 1.1),
        r: rand(1.2, 2.4),
        color: Math.random() < 0.65 ? COLORS.cyan : COLORS.violet,
        collapsed: 0,        // 0 = superposition, 1 = fully collapsed
        state: 0,            // which ghost it collapsed to
        ring: 0,             // ring pulse age
        partner: -1
      });
    }
    // entangle ~25% in pairs
    var idx = particles.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    for (var k = 0; k + 1 < idx.length * 0.5; k += 2) {
      var a = idx[k], b = idx[k + 1];
      particles[a].partner = b; particles[b].partner = a;
      particles[b].color = particles[a].color;
    }
  }

  function ghostPositions(p, t) {
    // superposition weight oscillates: |α|² = cos²(θ/2)
    var theta = p.phase + t * p.freq;
    var w0 = Math.cos(theta / 2) * Math.cos(theta / 2);
    var dx = Math.cos(p.ang) * p.sep / 2, dy = Math.sin(p.ang) * p.sep / 2;
    return {
      x0: p.cx - dx, y0: p.cy - dy, x1: p.cx + dx, y1: p.cy + dy, w0: w0, w1: 1 - w0
    };
  }

  function step(dt, t) {
    var influence = W < 768 ? 90 : 150;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.cx += p.vx * dt; p.cy += p.vy * dt; p.ang += p.spin * dt;
      if (p.cx < -40) p.cx = W + 40; if (p.cx > W + 40) p.cx = -40;
      if (p.cy < -40) p.cy = H + 40; if (p.cy > H + 40) p.cy = -40;

      var dx = p.cx - pointer.x, dy = p.cy - pointer.y;
      var d2 = dx * dx + dy * dy;
      if (pointer.active && d2 < influence * influence) {
        if (p.collapsed < 0.05) {
          var g = ghostPositions(p, t);
          p.state = Math.random() < g.w0 ? 0 : 1;
          p.ring = 0.001;
          if (p.partner >= 0) {
            var q = particles[p.partner];
            if (q.collapsed < 0.05) { q.state = 1 - p.state; q.ring = 0.001; q.collapsed = Math.max(q.collapsed, 0.06); q.link = 1; p.link = 1; }
          }
        }
        p.collapsed = Math.min(1, p.collapsed + dt * 0.012);
      } else {
        p.collapsed = Math.max(0, p.collapsed - dt * 0.0022); // decoherence
      }
      if (p.ring > 0) { p.ring += dt * 0.0016; if (p.ring > 1) p.ring = 0; }
      if (p.link) { p.link = Math.max(0, p.link - dt * 0.0012); }
    }
  }

  function drawParticle(p, t) {
    var g = ghostPositions(p, t);
    var c = p.collapsed;
    var col = p.color;
    // ghosts fade out as the particle collapses
    var ga = (1 - c);
    if (ga > 0.01) {
      ctx.beginPath(); ctx.arc(g.x0, g.y0, p.r + g.w0 * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, 0.22 * ga * (0.35 + g.w0)); ctx.fill();
      ctx.beginPath(); ctx.arc(g.x1, g.y1, p.r + g.w1 * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, 0.22 * ga * (0.35 + g.w1)); ctx.fill();
      // probability arc between the two ghosts
      ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1);
      ctx.strokeStyle = rgba(col, 0.10 * ga); ctx.lineWidth = 1; ctx.stroke();
    }
    if (c > 0.01) {
      var x = p.state === 0 ? g.x0 : g.x1, y = p.state === 0 ? g.y0 : g.y1;
      ctx.beginPath(); ctx.arc(x, y, p.r + 1.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.pink, 0.9 * c); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, p.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.pink, 0.18 * c); ctx.fill();
      if (p.ring > 0) {
        ctx.beginPath(); ctx.arc(x, y, 6 + p.ring * 34, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(COLORS.pink, 0.5 * (1 - p.ring)); ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  function drawLinks(t) {
    // entanglement lines: faint always, bright on joint collapse
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.partner < i) continue;
      var q = particles[p.partner];
      var dx = p.cx - q.cx, dy = p.cy - q.cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 320) continue;
      var a = 0.05 * (1 - d / 320) + (p.link || 0) * 0.5;
      ctx.beginPath(); ctx.moveTo(p.cx, p.cy); ctx.lineTo(q.cx, q.cy);
      ctx.strokeStyle = rgba(p.color, a); ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(48, now - last || 16); last = now;
    var t = now / 1000;
    step(dt, t);
    ctx.clearRect(0, 0, W, H);
    drawLinks(t);
    for (var i = 0; i < particles.length; i++) drawParticle(particles[i], t);
    rafId = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    drawLinks(0);
    for (var i = 0; i < particles.length; i++) drawParticle(particles[i], 0);
  }

  function start() { if (running || reduce) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  function setReduce(v) {
    reduce = !!v;
    if (reduce) { stop(); drawStatic(); } else { start(); }
  }

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pointerFine = window.matchMedia('(pointer: fine)');

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { pointer.active = false; });
  window.addEventListener('pointerdown', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    if (!pointerFine.matches) setTimeout(function () { pointer.active = false; }, 900);
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  // Expose for main.js toggle
  window.QField = { setReduce: setReduce };

  resize();
  setReduce(mq.matches || document.documentElement.classList.contains('reduce-motion'));
  if (mq.addEventListener) mq.addEventListener('change', function (e) { if (!document.documentElement.classList.contains('reduce-motion')) setReduce(e.matches); });
})();
