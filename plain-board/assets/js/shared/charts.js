// Charts drawn as plain SVG. Nothing is loaded from outside, and every mark comes from a figure on the page.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgNode(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

// One rate as a ring, with the figure it stands for in the middle
function ringChart(fraction, label, caption, tone = 'accent') {
  const size = 128;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const part = Math.max(0, Math.min(1, fraction));

  const svg = svgNode('svg', { viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' });
  svg.append(svgNode('circle', {
    cx: size / 2, cy: size / 2, r: radius, fill: 'none',
    stroke: 'var(--field)', 'stroke-width': stroke
  }));
  svg.append(svgNode('circle', {
    cx: size / 2, cy: size / 2, r: radius, fill: 'none',
    stroke: `var(--ring-${tone})`, 'stroke-width': stroke, 'stroke-linecap': 'round',
    'stroke-dasharray': `${circumference * part} ${circumference}`,
    transform: `rotate(-90 ${size / 2} ${size / 2})`
  }));

  const art = create('div', 'ring-art');
  art.append(svg, create('b', '', formatPercent(fraction)));

  const figure = create('figure', `ring ring-${tone}`);
  const legend = create('figcaption');
  legend.append(create('span', '', label), create('small', '', caption));
  figure.append(art, legend);
  return figure;
}

// A run of figures over time. The scale is printed, so every line on the chart names a value.
function areaChart(points, { format = formatNumber, label = 'value', key = 'Value' } = {}) {
  const width = 640;
  const height = 190;
  const top = 14;
  const bottom = height - 26;
  const most = Math.max(...points.map((point) => point.value), 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const at = (point, index) => [index * step, bottom - (point.value / most) * (bottom - top)];
  const spots = points.map(at);

  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart-art', role: 'img' });
  const title = svgNode('title', {});
  title.textContent = `${label}: ${points.map((point) => `${point.label} ${format(point.value)}`).join(', ')}`;
  svg.append(title);

  [top, (top + bottom) / 2, bottom].forEach((y) => svg.append(svgNode('line', {
    x1: 0, x2: width, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1
  })));

  const line = spots.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  svg.append(svgNode('path', {
    d: `${line} L${width} ${bottom} L0 ${bottom} Z`, fill: 'var(--chart-fill)', stroke: 'none'
  }));
  svg.append(svgNode('path', {
    d: line, fill: 'none', stroke: 'var(--chart-line)', 'stroke-width': 2.5,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round'
  }));

  const highest = points.reduce((best, point, index) => (point.value > points[best].value ? index : best), 0);
  spots.forEach(([x, y], index) => svg.append(svgNode('circle', {
    cx: x, cy: y, r: index === highest ? 5 : 3.5,
    fill: index === highest ? 'var(--chart-line)' : 'var(--card)',
    stroke: 'var(--chart-line)', 'stroke-width': 2
  })));

  const guide = svgNode('line', {
    x1: 0, x2: 0, y1: top, y2: bottom, stroke: 'var(--chart-line)',
    'stroke-width': 1, 'stroke-dasharray': '4 5', opacity: 0
  });
  const pointer = svgNode('circle', {
    r: 6, cx: 0, cy: 0, fill: 'var(--chart-line)', stroke: 'var(--card)', 'stroke-width': 2, opacity: 0
  });
  svg.append(guide, pointer);

  const chart = create('div', 'chart');
  const scale = create('div', 'chart-scale');
  scale.append(create('span', '', format(most)), create('span', '', format(Math.round(most / 2))), create('span', '', '0'));

  const plot = create('div', 'chart-plot');
  const tip = create('div', 'chart-tip');
  tip.hidden = true;
  plot.append(scale, svg, tip);

  // Reading the chart with the pointer: the nearest day lights up and says its figure
  const readAt = (event) => {
    const box = svg.getBoundingClientRect();
    if (!box.width) return;
    const across = (event.clientX - box.left) / box.width;
    const index = Math.min(points.length - 1, Math.max(0, Math.round(across * (points.length - 1))));
    const [x, y] = spots[index];

    guide.setAttribute('x1', x);
    guide.setAttribute('x2', x);
    guide.setAttribute('opacity', 1);
    pointer.setAttribute('cx', x);
    pointer.setAttribute('cy', y);
    pointer.setAttribute('opacity', 1);

    tip.replaceChildren(create('b', '', format(points[index].value)), create('small', '', `${points[index].label} · ${key.toLowerCase()}`));
    tip.hidden = false;

    const inside = plot.getBoundingClientRect();
    const size = tip.getBoundingClientRect();
    const half = size.width / 2;
    const wanted = box.left - inside.left + (x / width) * box.width;
    tip.style.left = `${Math.min(Math.max(wanted, half + 4), inside.width - half - 4)}px`;

    const above = (y / height) * box.height;
    const room = above - size.height - 12 > 0;
    tip.classList.toggle('is-below', !room);
    tip.style.top = `${above}px`;
  };

  const rest = () => {
    guide.setAttribute('opacity', 0);
    pointer.setAttribute('opacity', 0);
    tip.hidden = true;
  };

  plot.addEventListener('pointermove', readAt);
  plot.addEventListener('pointerleave', rest);

  // A long run cannot label every day. Each date sits under its own day, and the dates
  // shown are picked from the width the chart actually has: the two ends first, then the
  // peak (the key names it as well), then evenly spaced days, skipping any that would touch
  // one already placed.
  // It picks again when the panel changes width, so a projector and a phone both read.
  const marks = create('div', 'chart-marks');
  const track = create('div', 'chart-marks-track');
  marks.append(track);
  const placeMarks = () => {
    // The dates start where the drawing starts, after the scale, whatever width the scale takes.
    const offset = svg.getBoundingClientRect().left - marks.getBoundingClientRect().left;
    if (Math.abs(offset - (parseFloat(marks.style.paddingLeft) || 0)) > 0.5) marks.style.paddingLeft = `${Math.max(0, offset)}px`;
    const span = track.clientWidth;
    if (!span) return;
    const last = points.length - 1;
    const x = (index) => (last ? (index / last) * span : 0);
    // The longest date at 12px bold, and the gap kept between two dates.
    const wide = Math.max(...points.map((point) => String(point.label).length)) * 7.5;
    const gap = 14;
    // Where a date's text sits: centred under its day, or held to the edge at either end.
    const extent = (index) => (index === 0 ? [0, wide] : index === last ? [span - wide, span] : [x(index) - wide / 2, x(index) + wide / 2]);
    const shown = [];
    const fits = (index) => shown.every((other) => {
      const [a1, a2] = extent(index);
      const [b1, b2] = extent(other);
      return a2 + gap <= b1 || b2 + gap <= a1;
    });
    const stride = Math.max(1, Math.ceil((wide + gap) / Math.max(1, span / Math.max(1, last))));
    const wanted = [0, last, highest];
    for (let index = 0; index <= last; index += stride) wanted.push(index);
    wanted.forEach((index) => { if (!shown.includes(index) && fits(index)) shown.push(index); });
    track.replaceChildren(...shown.sort((a, b) => a - b).map((index) => {
      const mark = create('span', index === highest ? 'is-peak' : '', points[index].label);
      mark.style.left = `${(x(index) / span) * 100}%`;
      if (index === 0) mark.classList.add('is-start');
      else if (index === last) mark.classList.add('is-end');
      return mark;
    }));
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(placeMarks).observe(track);
  else requestAnimationFrame(placeMarks);

  const legend = create('div', 'chart-key');
  const series = create('span', 'chart-key-item');
  series.append(create('i', 'key-line'), document.createTextNode(key));
  const peak = create('span', 'chart-key-item');
  peak.append(create('i', 'key-dot'), document.createTextNode(`Highest day · ${points[highest].label}`));
  legend.append(series, peak);

  chart.append(legend, plot, marks);
  return chart;
}

// A ranked list, longest bar first, with the figure beside each row
function barList(rows, { format = formatNumber, split = false } = {}) {
  const most = Math.max(...rows.map((row) => row.value), 1);
  const list = create('ul', split ? 'bar-list is-split' : 'bar-list');
  rows.forEach((row) => {
    const item = create('li');
    const head = create('div', 'bar-head');
    head.append(create('span', '', row.label), create('b', '', format(row.value)));
    const track = create('div', 'track track-small');
    const fill = create('span', 'track-fill');
    fill.style.width = `${(row.value / most) * 100}%`;
    if (row.colour) fill.style.background = row.colour;
    track.append(fill);
    item.append(head, track);
    if (row.note) item.append(create('small', '', row.note));
    list.append(item);
  });
  return list;
}

// A share of a whole, drawn once and named in the legend beside it
function donutChart(slices, { format = formatNumber } = {}) {
  const size = 150;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;

  const svg = svgNode('svg', { viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' });
  svg.append(svgNode('circle', {
    cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: 'var(--field)', 'stroke-width': stroke
  }));

  let travelled = 0;
  slices.forEach((slice, index) => {
    const part = slice.value / total;
    if (!part) return;
    svg.append(svgNode('circle', {
      cx: size / 2, cy: size / 2, r: radius, fill: 'none',
      stroke: slice.colour || `var(--slice-${(index % 5) + 1})`, 'stroke-width': stroke,
      'stroke-dasharray': `${circumference * part} ${circumference}`,
      'stroke-dashoffset': -circumference * travelled,
      transform: `rotate(-90 ${size / 2} ${size / 2})`
    }));
    travelled += part;
  });

  const art = create('div', 'donut-art');
  art.append(svg);

  const legend = create('ul', 'donut-legend');
  slices.forEach((slice, index) => {
    const item = create('li');
    const dot = create('span', 'donut-dot');
    dot.style.background = slice.colour || `var(--slice-${(index % 5) + 1})`;
    const text = create('div');
    text.append(create('b', '', slice.label), create('small', '', `${format(slice.value)} · ${formatPercent(slice.value / total)}`));
    item.append(dot, text);
    legend.append(item);
  });

  const chart = create('div', 'donut');
  chart.append(art, legend);
  return chart;
}

// Two figures side by side for each row, so before and now can be read against each other
function pairedBars(rows, { format = formatNumber, first = 'Before', second = 'Now' } = {}) {
  const most = Math.max(...rows.flatMap((row) => [row.first, row.second]), 1);

  const key = create('div', 'chart-key');
  [[first, 'is-first'], [second, 'is-second']].forEach(([label, tone]) => {
    const item = create('span', `chart-key-item ${tone}`);
    item.append(create('i', ''), document.createTextNode(label));
    key.append(item);
  });
  if (rows.some((row) => row.colour)) key.append(create('small', 'chart-key-note', 'Each group keeps its own colour.'));

  const list = create('ul', 'pair-list');
  rows.forEach((row) => {
    const item = create('li');
    const head = create('div', 'bar-head');
    head.append(create('span', '', row.label));
    if (row.chip) head.append(row.chip);

    const pair = create('div', 'pair');
    [['first', row.first], ['second', row.second]].forEach(([which, value]) => {
      const line = create('div', 'pair-row');
      const track = create('div', `track track-small is-${which}`);
      const fill = create('span', 'track-fill');
      fill.style.width = `${(value / most) * 100}%`;
      if (row.colour && which === 'second') fill.style.background = row.colour;
      track.append(fill);
      line.append(track, create('b', '', format(value)));
      pair.append(line);
    });

    item.append(head, pair);
    if (row.note) item.append(create('small', '', row.note));
    list.append(item);
  });

  const chart = create('div', 'chart');
  chart.append(key, list);
  return chart;
}

// Bars standing on a baseline, read left to right. Groups take a colour and a key.
function columnChart(rows, { format = formatNumber, groups = [] } = {}) {
  const most = Math.max(...rows.map((row) => row.value), 1);
  const chart = create('div', 'columns');

  if (groups.length > 1) {
    const key = create('div', 'chart-key');
    groups.forEach((group, index) => {
      const item = create('span', 'chart-key-item');
      const swatch = create('i', '');
      swatch.style.background = `var(--slice-${(index % 5) + 1})`;
      item.append(swatch, document.createTextNode(group));
      key.append(item);
    });
    chart.append(key);
  }

  const plot = create('div', 'column-plot');
  const scale = create('div', 'column-scale');
  scale.append(create('span', '', format(most)), create('span', '', format(Math.round(most / 2))), create('span', '', '0'));

  const list = create('ul', 'column-list');
  rows.forEach((row) => {
    const item = create('li');
    const index = Math.max(0, groups.indexOf(row.group));

    const track = create('div', 'column-track');
    const fill = create('span', 'column-fill');
    fill.style.height = `${(row.value / most) * 100}%`;
    fill.style.background = `var(--slice-${(index % 5) + 1})`;
    track.append(fill);

    const legend = create('div', 'column-label');
    legend.append(create('b', '', row.label));
    if (row.note) legend.append(create('small', '', row.note));

    item.append(create('span', 'column-value', format(row.value)), track, legend);
    item.title = `${row.group ? row.group + ' · ' : ''}${row.label}: ${format(row.value)}${row.note ? ' · ' + row.note : ''}`;
    list.append(item);
  });

  plot.append(scale, list);
  chart.append(plot);
  return chart;
}

