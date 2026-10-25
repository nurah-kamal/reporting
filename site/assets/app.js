import { barChart, columnChart, legend, lineChart } from './charts.js';
import {
  daysBetween, holidaysBetween, isVerifiedYear, isWorkingDay, VERIFIED_FROM, VERIFIED_TO, FIRST_YEAR,
} from '../lib/index.js';
import { addDays, weekday } from '../lib/dates.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => n.toLocaleString('en-ZA');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (ym) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const ICON = {
  late: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg>',
  ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>',
  arrow: '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function table(rows, columns) {
  const head = columns.map((c) => `<th scope="col">${c.label}</th>`).join('');
  const body = rows.map((r) => `<tr>${columns.map((c, i) => {
    const v = c.value(r);
    return i === 0 ? `<th scope="row">${v}</th>` : `<td>${v}</td>`;
  }).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderTiles(r) {
  const h = r.headline.rows[0];
  const refunds = r.category_by_quarter.rows.filter((q) => q.category === 'Refund');
  const before = refunds.filter((q) => q.quarter < '2025-Q3');
  const after = refunds.filter((q) => q.quarter >= '2025-Q3');
  const rate = (qs) => qs.reduce((s, q) => s + q.late_working_pct * q.closed_requests, 0) / qs.reduce((s, q) => s + q.closed_requests, 0);

  $('[data-lede]').textContent = `Three years of service-desk requests, measured two ways. Counting calendar days marked ${fmt(h.late_by_calendar)} requests late. ${fmt(h.wrongly_late)} of those were on time once public holidays are counted, and ${fmt(h.missed_late)} real delays slipped through unnoticed. In working days, one real problem is left: refunds since July 2025.`;

  $('[data-tiles]').innerHTML = `
    <div class="tile">
      <p class="tile-value">${fmt(h.wrongly_late)}<small>of ${fmt(h.late_by_calendar)}</small></p>
      <p class="tile-label">Marked late, actually on time</p>
      <p class="tile-note">${h.wrongly_late_pct}% of the calendar measure's late list was public holidays, not slow work.</p>
    </div>
    <div class="tile">
      <p class="tile-value">${fmt(h.missed_late)}</p>
      <p class="tile-label">Real delays it missed</p>
      <p class="tile-note">Late in working days, but under the stretched calendar target.</p>
    </div>
    <div class="tile">
      <p class="tile-value">${Math.round(rate(before))}%${ICON.arrow}${Math.round(rate(after))}%</p>
      <p class="tile-label">Refunds late, before and after July 2025</p>
      <p class="tile-note">The only category that really got slower. Counted in working days.</p>
    </div>`;
}

function renderMonths(r, host) {
  const rows = r.late_by_month.rows;
  const gap = (x) => x.late_calendar_pct - x.late_working_pct;
  const top = rows.map((x, i) => ({ i, g: gap(x) })).sort((a, b) => b.g - a.g).slice(0, 3);
  columnChart(host, {
    points: rows.map((x) => ({
      key: x.month,
      value: gap(x),
      tip: `<b>${monthName(x.month)}</b><div class="row"><span>Late, calendar days</span><span>${x.late_calendar_pct}%</span></div><div class="row"><span>Late, working days</span><span>${x.late_working_pct}%</span></div><div class="row"><span>Marked late, on time</span><span>${x.wrongly_late}</span></div>`,
    })),
    xTick: (m) => (m.endsWith('-01') ? m.slice(0, 4) : null),
    colors: [css('--s1'), css('--s2')],
    annotate: top.map(({ i }) => ({ index: i, label: MONTHS[+rows[i].month.slice(5, 7) - 1] })),
  });
  $('[data-table="months"]').innerHTML = table(rows, [
    { label: 'Month opened', value: (x) => monthName(x.month) },
    { label: 'Closed', value: (x) => fmt(x.closed_requests) },
    { label: 'Late, calendar', value: (x) => `${x.late_calendar_pct}%` },
    { label: 'Late, working', value: (x) => `${x.late_working_pct}%` },
    { label: 'Wrongly late', value: (x) => x.wrongly_late },
  ]);
}

function renderExposure(r, host) {
  const rows = r.holiday_exposure.rows;
  const labels = { 'No holiday in the window': ['None', 'in the window'], 'One holiday': ['One', 'holiday'], 'Two or more': ['Two or more', 'holidays'] };
  barChart(host, {
    groups: rows.map((x) => ({ label: labels[x.window][0], note: labels[x.window][1], n: x.closed_requests, values: [x.late_calendar_pct, x.late_working_pct] })),
    series: [{ name: 'Calendar days', color: css('--s2') }, { name: 'Working days', color: css('--s1') }],
  });
  $('[data-table="exposure"]').innerHTML = table(rows, [
    { label: 'Holidays in window', value: (x) => x.window },
    { label: 'Closed', value: (x) => fmt(x.closed_requests) },
    { label: 'Late, calendar', value: (x) => `${x.late_calendar_pct}%` },
    { label: 'Late, working', value: (x) => `${x.late_working_pct}%` },
  ]);
}

function renderRefunds(r, host) {
  const rows = r.category_by_quarter.rows;
  const quarters = [...new Set(rows.map((x) => x.quarter))];
  const cats = [...new Set(rows.map((x) => x.category))];
  const val = (q, c) => rows.find((x) => x.quarter === q && x.category === c).late_working_pct;
  const others = cats.filter((c) => c !== 'Refund');
  const series = [
    ...others.map((c, i) => ({ name: c, color: css('--s2'), width: 1.5, opacity: 0.85, label: i === 0 ? 'Others' : false, values: quarters.map((q) => val(q, c)) })),
    { name: 'Refunds', color: css('--s1'), width: 2.5, values: quarters.map((q) => val(q, 'Refund')) },
  ];
  const jump = quarters.indexOf('2025-Q3');
  lineChart(host, {
    xLabels: quarters,
    xTick: (q) => (q.endsWith('Q1') ? q.slice(0, 4) : null),
    tipTitle: (q) => `${q.slice(5)} ${q.slice(0, 4)}`,
    series,
    annotate: { index: jump, lines: ['Second sign-off', 'from July 2025'] },
  });
  $('[data-table="refunds"]').innerHTML = table(quarters.map((q) => ({ q })), [
    { label: 'Quarter', value: (x) => `${x.q.slice(5)} ${x.q.slice(0, 4)}` },
    ...cats.map((c) => ({ label: c, value: (x) => `${val(x.q, c)}%` })),
  ]);
}

function renderCategories(r) {
  const mark = (late, base) => (late > base + 1
    ? `<span class="pill bad">${ICON.late}${late}%</span>`
    : `<span class="pill good">${ICON.ok}${late}%</span>`);
  const overall = r.headline.rows[0];
  const base = (100 * overall.late_by_working_days) / overall.closed_requests;
  $('[data-table="categories"]').innerHTML = table(r.by_category.rows, [
    { label: 'Category', value: (x) => x.category },
    { label: 'Target', value: (x) => `${x.target} days` },
    { label: 'Closed', value: (x) => fmt(x.closed_requests) },
    { label: 'Median', value: (x) => `${x.median_working} days` },
    { label: '90th percentile', value: (x) => `${x.p90_working} days` },
    { label: 'Late, working days', value: (x) => mark(x.late_working_pct, base) },
    { label: 'Late, calendar days', value: (x) => `<span class="dim">${x.late_calendar_pct}%</span>` },
  ]);
}

function legends() {
  legend($('[data-chart="months"]'), [{ name: 'Calendar count stricter: on-time work marked late', color: css('--s1') }, { name: 'Calendar count looser: real delays missed', color: css('--s2') }], 'bar');
  legend($('[data-chart="exposure"]'), [{ name: 'Calendar days', color: css('--s2') }, { name: 'Working days', color: css('--s1') }], 'bar');
  legend($('[data-chart="refunds"]'), [{ name: 'Refunds', color: css('--s1') }, { name: 'The other four categories', color: css('--s2') }]);
}

function renderCharts(r) {
  renderMonths(r, $('[data-chart="months"]'));
  renderExposure(r, $('[data-chart="exposure"]'));
  renderRefunds(r, $('[data-chart="refunds"]'));
}

// The calculator runs the same library the tests check.
const MAX_STRIP = 63;

function calculate() {
  const form = $('[data-calc]');
  const out = $('[data-calc-out]');
  const strip = $('[data-strip]');
  const hols = $('[data-hols]');
  const note = $('[data-calc-note]');
  const { start, end } = form.elements;
  start.removeAttribute('aria-invalid');
  end.removeAttribute('aria-invalid');
  const fail = (msg, field) => {
    out.innerHTML = `<p class="err">${msg}</p>`;
    strip.replaceChildren(); hols.replaceChildren(); note.textContent = '';
    field?.setAttribute('aria-invalid', 'true');
  };
  const a = start.value;
  const b = end.value;
  if (!a) return fail('Pick the date it was opened.', start);
  if (!b) return fail('Pick the date it was closed.', end);
  if (+a.slice(0, 4) < FIRST_YEAR || +b.slice(0, 4) < FIRST_YEAR) return fail(`The Public Holidays Act starts in ${FIRST_YEAR}. Pick a later date.`, +a.slice(0, 4) < FIRST_YEAR ? start : end);
  if (b < a) return fail('Closed is before opened. Swap the dates.', end);
  const span = daysBetween(a, b);
  if (span > 3660) return fail('Keep the range under ten years.', end);

  const days = [];
  for (let d = addDays(a, 1); d <= b; d = addDays(d, 1)) days.push(d);
  const working = days.filter(isWorkingDay).length;
  const listed = holidaysBetween(a, b);
  out.innerHTML = `
    <div class="count"><b>${fmt(span)}</b><span>calendar ${span === 1 ? 'day' : 'days'}</span></div>
    <div class="count work"><b>${fmt(working)}</b><span>working ${working === 1 ? 'day' : 'days'}</span></div>`;

  const cells = days.slice(0, MAX_STRIP).map((d, i) => {
    const li = document.createElement('li');
    const h = listed.find((x) => x.date === d);
    const wd = weekday(d);
    li.className = h ? 'hol' : wd === 0 || wd === 6 ? 'off' : 'work';
    li.style.setProperty('--i', i);
    li.textContent = +d.slice(8);
    li.title = `${longDate(d)}${h ? `: ${h.name}` : ''}`;
    return li;
  });
  if (days.length > MAX_STRIP) {
    const more = document.createElement('li');
    more.className = 'strip-more';
    more.textContent = `and ${fmt(days.length - MAX_STRIP)} more days`;
    cells.push(more);
  }
  strip.replaceChildren(...cells);

  const kinds = { 'sunday-rule': 'Sunday rule', declared: 'declared' };
  hols.innerHTML = listed.slice(0, 12).map((h) => `<li><span>${h.name}${kinds[h.kind] ? `<span class="tag">${kinds[h.kind]}</span>` : ''}</span><span>${longDate(h.date)}</span></li>`).join('')
    + (listed.length > 12 ? `<li><span class="dim">and ${listed.length - 12} more</span><span></span></li>` : '');
  const years = [+a.slice(0, 4), +b.slice(0, 4)];
  note.textContent = years.some((y) => !isVerifiedYear(y))
    ? `Declared once-off holidays are checked for ${VERIFIED_FROM}–${VERIFIED_TO}. Outside those years, the count could miss one.`
    : listed.length ? '' : 'No public holidays in this range.';
}

async function main() {
  const form = $('[data-calc]');
  form.addEventListener('input', calculate);
  form.addEventListener('submit', (e) => e.preventDefault());
  calculate();

  let report;
  try {
    const res = await fetch('data/report.json');
    if (!res.ok) throw new Error(res.status);
    report = await res.json();
  } catch {
    $('[data-tiles]').innerHTML = '<div class="tile"><p class="tile-label">The report data did not load.</p><p class="tile-note">Run <code>npm run build</code> and serve the dist folder.</p></div>';
    return;
  }
  const r = report.results;
  renderTiles(r);
  renderCategories(r);
  legends();
  renderCharts(r);
  document.querySelector('[data-closed]').textContent = fmt(r.headline.rows[0].closed_requests);
  document.querySelector('[data-verified]').textContent = `${report.holidays.verifiedFrom}–${report.holidays.verifiedTo}`;

  let width = window.innerWidth;
  let timer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => renderCharts(r), 120);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    document.querySelectorAll('.legend').forEach((l) => l.remove());
    legends();
    renderCharts(r);
  });
}

main();
