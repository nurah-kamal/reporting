// Makes the three sample report pairs from fixed seeds. Each sample is an
// invented source extract and the report made from it, with mistakes planted
// on purpose. Every figure a plant changes is written to sample.json, so the
// tests can check the checker finds each one, for the right reason, and
// passes everything else.
//
// No person is in any of the data: rows are enrolments, orders and tickets,
// identified only by a made-up reference.

import { mkdirSync, writeFileSync } from 'node:fs';
import { toCsv } from '../src/csv.js';
import { addDays, formatMonth, monthEnd } from '../src/dates.js';
import { formatNumber, roundTo } from '../src/numbers.js';
import { writeXlsx } from './xlsx-write.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted(rand, options) {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let x = rand() * total;
  for (const [v, w] of options) { x -= w; if (x < 0) return v; }
  return options.at(-1)[0];
}

const days = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

const count = (rows) => rows.length;
const sum = (col) => (rows) => rows.reduce((s, r) => s + Number(r[col]), 0);
const mean = (col) => (rows) => sum(col)(rows) / rows.length;
const share = (col, value) => (rows) => (100 * rows.filter((r) => r[col] === value).length) / rows.length;
const truncate = (x, d) => Math.trunc(x * 10 ** d + 1e-9) / 10 ** d;

// Works out a report two ways: from the rows each group should use, and from
// the rows the planted mistakes make it use. Returns the report's figures and
// the list of figures that differ, with the plant that caused each.
function buildReport({ groups, measures, rowsOf, planted = {}, rounding = [], totalReason, totalTypo }) {
  const lines = [];
  const truthLines = [];
  const used = [];
  const union = [];
  for (const g of groups) {
    const truth = rowsOf(g);
    const plant = planted[g.label];
    const rows = plant ? plant.rows(truth, g) : truth;
    used.push({ g, rows, plant });
    union.push(...rows);
    lines.push({ g, values: measures.map((m) => roundTo(m.fn(rows), m.decimals)) });
    truthLines.push(measures.map((m) => roundTo(m.fn(truth), m.decimals)));
  }
  for (const { group, measure } of rounding) {
    const line = lines.find((l) => l.g.label === group);
    const m = measures.findIndex((x) => x.name === measure);
    line.values[m] = truncate(measures[m].fn(used.find((u) => u.g.label === group).rows), measures[m].decimals);
  }
  const allTruth = groups.flatMap((g) => rowsOf(g));
  const total = measures.map((m) => roundTo(m.fn(union), m.decimals));
  const totalTruth = measures.map((m) => roundTo(m.fn(allTruth), m.decimals));
  if (totalTypo) total[totalTypo.measure] = totalTypo.make(total[totalTypo.measure]);

  const plantedList = [];
  lines.forEach((l, i) => l.values.forEach((v, m) => {
    if (v === truthLines[i][m]) return;
    const r = rounding.find((x) => x.group === l.g.label && x.measure === measures[m].name);
    plantedList.push({ row: l.g.keys, measure: measures[m].name, reason: r ? 'rounding' : planted[l.g.label].reason });
  }));
  total.forEach((v, m) => {
    if (v === totalTruth[m]) return;
    plantedList.push({ row: ['Total'], measure: measures[m].name, reason: totalTypo?.measure === m ? 'total' : totalReason });
  });
  return { lines, total, planted: plantedList };
}

const display = (m, v) => (m.percent ? `${formatNumber(v, m.decimals)}%` : formatNumber(v, m.decimals));

function writeSample(id, meta, files) {
  return { id, meta, files: { ...files, 'sample.json': JSON.stringify(meta, null, 2) + '\n' } };
}

export function save({ id, files }) {
  const dir = new URL(`../samples/${id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(new URL(name, dir), body);
}

// 1. Monthly enrolments at a made-up college: CSV report, CSV source.
export function enrolments() {
  const rand = rng(20260101);
  const programmes = [['Bookkeeping', 2450], ['Data Analytics', 4200], ['Office Administration', 1950], ['Project Coordination', 3800]];
  const rows = [];
  for (const d of days('2026-01-05', '2026-06-30')) {
    const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (weekday === 0) continue;
    const n = Math.floor(rand() * (weekday === 6 ? 5 : 13));
    for (let k = 0; k < n; k++) {
      const [programme, fee] = programmes[Math.floor(rand() * programmes.length)];
      rows.push({
        enrolled_on: d,
        campus: weighted(rand, [['Bellville', 30], ['Claremont', 30], ['Durbanville', 15], ['Online', 25]]),
        programme,
        status: weighted(rand, [['Active', 69], ['Completed', 22], ['Cancelled', 9]]),
        fee: String(rand() < 0.25 ? Math.round(fee * 0.9) : fee),
      });
    }
  }
  rows.forEach((r, i) => { r.enrolment_id = `ENR-26-${String(i + 1).padStart(4, '0')}`; });
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  const marchRows = rows.filter((r) => r.enrolled_on.startsWith('2026-03') && r.status !== 'Cancelled');
  const repeated = [];
  for (let k = 0; k < 14; k++) repeated.push({ ...marchRows[Math.floor(rand() * marchRows.length)] });
  const unique = [...new Map(repeated.map((r) => [r.enrolment_id, r])).values()];
  const source = [...rows, ...unique];

  const counted = (r) => r.status !== 'Cancelled';
  const measures = [
    { name: 'Enrolments', fn: count, decimals: 0 },
    { name: 'Fees invoiced (R)', fn: sum('fee'), decimals: 0 },
    { name: 'Completed', fn: share('status', 'Completed'), decimals: 1, percent: true },
  ];
  const groups = months.map((m) => ({ label: formatMonth(m), keys: [formatMonth(m)], month: m }));
  const rowsOf = (g) => rows.filter((r) => r.enrolled_on.startsWith(g.month) && counted(r));
  const rounding = groups.filter((g) => !['Mar 2026', 'May 2026'].includes(g.label)).find((g) => {
    const v = share('status', 'Completed')(rowsOf(g));
    return truncate(v, 1) !== roundTo(v, 1);
  });
  const report = buildReport({
    groups, measures, rowsOf,
    planted: {
      'Mar 2026': { reason: 'duplicates', rows: (truth) => [...truth, ...unique] },
      'May 2026': { reason: 'filter', rows: (_, g) => rows.filter((r) => r.enrolled_on.startsWith(g.month)) },
    },
    rounding: [{ group: rounding.label, measure: 'Completed' }],
    totalReason: 'inherited',
    totalTypo: { measure: 0, make: (v) => { const s = String(v); const t = s.slice(0, -3) + s.at(-2) + s.at(-3) + s.at(-1); return t === s ? v + 100 : Number(t); } },
  });

  const header = ['Month', ...measures.map((m) => m.name)];
  const reportRows = [header, ...report.lines.map((l) => [l.g.label, ...l.values.map((v, i) => display(measures[i], v))]), ['Total', ...report.total.map((v, i) => display(measures[i], v))]];
  const cols = ['enrolment_id', 'enrolled_on', 'campus', 'programme', 'status', 'fee'];
  const out = writeSample('enrolments', {
    id: 'enrolments',
    title: 'Monthly enrolments',
    blurb: 'A college\'s enrolment summary for January to June 2026, with fees invoiced and the share completed.',
    report: 'report.csv',
    source: 'source.csv',
    recipe: {
      keys: [{ report: 'Month', source: 'enrolled_on', as: 'month' }],
      id: 'enrolment_id',
      date: null,
      filters: [{ column: 'status', not: 'Cancelled' }],
      measures: [
        { report: 'Enrolments', agg: 'count' },
        { report: 'Fees invoiced (R)', agg: 'sum', column: 'fee' },
        { report: 'Completed', agg: 'share', column: 'status', value: 'Completed' },
      ],
    },
    planted: report.planted,
  }, {
    'report.csv': toCsv(reportRows),
    'source.csv': toCsv([cols, ...source.map((r) => cols.map((c) => r[c]))]),
  });
  return { ...out, report };
}

// 2. Sales by month and region: Excel report, CSV source.
export function sales() {
  const rand = rng(20260701);
  const stores = [
    ['CPT-01', 'Western Cape', 14], ['CPT-02', 'Western Cape', 10], ['CPT-03', 'Western Cape', 6],
    ['JHB-01', 'Gauteng', 14], ['JHB-02', 'Gauteng', 9], ['PTA-01', 'Gauteng', 8],
    ['DBN-01', 'KwaZulu-Natal', 10], ['DBN-02', 'KwaZulu-Natal', 6],
    ['GQB-01', 'Eastern Cape', 8],
  ];
  const rows = [];
  for (const d of days('2026-07-01', '2026-09-30')) {
    const open = d >= '2026-08-17';
    const options = [...stores.map(([c, , w]) => [c, w]), ...(open ? [['PLK-01', 5]] : [])];
    const n = 18 + Math.floor(rand() * 14);
    for (let k = 0; k < n; k++) {
      const store = weighted(rand, options);
      const region = stores.find((s) => s[0] === store)?.[1] ?? '';
      const amount = Math.exp(Math.log(520) + (rand() + rand() + rand() - 1.5) * 0.9);
      rows.push({
        ordered_on: d, store_code: store, region,
        channel: weighted(rand, [['Store', 55], ['Online', 45]]),
        status: weighted(rand, [['Paid', 94], ['Refunded', 6]]),
        amount: amount.toFixed(2),
      });
    }
  }
  rows.forEach((r, i) => { r.order_id = `SO-${260001 + i}`; });
  const regions = ['Western Cape', 'Gauteng', 'KwaZulu-Natal', 'Eastern Cape'];
  const months = ['2026-07', '2026-08', '2026-09'];
  const groups = months.flatMap((m) => regions.map((region) => ({ label: `${formatMonth(m)} · ${region}`, keys: [formatMonth(m), region], month: m, region })));
  const rowsOf = (g) => rows.filter((r) => r.ordered_on.startsWith(g.month) && r.region === g.region && r.status !== 'Refunded');
  const measures = [
    { name: 'Orders', fn: count, decimals: 0, fmt: '#,##0' },
    { name: 'Revenue (R)', fn: sum('amount'), decimals: 0, fmt: '#,##0' },
    { name: 'Average order (R)', fn: mean('amount'), decimals: 2, fmt: '#,##0.00' },
  ];
  const cutoff = '2026-09-26';
  const rounding = groups.filter((g) => g.month !== '2026-09').find((g) => {
    const v = mean('amount')(rowsOf(g));
    return truncate(v, 2) !== roundTo(v, 2);
  });
  const planted = {};
  for (const g of groups.filter((x) => x.month === '2026-09')) {
    planted[g.label] = { reason: 'stale', rows: (truth) => truth.filter((r) => r.ordered_on <= cutoff) };
  }
  const report = buildReport({
    groups, measures, rowsOf, planted,
    rounding: [{ group: rounding.label, measure: 'Average order (R)' }],
    totalReason: 'join',
  });
  // The report's total is worked out from all orders the report could see,
  // which is every row its region join kept.
  const header = ['Month', 'Region', ...measures.map((m) => m.name)];
  const cell = (m, v) => ({ v, fmt: m.fmt });
  const sheet = [
    ['Sales by month and region, July to September 2026'],
    [],
    header,
    ...report.lines.map((l) => [...l.g.keys, ...l.values.map((v, i) => cell(measures[i], v))]),
    ['Total', '', ...report.total.map((v, i) => cell(measures[i], v))],
  ];
  const cols = ['order_id', 'ordered_on', 'store_code', 'region', 'channel', 'status', 'amount'];
  const out = writeSample('sales', {
    id: 'sales',
    title: 'Sales by region',
    blurb: 'A quarterly sales report by month and region, sent as an Excel workbook, checked against the order extract.',
    report: 'report.xlsx',
    source: 'source.csv',
    recipe: {
      keys: [{ report: 'Month', source: 'ordered_on', as: 'month' }, { report: 'Region', source: 'region', as: 'value' }],
      id: 'order_id',
      date: null,
      filters: [{ column: 'status', not: 'Refunded' }],
      measures: [
        { report: 'Orders', agg: 'count' },
        { report: 'Revenue (R)', agg: 'sum', column: 'amount' },
        { report: 'Average order (R)', agg: 'mean', column: 'amount' },
      ],
    },
    planted: report.planted,
  }, {
    'report.xlsx': writeXlsx(sheet, 'Q3 sales'),
    'source.csv': toCsv([cols, ...rows.map((r) => cols.map((c) => r[c]))]),
  });
  return { ...out, report };
}

// 3. Support tickets by month and channel: CSV report, CSV source.
export function tickets() {
  const rand = rng(20260801);
  const channels = ['Email', 'Phone', 'Chat', 'Walk-in'];
  const rows = [];
  for (const d of days('2026-07-01', '2026-09-30')) {
    const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
    const n = weekday === 0 || weekday === 6 ? 8 + Math.floor(rand() * 6) : 26 + Math.floor(rand() * 14);
    for (let k = 0; k < n; k++) {
      const channel = weighted(rand, [['Email', 34], ['Phone', 26], ['Chat', 28], ['Walk-in', 12]]);
      const hours = channel === 'Chat' ? 0.1 + rand() * 3 : channel === 'Walk-in' ? 0.1 + rand() * 1.5 : 0.5 + rand() * rand() * 30;
      rows.push({
        opened_on: d, channel,
        category: weighted(rand, [['Billing', 34], ['Access', 30], ['Hardware', 22], ['Other', 9], ['Spam', 5]]),
        first_reply_hours: hours.toFixed(1),
        resolved_in_2_days: rand() < (channel === 'Email' ? 0.71 : 0.84) ? 'Yes' : 'No',
      });
    }
  }
  rows.forEach((r, i) => { r.ticket_id = `TCK-${String(48001 + i)}`; });
  const months = ['2026-07', '2026-08', '2026-09'];
  const groups = months.flatMap((m) => channels.map((c) => ({ label: `${formatMonth(m)} · ${c}`, keys: [formatMonth(m), c], month: m, channel: c })));
  const rowsOf = (g) => rows.filter((r) => r.opened_on.startsWith(g.month) && r.channel === g.channel && r.category !== 'Spam');
  const sepEmail = rows.filter((r) => r.opened_on.startsWith('2026-09') && r.channel === 'Email' && r.category !== 'Spam');
  const resent = [];
  while (resent.length < 11) {
    const r = sepEmail[Math.floor(rand() * sepEmail.length)];
    if (!resent.includes(r)) resent.push(r);
  }
  const copies = resent.map((r) => ({ ...r }));
  const measures = [
    { name: 'Tickets', fn: count, decimals: 0 },
    { name: 'Resolved in 2 days', fn: share('resolved_in_2_days', 'Yes'), decimals: 1, percent: true },
    { name: 'First reply (hours)', fn: mean('first_reply_hours'), decimals: 1 },
  ];
  const planted = {
    'Aug 2026 · Chat': { reason: 'filter', rows: (_, g) => rows.filter((r) => r.opened_on.startsWith(g.month) && r.channel === g.channel) },
    'Sep 2026 · Email': { reason: 'duplicates', rows: (truth) => [...truth, ...copies] },
  };
  for (const c of channels) {
    planted[`Jul 2026 · ${c}`] = { reason: 'date-range', rows: (truth) => truth.filter((r) => r.opened_on < monthEnd('2026-07')) };
  }
  const report = buildReport({ groups, measures, rowsOf, planted, totalReason: 'inherited' });
  const header = ['Month', 'Channel', ...measures.map((m) => m.name)];
  const reportRows = [header, ...report.lines.map((l) => [...l.g.keys, ...l.values.map((v, i) => display(measures[i], v))]), ['Total', '', ...report.total.map((v, i) => display(measures[i], v))]];
  const cols = ['ticket_id', 'opened_on', 'channel', 'category', 'first_reply_hours', 'resolved_in_2_days'];
  // The repeated tickets sit where a second import would put them: at the end.
  const out = writeSample('tickets', {
    id: 'tickets',
    title: 'Support tickets',
    blurb: 'A service desk\'s monthly ticket report by channel, with the share resolved within two days and the average time to first reply.',
    report: 'report.csv',
    source: 'source.csv',
    recipe: {
      keys: [{ report: 'Month', source: 'opened_on', as: 'month' }, { report: 'Channel', source: 'channel', as: 'value' }],
      id: 'ticket_id',
      date: null,
      filters: [{ column: 'category', not: 'Spam' }],
      measures: [
        { report: 'Tickets', agg: 'count' },
        { report: 'Resolved in 2 days', agg: 'share', column: 'resolved_in_2_days', value: 'Yes' },
        { report: 'First reply (hours)', agg: 'mean', column: 'first_reply_hours' },
      ],
    },
    planted: report.planted,
  }, {
    'report.csv': toCsv(reportRows),
    'source.csv': toCsv([cols, ...[...rows, ...copies].map((r) => cols.map((c) => r[c]))]),
  });
  return { ...out, report };
}

export const SAMPLES = ['enrolments', 'sales', 'tickets'];

if (process.argv[1]?.endsWith('make-samples.js')) {
  for (const make of [enrolments, sales, tickets]) {
    const sample = make();
    save(sample);
    console.log(`${sample.id}: ${sample.report.lines.length} report rows, ${sample.meta.planted.length} figures changed by planted mistakes`);
  }
}
