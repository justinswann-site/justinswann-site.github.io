/* 2026 highlights as a quantum circuit (desktop).
   Source of truth is the <ol id="milestones"> in the HTML, so the content is
   indexable without JS. This script lays those items out on three wires by
   quarter, draws a CNOT between the data-platform and AI wires, and shows a
   detail panel for the selected gate. */
(function () {
  'use strict';
  var root = document.getElementById('circuit');
  var list = document.getElementById('milestones');
  var detail = document.getElementById('gate-detail');
  if (!root || !list || !detail) return;

  var WIRES = [
    { name: 'Data platform', ket: '|data⟩', sub: 'Snowflake · BI factory · delivery' },
    { name: 'Applied AI', ket: '|ai⟩', sub: 'practices · policy · tooling' },
    { name: 'Learning & build', ket: '|me⟩', sub: 'calculus · ML · Unreal' }
  ];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var items = Array.prototype.map.call(list.querySelectorAll('li'), function (li, i) {
    return {
      i: i,
      wire: +li.getAttribute('data-wire'),
      q: +li.getAttribute('data-q'),
      glyph: li.getAttribute('data-glyph'),
      tag: li.getAttribute('data-tag'),
      wip: li.getAttribute('data-wip') === 'true',
      title: li.querySelector('h3').textContent,
      body: li.querySelector('p').textContent
    };
  });

  // Place gates: within a quarter, spread multiple gates across its 3 months.
  var byCell = {};
  items.forEach(function (it) { var key = it.wire + ':' + it.q; (byCell[key] = byCell[key] || []).push(it); });
  Object.keys(byCell).forEach(function (key) {
    var arr = byCell[key];
    arr.forEach(function (it, n) {
      var base = (it.q - 1) * 3;                       // 0,3,6,9
      var offsets = arr.length === 1 ? [1] : arr.length === 2 ? [0, 2] : [0, 1, 2];
      it.col = 2 + base + offsets[n];                  // grid col (1 = labels)
    });
  });

  var grid = document.createElement('div');
  grid.className = 'circuit-grid';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', '2026 highlights laid out as a quantum circuit');

  // month header
  MONTHS.forEach(function (m, i) {
    var el = document.createElement('div');
    el.className = 'circuit-month' + (i % 3 === 0 ? ' q-start' : '');
    el.style.gridColumn = String(i + 2);
    el.textContent = i % 3 === 0 ? 'Q' + (i / 3 + 1) + ' · ' + m : m;
    grid.appendChild(el);
  });

  WIRES.forEach(function (w, wi) {
    var row = wi + 2;
    var label = document.createElement('div');
    label.className = 'wire-label'; label.style.gridRow = String(row);
    label.innerHTML = '<span><span class="ket">' + w.ket + '</span> ' + w.name + '</span><small>' + w.sub + '</small>';
    grid.appendChild(label);
    var line = document.createElement('div');
    line.className = 'wire-line'; line.style.gridRow = String(row); line.setAttribute('data-wire', String(wi));
    grid.appendChild(line);
  });

  var gates = [];
  items.forEach(function (it) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'gate';
    b.style.gridRow = String(it.wire + 2); b.style.gridColumn = String(it.col);
    b.setAttribute('data-wire', String(it.wire));
    if (it.wip) b.setAttribute('data-wip', 'true');
    b.setAttribute('data-glyph', it.glyph);
    b.setAttribute('aria-label', it.title + '. ' + it.tag + ', quarter ' + it.q + ' 2026.');
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span aria-hidden="true">' + it.glyph + '</span><span class="gate-tip" aria-hidden="true">' + it.title + '</span>';
    b.addEventListener('click', function () { select(it.i); });
    b.addEventListener('mouseenter', function () { if (!locked) show(it.i, false); });
    grid.appendChild(b);
    gates.push(b);
  });

  // CNOT: control on data wire at the AI tooling gate's column → target on AI wire
  var aiTools = items.filter(function (it) { return it.wire === 1 && it.glyph === 'X'; })[0];
  var svg = null;
  if (aiTools) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'cnot');
    svg.innerHTML = '<line x1="0" y1="0" x2="0" y2="0"/><circle class="ctrl" r="6" cx="0" cy="0"/>';
    grid.appendChild(svg);
  }

  root.appendChild(grid);

  function layoutCnot() {
    if (!svg || !aiTools) return;
    var g = gates[aiTools.i].getBoundingClientRect();
    var gr = grid.getBoundingClientRect();
    var dataLine = grid.querySelector('.wire-line[data-wire="0"]').getBoundingClientRect();
    var x = g.left + g.width / 2 - gr.left;
    var y1 = dataLine.top + dataLine.height / 2 - gr.top;
    var y2 = g.top - gr.top;
    svg.setAttribute('width', gr.width); svg.setAttribute('height', gr.height);
    svg.setAttribute('viewBox', '0 0 ' + gr.width + ' ' + gr.height);
    var line = svg.querySelector('line'); var ctrl = svg.querySelector('.ctrl');
    line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('y1', y1); line.setAttribute('y2', y2);
    ctrl.setAttribute('cx', x); ctrl.setAttribute('cy', y1);
  }

  var current = -1, locked = false;
  function render(i) {
    var it = items[i];
    var inner = detail.querySelector('.gate-detail-inner');
    inner.innerHTML =
      '<div class="gd-glyph gd-swap" data-wire="' + it.wire + '"' + (it.wip ? ' data-wip="true"' : '') + '>' + it.glyph + '</div>' +
      '<div class="gd-body gd-swap">' +
        '<div class="gd-meta">' + WIRES[it.wire].ket + ' ' + WIRES[it.wire].name + (it.tag.toLowerCase() === WIRES[it.wire].name.toLowerCase() ? '' : ' · ' + it.tag) + ' · Q' + it.q + ' 2026' + (it.wip ? ' · work in progress' : '') + '</div>' +
        '<h3>' + it.title + '</h3><p>' + it.body + '</p>' +
        '<div class="gd-nav"><button type="button" data-dir="-1">← prev gate</button><button type="button" data-dir="1">next gate →</button></div>' +
      '</div>';
    inner.querySelectorAll('.gd-nav button').forEach(function (b) {
      b.addEventListener('click', function () { select((current + (+b.getAttribute('data-dir')) + items.length) % items.length); });
    });
    detail.classList.add('is-set');
  }
  function show(i, lock) {
    if (i === current) return;
    current = i;
    gates.forEach(function (g, n) { g.classList.toggle('is-active', n === i); g.setAttribute('aria-pressed', n === i ? 'true' : 'false'); });
    render(i);
    if (lock) locked = true;
  }
  function select(i) { locked = true; current = -1; show(i, true); gates[i].focus({ preventScroll: true }); }

  grid.addEventListener('mouseleave', function () { /* keep last shown; nothing to reset */ });

  // keyboard: arrows move between gates when one is focused
  grid.addEventListener('keydown', function (e) {
    var idx = gates.indexOf(document.activeElement);
    if (idx < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select((idx + 1) % items.length); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select((idx - 1 + items.length) % items.length); }
  });

  // initial state: first gate shown, not locked, so hover still previews
  show(0, false);
  layoutCnot();
  window.addEventListener('resize', layoutCnot, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutCnot);
  setTimeout(layoutCnot, 300);
})();
