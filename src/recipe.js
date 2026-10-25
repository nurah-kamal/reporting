// A recipe says how each report figure is worked out from the source:
// which columns pair the report's rows with source rows, which rows are
// left out, and what each figure column counts or adds up.
//
// guessRecipe makes a first guess from the column names and values, for the
// person to correct on the page.

import { parseDate, parseMonth } from './dates.js';
import { parseFigure } from './numbers.js';
import { norm } from './table.js';

const words = (s) => norm(s).replace(/[^a-z0-9%]+/g, ' ').trim().split(' ').filter(Boolean);
const MONEY = new Set(['revenue', 'sales', 'amount', 'value', 'fee', 'fees', 'price', 'cost', 'takings', 'income', 'spend', 'r', 'zar', 'rand']);
const same = (a, b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4))))
  || (MONEY.has(a) && MONEY.has(b));

function similarity(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return 0;
  return x.filter((w) => y.some((v) => same(w, v))).length / Math.max(x.length, y.length);
}

function columnValues(table, i) {
  return table.rows.map((r) => r[i]).filter((v) => v !== '');
}

function share(values, test) {
  return values.length ? values.filter(test).length / values.length : 0;
}

export function guessRecipe(report, source) {
  const isTotal = (v) => /^(grand\s+)?totals?$|^all$|^overall$/i.test(v.trim());
  const numericIn = (table, i) => share(columnValues(table, i).filter((v) => !isTotal(v)), (v) => parseFigure(v) != null) >= 0.8;
  const datesIn = (i) => share(columnValues(source, i).slice(0, 200), (v) => parseDate(v)) >= 0.8;

  const reportKeys = report.headers.map((_, i) => i).filter((i) => !numericIn(report, i));
  if (!reportKeys.length) reportKeys.push(0);
  const keys = reportKeys.map((ri) => {
    const labels = columnValues(report, ri).filter((v) => !isTotal(v));
    if (share(labels, (v) => parseMonth(v)) >= 0.8) {
      const dateCols = source.headers.map((_, i) => i).filter(datesIn);
      const best = dateCols.sort((a, b) => similarity(report.headers[ri], source.headers[b]) - similarity(report.headers[ri], source.headers[a]))[0];
      if (best != null) return { report: report.headers[ri], source: source.headers[best], as: 'month' };
    }
    const want = new Set(labels.map(norm));
    let best = 0;
    let bestScore = -1;
    source.headers.forEach((h, i) => {
      const values = new Set(columnValues(source, i).map(norm));
      const covered = [...want].filter((v) => values.has(v)).length;
      const score = covered + similarity(report.headers[ri], h) / 2;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return { report: report.headers[ri], source: source.headers[best], as: 'value' };
  });

  const idCol = source.headers.findIndex((h, i) => {
    if (!/(^|[\s_-])(id|ref|reference|number|no)$|^id$/i.test(h.trim())) return false;
    const values = columnValues(source, i);
    return values.length && new Set(values.map(norm)).size >= values.length * 0.9;
  });

  const numericSource = source.headers.map((_, i) => i).filter((i) => numericIn(source, i) && !datesIn(i) && i !== idCol);
  const bestNumeric = (name) => numericSource
    .map((i) => ({ i, s: similarity(name, source.headers[i]) }))
    .sort((a, b) => b.s - a.s)[0];

  const measures = report.headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => !reportKeys.includes(i))
    .map(({ h, i }) => {
      const name = norm(h);
      const percent = share(columnValues(report, i), (v) => v.trim().endsWith('%')) >= 0.5;
      if (percent || /\b(rate|share|percent|pct)\b|%/.test(name)) {
        for (const [ci, col] of source.headers.entries()) {
          const values = [...new Set(columnValues(source, ci).map((v) => v.trim()))];
          if (values.length > 30) continue;
          const hit = values.find((v) => words(h).some((w) => w.length > 3 && same(w, norm(v))));
          if (hit) return { report: h, agg: 'share', column: col, value: hit };
          const yes = values.find((v) => /^(yes|y|true)$/i.test(v));
          if (yes && values.length <= 3 && similarity(h, col) > 0) return { report: h, agg: 'share', column: col, value: yes };
        }
      }
      if (/\b(avg|average|mean)\b/.test(name)) {
        const best = bestNumeric(h);
        if (best) return { report: h, agg: 'mean', column: source.headers[best.i] };
      }
      if (/\b(distinct|unique|different)\b/.test(name)) {
        const best = source.headers.map((c, ci) => ({ ci, s: similarity(h, c) })).sort((a, b) => b.s - a.s)[0];
        return { report: h, agg: 'distinct', column: source.headers[best.ci] };
      }
      const best = bestNumeric(h);
      if (best && best.s > 0) {
        // A figure that sits inside the column's own range is an average, not a total.
        const reported = columnValues(report, i).map((v) => parseFigure(v)?.value).filter((v) => v != null).sort((a, b) => a - b);
        const values = columnValues(source, best.i).map((v) => parseFigure(v)?.value).filter((v) => v != null);
        const middle = reported[Math.floor(reported.length / 2)];
        const inside = middle >= Math.min(...values) && middle <= Math.max(...values);
        return { report: h, agg: inside ? 'mean' : 'sum', column: source.headers[best.i] };
      }
      return { report: h, agg: 'count' };
    });

  return {
    keys,
    id: idCol >= 0 ? source.headers[idCol] : null,
    date: null,
    filters: [],
    measures,
  };
}
