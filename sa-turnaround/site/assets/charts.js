// Small SVG charts drawn from the report. No library: a line chart with a
// crosshair, and a grouped bar chart. Colours come from CSS variables so light
// and dark mode each use their own validated steps.

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}

function text(parent, x, y, value, attrs = {}) {
  const t = el('text', { x, y, ...attrs }, parent);
  t.textContent = value;
  return t;
}

const pct = (v) => `${Math.round(v)}%`;

function niceMax(max) {
  const step = max > 60 ? 20 : max > 30 ? 10 : 5;
  return Math.ceil(max / step) * step;
}

function makeTip(host) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('aria-hidden', 'true');
  host.append(tip);
  return {
    show(html, x, y) {
      tip.innerHTML = html;
      const w = tip.offsetWidth;
      const left = Math.min(Math.max(x + 14, 0), host.clientWidth - w);
      tip.style.left = `${x + 14 + w > host.clientWidth ? Math.max(x - w - 14, 0) : left}px`;
      tip.style.top = `${Math.max(y - 20, 0)}px`;
      tip.classList.add('on');
    },
    hide() { tip.classList.remove('on'); },
  };
}

function legend(host, items, kind = 'line') {
  const ul = document.createElement('ul');
  ul.className = 'legend';
  for (const it of items) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="sw ${kind === 'bar' ? 'bar' : ''}" style="background:${it.color}"></span>${it.name}`;
    ul.append(li);
  }
  host.before(ul);
}

// series: [{ name, color, values, width?, label? }]; values aligned to xLabels.
export function lineChart(host, { xLabels, xTick, series, annotate, tipTitle }) {
  host.replaceChildren();
  const W = Math.max(host.clientWidth, 280);
  const narrow = W < 520;
  const H = narrow ? 230 : 270;
  const m = { top: 14, right: narrow ? 70 : 96, bottom: 28, left: 38 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const all = series.flatMap((s) => s.values);
  const yMax = niceMax(Math.max(...all));
  const x = (i) => m.left + (xLabels.length === 1 ? iw / 2 : (i / (xLabels.length - 1)) * iw);
  const y = (v) => m.top + ih - (v / yMax) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
  svg.setAttribute('aria-hidden', 'true');

  const step = yMax / 4;
  for (let v = 0; v <= yMax; v += step) {
    el('line', { class: v === 0 ? 'baseline' : 'grid-line', x1: m.left, x2: m.left + iw, y1: y(v), y2: y(v) }, svg);
    text(svg, m.left - 8, y(v) + 4, pct(v), { 'text-anchor': 'end' });
  }
  xLabels.forEach((label, i) => {
    const t = xTick(label, i);
    if (t) text(svg, x(i), H - 8, t, { 'text-anchor': i === 0 ? 'start' : 'middle' });
  });

  if (annotate) {
    const i = annotate.index;
    el('line', { class: 'cross', x1: x(i), x2: x(i), y1: m.top, y2: m.top + ih }, svg);
    const anchor = x(i) > m.left + iw * 0.6 ? 'end' : 'start';
    const dx = anchor === 'end' ? -6 : 6;
    text(svg, x(i) + dx, m.top + 10, annotate.lines[0], { 'text-anchor': anchor, class: 'label-strong' });
    if (annotate.lines[1]) text(svg, x(i) + dx, m.top + 26, annotate.lines[1], { 'text-anchor': anchor });
  }

  // Faint series first so the one that matters is drawn on top.
  const ordered = [...series].sort((a, b) => (a.width ?? 2) - (b.width ?? 2));
  for (const s of ordered) {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width ?? 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: s.opacity ?? 1 }, svg);
  }

  // Direct labels at the right end, nudged apart when they would collide.
  const ends = series.filter((s) => s.label !== false).map((s) => ({ s, y: y(s.values.at(-1)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  for (const e of ends) {
    text(svg, x(xLabels.length - 1) + 8, e.y + 4, e.s.label ?? e.s.name, { class: 'label-strong' });
  }

  // Hover layer: crosshair, dots and a tooltip at the nearest point.
  const cross = el('line', { class: 'cross', y1: m.top, y2: m.top + ih, opacity: 0 }, svg);
  const dots = series.map((s) => el('circle', { r: 4.5, class: 'dot', fill: s.color, opacity: 0 }, svg));
  const hit = el('rect', { class: 'hit', x: m.left - 10, y: m.top, width: iw + 20, height: ih }, svg);
  const tip = makeTip(host);
  const scale = () => svg.getBoundingClientRect().width / W;
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) / scale();
    const i = Math.max(0, Math.min(xLabels.length - 1, Math.round(((px - m.left) / iw) * (xLabels.length - 1))));
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
    series.forEach((s, k) => { dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(s.values[i])); dots[k].setAttribute('opacity', s.dot === false ? 0 : 1); });
    const rows = series.filter((s) => s.tip !== false).map((s) => `<div class="row"><span><i class="sw" style="background:${s.color}"></i>${s.name}</span><span>${s.values[i].toFixed(1)}%</span></div>`).join('');
    tip.show(`<b>${tipTitle(xLabels[i])}</b>${rows}`, x(i) * scale(), y(Math.max(...series.map((s) => s.values[i]))) * scale());
  };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => { tip.hide(); cross.setAttribute('opacity', 0); dots.forEach((d) => d.setAttribute('opacity', 0)); });
}

// groups: [{ label, values: [a, b] }], series: [{ name, color }]
export function barChart(host, { groups, series }) {
  host.replaceChildren();
  const W = Math.max(host.clientWidth, 280);
  const narrow = W < 520;
  const H = narrow ? 230 : 250;
  const m = { top: 22, right: 8, bottom: 40, left: 38 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const yMax = niceMax(Math.max(...groups.flatMap((g) => g.values)));
  const y = (v) => m.top + ih - (v / yMax) * ih;
  const gw = iw / groups.length;
  const bw = Math.min(narrow ? 30 : 44, (gw * 0.7) / series.length);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
  svg.setAttribute('aria-hidden', 'true');
  for (let v = 0; v <= yMax; v += yMax / 4) {
    el('line', { class: v === 0 ? 'baseline' : 'grid-line', x1: m.left, x2: m.left + iw, y1: y(v), y2: y(v) }, svg);
    text(svg, m.left - 8, y(v) + 4, pct(v), { 'text-anchor': 'end' });
  }
  const tip = makeTip(host);
  groups.forEach((g, gi) => {
    const cx = m.left + gw * gi + gw / 2;
    const start = cx - (bw * series.length + 2 * (series.length - 1)) / 2;
    text(svg, cx, H - 20, g.label, { 'text-anchor': 'middle', class: 'label-strong' });
    if (g.note) text(svg, cx, H - 5, g.note, { 'text-anchor': 'middle' });
    g.values.forEach((v, si) => {
      const bx = start + si * (bw + 2);
      const top = y(v);
      const h = m.top + ih - top;
      const r = Math.min(4, h);
      // Rounded data end, square at the baseline.
      el('path', { d: `M${bx},${m.top + ih}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + bw - r}Q${bx + bw},${top} ${bx + bw},${top + r}V${m.top + ih}Z`, fill: series[si].color }, svg);
      text(svg, bx + bw / 2, top - 6, pct(v), { 'text-anchor': 'middle', class: 'label-strong' });
      const hit = el('rect', { class: 'hit', x: bx - 1, y: m.top, width: bw + 2, height: ih }, svg);
      hit.addEventListener('pointerenter', () => {
        const s = svg.getBoundingClientRect().width / W;
        tip.show(`<b>${g.label}</b><div class="row"><span><i class="sw" style="background:${series[si].color}"></i>${series[si].name}</span><span>${v.toFixed(1)}%</span></div><div class="row"><span>Requests</span><span>${g.n.toLocaleString('en-ZA')}</span></div>`, (bx + bw / 2) * s, top * s);
      });
      hit.addEventListener('pointerleave', () => tip.hide());
    });
  });
}

// One column per point; positive and negative values get their own colour.
// points: [{ key, value, tip }]
export function columnChart(host, { points, xTick, colors, annotate }) {
  host.replaceChildren();
  const W = Math.max(host.clientWidth, 280);
  const narrow = W < 520;
  const H = narrow ? 230 : 260;
  const m = { top: 30, right: 8, bottom: 26, left: 38 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const hi = niceMax(Math.max(...points.map((p) => p.value), 1));
  const lo = -niceMax(Math.max(...points.map((p) => -p.value), 1));
  const y = (v) => m.top + ((hi - v) / (hi - lo)) * ih;
  const slot = iw / points.length;
  const bw = Math.max(slot - 2, 2);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
  svg.setAttribute('aria-hidden', 'true');
  const step = hi - lo > 40 ? 10 : 5;
  for (let v = lo; v <= hi; v += step) {
    el('line', { class: v === 0 ? 'baseline' : 'grid-line', x1: m.left, x2: m.left + iw, y1: y(v), y2: y(v) }, svg);
    text(svg, m.left - 8, y(v) + 4, `${v > 0 ? '+' : ''}${v}`, { 'text-anchor': 'end' });
  }
  text(svg, m.left - 8, m.top - 14, 'points', { 'text-anchor': 'start' });
  const tip = makeTip(host);
  points.forEach((p, i) => {
    const bx = m.left + i * slot + 1;
    const top = y(Math.max(p.value, 0));
    const bottom = y(Math.min(p.value, 0));
    const h = Math.max(bottom - top, 1);
    const r = Math.min(3, h, bw / 2);
    const d = p.value >= 0
      ? `M${bx},${bottom}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + bw - r}Q${bx + bw},${top} ${bx + bw},${top + r}V${bottom}Z`
      : `M${bx},${top}V${bottom - r}Q${bx},${bottom} ${bx + r},${bottom}H${bx + bw - r}Q${bx + bw},${bottom} ${bx + bw},${bottom - r}V${top}Z`;
    el('path', { d, fill: p.value >= 0 ? colors[0] : colors[1] }, svg);
    const t = xTick(p.key, i);
    if (t) text(svg, bx, H - 8, t, { 'text-anchor': 'start' });
    const hit = el('rect', { class: 'hit', x: m.left + i * slot, y: m.top, width: slot, height: ih }, svg);
    hit.addEventListener('pointerenter', () => {
      const s = svg.getBoundingClientRect().width / W;
      tip.show(p.tip, (bx + bw / 2) * s, top * s);
    });
    hit.addEventListener('pointerleave', () => tip.hide());
  });
  for (const a of annotate ?? []) {
    const bx = m.left + a.index * slot + slot / 2;
    const anchor = bx > m.left + iw * 0.75 ? 'end' : 'middle';
    text(svg, bx, y(points[a.index].value) - 8, a.label, { 'text-anchor': anchor, class: 'label-strong' });
  }
}

export { legend };
