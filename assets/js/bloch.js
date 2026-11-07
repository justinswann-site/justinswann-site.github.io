/* Interactive Bloch sphere
   A qubit state |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩ drawn on a sphere.
   Pointer steers θ/φ, idle precesses, click/tap "measures": the vector snaps
   to |0⟩ or |1⟩ with probability cos²(θ/2) / sin²(θ/2), then decoheres back. */
(function () {
  'use strict';
  var canvas = document.getElementById('bloch');
  var readout = document.getElementById('bloch-readout');
  var sideReadout = document.getElementById('state-readout');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var size = 320, DPR = 1;
  var theta = Math.PI / 3, phi = 0;           // current state
  var tTheta = theta, tPhi = phi;             // target state (from pointer)
  var steering = false, measured = null, measureAge = 0, decoherAt = 0;
  var rafId = 0, running = false, reduce = false, last = 0;

  var C = { cyan: '#4ff0e0', violet: '#9b7bff', pink: '#ff6ad5', fg: 'rgba(231,236,255,', dim: 'rgba(138,151,184,' };

  function resize() {
    var rect = canvas.getBoundingClientRect();
    size = Math.max(120, Math.round(rect.width || 320));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * DPR; canvas.height = size * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (reduce) draw(0);
  }

  // project a point on the unit sphere to 2D with a slight camera tilt
  var TILT = 0.42;
  function project(x, y, z) {
    // rotate around x-axis by TILT so the equator shows as an ellipse
    var y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
    var z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
    var R = size * 0.38, cx = size / 2, cy = size / 2;
    return { x: cx + x * R, y: cy - z2 * R, depth: y2 };
  }

  function stateVector(th, ph) {
    return { x: Math.sin(th) * Math.cos(ph), y: Math.sin(th) * Math.sin(ph), z: Math.cos(th) };
  }

  function fmt(n) { return (Math.round(n * 100) / 100).toFixed(2); }

  function updateReadout() {
    var a = Math.cos(theta / 2), b = Math.sin(theta / 2);
    var txt;
    if (measured !== null) {
      txt = 'measured → |' + measured + '⟩   p = ' + fmt(measured === 0 ? a * a : b * b);
    } else {
      txt = '|ψ⟩ = ' + fmt(a) + '|0⟩ + e^{i' + fmt(phi) + '}·' + fmt(b) + '|1⟩';
    }
    if (readout) readout.textContent = txt;
    if (sideReadout) sideReadout.textContent = measured !== null ? '|ψ⟩ = |' + measured + '⟩ (collapsed)' : '|ψ⟩ = ' + fmt(a) + '|0⟩ + ' + fmt(b) + '|1⟩';
  }

  function draw(t) {
    var R = size * 0.38, cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);

    // soft glow
    var grd = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.4);
    grd.addColorStop(0, 'rgba(155,123,255,0.14)'); grd.addColorStop(1, 'rgba(155,123,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, size, size);

    // sphere outline
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = C.fg + '0.35)'; ctx.lineWidth = 1.2; ctx.stroke();

    // latitude rings
    var i, k, p, steps = 72;
    for (k = -2; k <= 2; k++) {
      var z = k * 0.38; var rr = Math.sqrt(Math.max(0, 1 - z * z));
      ctx.beginPath();
      for (i = 0; i <= steps; i++) {
        var a = i / steps * Math.PI * 2;
        p = project(rr * Math.cos(a), rr * Math.sin(a), z);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = k === 0 ? C.fg + '0.35)' : C.fg + '0.10)'; ctx.lineWidth = k === 0 ? 1.2 : 1; ctx.stroke();
    }
    // meridians
    for (k = 0; k < 3; k++) {
      var ph = k * Math.PI / 3 + t * 0.05;
      ctx.beginPath();
      for (i = 0; i <= steps; i++) {
        var th = i / steps * Math.PI * 2;
        p = project(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = C.fg + '0.09)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // axes labels
    ctx.font = (size * 0.045) + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = C.dim + '1)'; ctx.textAlign = 'center';
    var top = project(0, 0, 1), bot = project(0, 0, -1), px = project(1, 0, 0);
    ctx.fillText('|0⟩', top.x, top.y - size * 0.035);
    ctx.fillText('|1⟩', bot.x, bot.y + size * 0.06);
    ctx.fillText('|+⟩', px.x + size * 0.05, px.y + size * 0.015);

    // state vector
    var v = stateVector(theta, phi);
    var tip = project(v.x, v.y, v.z);
    var col = measured !== null ? C.pink : C.cyan;
    // shadow onto equator plane
    var sh = project(v.x, v.y, 0);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sh.x, sh.y);
    ctx.strokeStyle = C.fg + '0.18)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = C.fg + '0.18)'; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
    // tip glow
    var g2 = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, size * 0.06);
    g2.addColorStop(0, col); g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55; ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(tip.x, tip.y, size * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(tip.x, tip.y, size * 0.016, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    // origin
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fillStyle = C.fg + '0.8)'; ctx.fill();

    // measurement ring
    if (measured !== null && measureAge < 1) {
      ctx.beginPath(); ctx.arc(tip.x, tip.y, size * 0.02 + measureAge * size * 0.18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,106,213,' + (0.7 * (1 - measureAge)) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  function lerpAngle(a, b, k) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(48, now - last || 16); last = now;
    var t = now / 1000;
    var k = 1 - Math.pow(0.001, dt / 1000); // smooth follow

    if (measured !== null) {
      measureAge = Math.min(1, measureAge + dt / 900);
      theta += ((measured === 0 ? 0.001 : Math.PI - 0.001) - theta) * Math.min(1, dt / 90);
      if (now > decoherAt) { measured = null; tTheta = Math.PI / 3 + Math.sin(t * 0.3) * 0.5; }
    } else if (steering) {
      theta += (tTheta - theta) * k; phi = lerpAngle(phi, tPhi, k);
    } else {
      // idle precession
      phi += dt * 0.0009;
      var idleTheta = Math.PI / 3 + Math.sin(t * 0.35) * 0.55;
      theta += (idleTheta - theta) * Math.min(1, dt / 1200);
    }
    draw(t);
    updateReadout();
    rafId = requestAnimationFrame(frame);
  }

  function pointerToState(e) {
    var rect = canvas.getBoundingClientRect();
    var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    tTheta = Math.min(Math.PI - 0.05, Math.max(0.05, (ny + 1) / 2 * Math.PI));
    tPhi = nx * Math.PI;
  }

  canvas.addEventListener('pointermove', function (e) { if (measured !== null) return; steering = true; pointerToState(e); }, { passive: true });
  canvas.addEventListener('pointerleave', function () { steering = false; });
  canvas.addEventListener('pointerdown', function (e) {
    if (measured !== null) return;
    pointerToState(e);
    var p0 = Math.cos(theta / 2) * Math.cos(theta / 2);
    measured = Math.random() < p0 ? 0 : 1;
    measureAge = 0; decoherAt = performance.now() + 2600; steering = false;
    if (reduce) { theta = measured === 0 ? 0.001 : Math.PI - 0.001; draw(0); updateReadout(); setTimeout(function () { measured = null; theta = Math.PI / 3; draw(0); updateReadout(); }, 2600); }
  });
  canvas.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 })); } });
  canvas.tabIndex = 0;

  function start() { if (running || reduce) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(rafId); }
  function setReduce(v) { reduce = !!v; if (reduce) { stop(); draw(0); updateReadout(); } else start(); }

  window.Bloch = { setReduce: setReduce };
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  resize();
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  setReduce(mq.matches || document.documentElement.classList.contains('reduce-motion'));
})();
