// Recalculates every figure in a report from its source and, for each one
// that disagrees, looks for the change to the source rows that would make it
// agree. A cause is only named when it reproduces the report's figure
// exactly, at the precision the report shows.

import { addDays, formatDate, formatMonth, monthEnd, monthOf, monthStart, parseDate, parseMonth } from './dates.js';
import { agrees, formatLike, formatNumber, parseFigure, unit } from './numbers.js';
import { columnIndex, norm } from './table.js';

export const REASONS = {
  duplicates: 'Duplicate rows',
  filter: 'Different filter',
  'date-range': 'Different date range',
  stale: 'Stale extract',
  rounding: 'Rounding',
  join: 'Rows lost in a join',
  total: "Total doesn't add up",
  inherited: 'Carried from the rows above',
  unknown: 'No single cause found',
};

export const AGGREGATES = {
  count: 'Count of rows',
  sum: 'Sum of',
  mean: 'Average of',
  share: 'Share of rows where',
  distinct: 'Number of different',
};

const TOTAL = /^(grand\s+)?totals?$|^all$|^overall$/i;
const ADDITIVE = new Set(['count', 'sum']);
const STALE_WINDOW = 62;

function num(cell) {
  const f = parseFigure(cell);
  return f ? f.value : null;
}

function measureFn(m, source) {
  const i = m.column ? columnIndex(source, m.column) : -1;
  switch (m.agg) {
    case 'count':
      return (rows) => rows.length;
    case 'sum':
      return (rows) => rows.reduce((s, r) => s + (num(r.cells[i]) ?? 0), 0);
    case 'mean':
      return (rows) => {
        let s = 0;
        let n = 0;
        for (const r of rows) { const v = num(r.cells[i]); if (v != null) { s += v; n++; } }
        return n ? s / n : NaN;
      };
    case 'share': {
      const want = norm(m.value);
      return (rows) => (rows.length ? (100 * rows.filter((r) => norm(r.cells[i]) === want).length) / rows.length : NaN);
    }
    case 'distinct':
      return (rows) => new Set(rows.map((r) => norm(r.cells[i])).filter(Boolean)).size;
    default:
      throw new Error(`Unknown calculation "${m.agg}".`);
  }
}

export function describeMeasure(m) {
  if (m.agg === 'count') return 'Count of rows';
  if (m.agg === 'share') return `Share of rows where ${m.column} is ${m.value}`;
  return `${AGGREGATES[m.agg]} ${m.column}`;
}

function looksLikeDates(source, i) {
  const sample = source.rows.map((r) => r[i]).filter(Boolean).slice(0, 50);
  return sample.length > 0 && sample.filter((v) => parseDate(v)).length >= sample.length * 0.8;
}

function prepare(source, recipe) {
  const keys = recipe.keys.map((k) => ({ ...k, i: columnIndex(source, k.source) }));
  const idCol = recipe.id ? columnIndex(source, recipe.id) : -1;
  const monthKey = keys.findIndex((k) => k.as === 'month');
  const dateCol = recipe.date ? columnIndex(source, recipe.date) : monthKey >= 0 ? keys[monthKey].i : -1;
  const filters = (recipe.filters || []).map((f) => ({ ...f, i: columnIndex(source, f.column), want: norm(f.not) }));
  const seen = new Set();
  const rows = source.rows.map((cells, n) => {
    let dup = false;
    if (idCol >= 0) {
      const id = norm(cells[idCol]);
      if (id) { if (seen.has(id)) dup = true; else seen.add(id); }
    }
    const fails = [];
    filters.forEach((f, j) => { if (norm(cells[f.i]) === f.want) fails.push(j); });
    const keyDates = keys.map((k) => (k.as === 'month' ? parseDate(cells[k.i]) : null));
    const keyValues = keys.map((k, j) => (k.as === 'month' ? (keyDates[j] ? monthOf(keyDates[j]) : '') : norm(cells[k.i])));
    return { n, cells, dup, fails, keyDates, keys: keyValues, date: dateCol >= 0 ? parseDate(cells[dateCol]) : null };
  });

  const base = rows.filter((r) => !r.dup && !r.fails.length);
  const dates = base.map((r) => r.date).filter(Boolean).sort();
  const skip = new Set([idCol, dateCol, ...keys.map((k) => k.i)]);
  const categories = [];
  const blankable = [];
  source.headers.forEach((h, i) => {
    if (skip.has(i)) return;
    const values = new Map();
    let blanks = 0;
    for (const r of base) {
      const v = norm(r.cells[i]);
      if (!v) blanks++;
      else values.set(v, (values.get(v) || 0) + 1);
    }
    if (blanks) blankable.push(i);
    const labels = [...values.keys()];
    if (values.size >= 2 && values.size <= 30 && values.size < base.length && !labels.every((v) => num(v) != null) && !labels.every((v) => parseDate(v))) {
      categories.push({ i, values: [...values.keys()].sort() });
    }
  });
  const otherDates = monthKey < 0 ? [] : source.headers.map((_, i) => i)
    .filter((i) => i !== keys[monthKey].i && looksLikeDates(source, i));
  const months = base.map((r) => r.keys[monthKey]).filter(Boolean).sort();

  return {
    source, recipe, keys, idCol, dateCol, monthKey, filters, rows, base, categories, blankable, otherDates,
    firstDate: dates[0], lastDate: dates.at(-1), latestMonth: monthKey >= 0 ? months.at(-1) : null,
  };
}

function reportRows(report, recipe) {
  const idx = recipe.keys.map((k) => columnIndex(report, k.report));
  return report.rows.map((cells, ri) => {
    const raw = idx.map((i) => cells[i] ?? '');
    if (raw.every((x) => !x)) return null;
    const anyTotal = raw.some((x) => TOTAL.test(x));
    const wild = raw.map((x) => TOTAL.test(x) || (anyTotal && x === ''));
    const keys = raw.map((x, j) => (wild[j] ? null : recipe.keys[j].as === 'month' ? parseMonth(x) ?? norm(x) : norm(x)));
    return { ri, cells, raw, keys, isTotal: wild.some(Boolean), label: raw.filter(Boolean).join(' · ') };
  }).filter(Boolean);
}

const inScope = (row, rr) => rr.keys.every((k, j) => k === null || row.keys[j] === k);
const count = (n, one, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

// Each test returns { code, detail, rows } when changing the source rows in
// one specific way reproduces the report's figure, or null.
function testDuplicates(ctx) {
  const { p, scope, figure, fn } = ctx;
  const dups = scope.filter((r) => r.dup && !r.fails.length);
  if (!dups.length) return null;
  const rows = scope.filter((r) => !r.fails.length);
  if (!agrees(figure, fn(rows))) return null;
  const id = p.source.headers[p.idCol];
  return {
    code: 'duplicates', rows,
    detail: `${count(dups.length, 'row')} here repeat${dups.length === 1 ? "s" : ""} a value of ${id} that is already in the source. The report counted ${dups.length === 1 ? 'it' : 'them'} again; counted once, the figure is ${formatLike(figure, ctx.value)}.`,
  };
}

function testFilters(ctx) {
  const { p, scope, figure, fn } = ctx;
  for (let j = 0; j < p.filters.length; j++) {
    const kept = scope.filter((r) => !r.dup && r.fails.length === 1 && r.fails[0] === j);
    if (!kept.length) continue;
    const rows = scope.filter((r) => !r.dup && r.fails.every((x) => x === j));
    if (agrees(figure, fn(rows))) {
      const f = p.filters[j];
      return {
        code: 'filter', rows,
        detail: `The report matches the source if rows where ${f.column} is ${f.not} are kept in. The rule for this report leaves them out (${count(kept.length, 'row')} here).`,
      };
    }
  }
  return null;
}

function staleCutoffs(ctx) {
  const { p, rr, base, figure, fn } = ctx;
  if (p.dateCol < 0 || !p.lastDate) return null;
  if (p.monthKey >= 0 && rr.keys[p.monthKey] !== null && rr.keys[p.monthKey] !== p.latestMonth) return null;
  const from = p.monthKey >= 0 && rr.keys[p.monthKey] ? monthStart(rr.keys[p.monthKey]) : addDays(p.lastDate, -STALE_WINDOW);
  const found = [];
  for (let c = addDays(p.lastDate, -1); c >= from && c >= p.firstDate; c = addDays(c, -1)) {
    const rows = base.filter((r) => r.date && r.date <= c);
    if (rows.length < base.length && agrees(figure, fn(rows))) found.push(c);
  }
  return found.length ? found : null;
}

function staleReason(ctx, cutoff) {
  const rows = ctx.base.filter((r) => r.date && r.date <= cutoff);
  const missing = ctx.base.length - rows.length;
  return {
    code: 'stale', rows, cutoff,
    detail: `The report matches the source up to ${formatDate(cutoff)}. The ${count(missing, 'row')} dated after that are missing, as if the extract was taken on ${formatDate(addDays(cutoff, 1))}. The source runs to ${formatDate(ctx.p.lastDate)}.`,
  };
}

function testDateRange(ctx) {
  const { p, rr, figure, fn } = ctx;
  const j = p.monthKey;
  if (j < 0 || rr.keys[j] === null) return null;
  const month = rr.keys[j];
  const start = monthStart(month);
  const end = monthEnd(month);
  const pool = p.base.filter((r) => rr.keys.every((k, x) => x === j || k === null || r.keys[x] === k));
  const keyName = p.keys[j].source;
  for (let d = 1; d <= 3; d++) {
    for (let a = -d; a <= d; a++) {
      for (const b of new Set([d - Math.abs(a), Math.abs(a) - d])) {
        const from = addDays(start, a);
        const to = addDays(end, b);
        const rows = pool.filter((r) => r.keyDates[j] && r.keyDates[j] >= from && r.keyDates[j] <= to);
        if (!agrees(figure, fn(rows))) continue;
        let hint = '';
        if (a === 0 && b < 0) hint = ` The last ${-b === 1 ? 'day of the month was' : `${-b} days of the month were`} left out, which is what an end date read as "before" rather than "up to" does.`;
        else if (a > 0 && b === 0) hint = ` The first ${a === 1 ? 'day of the month was' : `${a} days of the month were`} left out.`;
        else if (a < 0 || b > 0) hint = ' Days from the next or previous month were counted in.';
        return {
          code: 'date-range', rows,
          detail: `The figure matches the source from ${formatDate(from)} to ${formatDate(to)}, by ${keyName}. ${formatMonth(month)} runs from ${formatDate(start)} to ${formatDate(end)}.${hint}`,
        };
      }
    }
  }
  for (const i of p.otherDates) {
    const rows = pool.filter((r) => { const d = parseDate(r.cells[i]); return d && monthOf(d) === month; });
    if (agrees(figure, fn(rows))) {
      return {
        code: 'date-range', rows,
        detail: `The figure matches the source if rows are put in months by ${p.source.headers[i]} instead of ${keyName}.`,
      };
    }
  }
  return null;
}

function testRounding(ctx) {
  const { figure, value } = ctx;
  if (Math.abs(figure.value - value) > unit(figure) * (1 + 1e-9)) return null;
  return {
    code: 'rounding', rows: null,
    detail: `The report shows ${formatLike(figure, figure.value)}. The source gives ${formatLike(figure, value, 2)}, which rounds to ${formatLike(figure, value)}. It looks cut off rather than rounded, or rounded twice.`,
  };
}

function testCategories(ctx) {
  const { p, base, figure, fn } = ctx;
  for (const { i, values } of p.categories) {
    for (const v of values) {
      const out = base.filter((r) => norm(r.cells[i]) === v);
      if (!out.length || out.length === base.length) continue;
      const rows = base.filter((r) => norm(r.cells[i]) !== v);
      if (agrees(figure, fn(rows))) {
        const shown = out[0].cells[i];
        return {
          code: 'filter', rows,
          detail: `The report matches the source if rows where ${p.source.headers[i]} is ${shown} are left out (${count(out.length, 'row')} here). The rule for this report keeps them.`,
        };
      }
    }
  }
  return null;
}

function testBlanks(ctx) {
  const { p, base, figure, fn } = ctx;
  for (const i of p.blankable) {
    const blank = base.filter((r) => !norm(r.cells[i]));
    if (!blank.length) continue;
    const rows = base.filter((r) => norm(r.cells[i]));
    if (agrees(figure, fn(rows))) {
      return {
        code: 'join', rows,
        detail: `${count(blank.length, 'row')} here ${blank.length === 1 ? 'has' : 'have'} no ${p.source.headers[i]}. The report matches the source if they are dropped, which is what an inner join does when a value has no match in the other table.`,
      };
    }
  }
  return null;
}

function unexplained(ctx) {
  const { figure, value, base, rr } = ctx;
  if (!base.length) return { code: 'unknown', rows: null, detail: `No rows in the source belong to ${rr.label}, so the source gives ${formatLike(figure, 0)}.` };
  const diff = figure.value - value;
  return {
    code: 'unknown', rows: null,
    detail: `The report is ${formatLike(figure, Math.abs(diff))} ${diff > 0 ? 'higher' : 'lower'} than the source, and none of the causes the checker tests for reproduces it on its own. Check this one by hand.`,
  };
}

function diagnoseRow(ctx) {
  for (const test of [testDuplicates, testFilters]) {
    const r = test(ctx);
    if (r) return r;
  }
  const cutoffs = staleCutoffs(ctx);
  if (cutoffs) return { ...staleReason(ctx, cutoffs[0]), cutoffs };
  for (const test of [testDateRange, testRounding, testCategories, testBlanks]) {
    const r = test(ctx);
    if (r) return r;
  }
  return unexplained(ctx);
}

function diagnoseTotal(ctx, children, results) {
  const { p, rr, m, figure, fn, base } = ctx;
  if (ADDITIVE.has(m.agg) && children.length) {
    const figs = children.map((c) => results.get(c.ri)?.get(m.report)?.reported).filter(Boolean);
    const sum = figs.reduce((s, f) => s + f.value, 0);
    // Counts are exact; sums of rounded figures may drift by half a unit each.
    const tolerance = m.agg === 'count' ? 0 : figs.reduce((t, f) => t + unit(f) / 2, 0);
    if (figs.length === children.length && Math.abs(sum - figure.value) > tolerance + 1e-9) {
      return {
        code: 'total', rows: null,
        detail: `The rows above add up to ${formatLike(figure, sum)}, but the total says ${formatLike(figure, figure.value)}. From the source, it should be ${formatLike(figure, ctx.value)}.`,
      };
    }
  }
  if (children.length) {
    const union = new Set();
    let carried = false;
    for (const c of children) {
      const row = results.get(c.ri);
      const own = row?.get(m.report);
      const alt = own?.reason?.rows ?? [...(row?.values() ?? [])].find((x) => x.reason?.rows)?.reason.rows;
      if (own?.status === 'mismatch' || alt) carried = true;
      for (const r of alt ?? base.filter((x) => inScope(x, c))) union.add(r);
    }
    if (agrees(figure, fn([...union]))) {
      const uncovered = base.filter((r) => !children.some((c) => inScope(r, c)));
      if (uncovered.length) {
        const blanks = p.keys.map((k, j) => uncovered.filter((r) => !r.keys[j]).length);
        const j = blanks.findIndex((n) => n > 0);
        const what = j >= 0
          ? `${count(blanks[j], 'source row')} ${blanks[j] === 1 ? 'has' : 'have'} no ${p.keys[j].source}, so no row of the report holds ${blanks[j] === 1 ? 'it' : 'them'}`
          : `${count(uncovered.length, 'source row')} belong to no row of the report`;
        return {
          code: 'join', rows: null,
          detail: `${what}, and the total leaves ${uncovered.length === 1 ? 'it' : 'them'} out. That is what an inner join does when a value has no match in the other table.${carried ? ' It also carries the differences in the rows above.' : ''}`,
        };
      }
      if (carried) {
        return {
          code: 'inherited', rows: null,
          detail: `The total agrees with the rows above it, so it carries their differences. From the source, it should be ${formatLike(figure, ctx.value)}.`,
        };
      }
    }
  }
  for (const test of [testDuplicates, testFilters]) {
    const r = test(ctx);
    if (r) return r;
  }
  const cutoffs = staleCutoffs(ctx);
  if (cutoffs) return { ...staleReason(ctx, cutoffs[0]), cutoffs };
  for (const test of [testRounding, testCategories, testBlanks]) {
    const r = test(ctx);
    if (r) return r;
  }
  return unexplained(ctx);
}

// When several figures look stale, prefer one cutoff that explains them all.
function alignCutoffs(stale, ctxs) {
  if (stale.length < 2) return;
  let common = new Set(stale[0].reason.cutoffs);
  for (const f of stale.slice(1)) common = new Set(f.reason.cutoffs.filter((c) => common.has(c)));
  if (!common.size) return;
  const cutoff = [...common].sort().at(-1);
  for (const f of stale) {
    const { rows, detail } = staleReason(ctxs.get(f), cutoff);
    Object.assign(f.reason, { rows, detail, cutoff });
  }
}

export function checkReport(report, source, recipe) {
  const p = prepare(source, recipe);
  const measures = recipe.measures.map((m) => ({ ...m, col: columnIndex(report, m.report), fn: measureFn(m, source) }));
  const rows = reportRows(report, recipe);
  const results = new Map();
  const figures = [];
  const ctxs = new Map();
  let blanks = 0;

  const run = (rr, diagnose) => {
    const scope = p.rows.filter((r) => inScope(r, rr));
    const base = scope.filter((r) => !r.dup && !r.fails.length);
    const byMeasure = new Map();
    results.set(rr.ri, byMeasure);
    for (const m of measures) {
      const figure = parseFigure(rr.cells[m.col]);
      if (!figure) { if (String(rr.cells[m.col] ?? '').trim()) blanks++; continue; }
      const value = m.fn(base);
      const f = {
        row: rr.label, keys: rr.raw, rowIndex: rr.ri, measure: m.report, isTotal: rr.isTotal,
        reported: figure, recalculated: value, status: agrees(figure, value) ? 'match' : 'mismatch', reason: null,
      };
      if (f.status === 'mismatch') {
        const ctx = { p, rr, m, figure, value, fn: m.fn, scope, base };
        f.reason = diagnose(ctx);
        ctxs.set(f, ctx);
      }
      byMeasure.set(m.report, f);
      figures.push(f);
    }
  };

  const plain = rows.filter((r) => !r.isTotal);
  for (const rr of plain) run(rr, diagnoseRow);
  alignCutoffs(figures.filter((f) => f.reason?.code === 'stale'), ctxs);
  for (const rr of rows.filter((r) => r.isTotal)) {
    const children = plain.filter((c) => rr.keys.every((k, j) => k === null || c.keys[j] === k));
    run(rr, (ctx) => diagnoseTotal(ctx, children, results));
  }

  figures.sort((a, b) => a.rowIndex - b.rowIndex);
  const byReason = {};
  for (const f of figures) if (f.reason) byReason[f.reason.code] = (byReason[f.reason.code] || 0) + 1;
  for (const f of figures) {
    if (f.reason) { delete f.reason.rows; delete f.reason.cutoffs; f.reason.title = REASONS[f.reason.code]; }
  }
  return {
    figures,
    matched: figures.filter((f) => f.status === 'match').length,
    mismatched: figures.filter((f) => f.status === 'mismatch').length,
    byReason,
    skipped: blanks,
    duplicates: p.rows.filter((r) => r.dup).length,
    sourceRows: p.rows.length,
  };
}
