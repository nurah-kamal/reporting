import ExcelJS from 'exceljs';
import { CURRENCIES } from './ecb.js';
import { PAIRS } from './transform.js';

const r4 = (x) => x.toFixed(4);
const pct = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%`;
const direction = (x) => (Math.abs(x) < 0.0005 ? 'about the same' : x > 0 ? 'weaker' : 'stronger');

const NOTES = [
  'Source: ECB statistics. Euro foreign exchange reference rates, published by the European Central Bank for information only.',
  'The ECB publishes rates as units of each currency per euro. Rand per euro is the ECB figure unchanged. Rand per US dollar and rand per pound are calculated here by dividing rand per euro by dollars or pounds per euro.',
  'A reference rate is one snapshot a day, taken around 14:15 Central European Time. It is not the rate a bank or bureau would give, and it says nothing about movement during the day.',
  'Days with no fixing (TARGET holidays) are left out rather than filled in, so a week can have fewer than five rates.',
  'A higher rand-per-currency figure means a weaker rand.',
];

export function toMarkdown(s, retrieved) {
  const lines = [
    `# The rand, week ending ${s.week.end}`,
    '',
    `Weekly averages of the ECB reference rates, ${s.week.start} to ${s.week.end} (${s.fixings} fixing${s.fixings === 1 ? '' : 's'}${s.missing ? `; ${s.missing} day${s.missing === 1 ? '' : 's'} without one` : ''}), against the week before.`,
    '',
    '| | This week | Week before | Change | The rand was | Friday | Week range | 52-week range |',
    '| --- | ---: | ---: | ---: | --- | ---: | --- | --- |',
    ...s.pairs.map((p) => `| ${p.label}${p.calculated ? ' (calculated)' : ''} | ${r4(p.average)} | ${r4(p.previous)} | ${pct(p.change)} | ${direction(p.change)} | ${r4(p.close.value)} | ${r4(p.week.low.value)} to ${r4(p.week.high.value)} | ${r4(p.year.low.value)} (${p.year.low.date}) to ${r4(p.year.high.value)} (${p.year.high.date}) |`),
    '',
    ...NOTES.map((n) => `- ${n}`),
    '',
    `Retrieved ${retrieved} from the ECB data API. The workbook beside this file has the daily rates.`,
    '',
  ];
  return lines.join('\n');
}

export async function toWorkbook(s, daily, { retrieved, url }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'report-pipeline';
  wb.created = new Date(`${s.week.end}T00:00:00Z`);
  wb.modified = wb.created;

  const header = (ws) => { ws.getRow(1).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }]; };

  const sum = wb.addWorksheet('Summary');
  sum.columns = [
    { header: 'Rate', key: 'label', width: 30 },
    { header: 'This week', key: 'average', width: 12, style: { numFmt: '0.0000' } },
    { header: 'Week before', key: 'previous', width: 12, style: { numFmt: '0.0000' } },
    { header: 'Change', key: 'change', width: 10, style: { numFmt: '+0.00%;-0.00%;0.00%' } },
    { header: 'The rand was', key: 'direction', width: 14 },
    { header: 'Friday close', key: 'close', width: 12, style: { numFmt: '0.0000' } },
    { header: 'Week low', key: 'wlow', width: 11, style: { numFmt: '0.0000' } },
    { header: 'Week high', key: 'whigh', width: 11, style: { numFmt: '0.0000' } },
    { header: '52-week low', key: 'ylow', width: 12, style: { numFmt: '0.0000' } },
    { header: 'on', key: 'ylowOn', width: 11 },
    { header: '52-week high', key: 'yhigh', width: 12, style: { numFmt: '0.0000' } },
    { header: 'on', key: 'yhighOn', width: 11 },
  ];
  for (const p of s.pairs) {
    sum.addRow({
      label: p.label + (p.calculated ? ' (calculated)' : ''), average: p.average, previous: p.previous, change: p.change,
      direction: direction(p.change), close: p.close.value, wlow: p.week.low.value, whigh: p.week.high.value,
      ylow: p.year.low.value, ylowOn: p.year.low.date, yhigh: p.year.high.value, yhighOn: p.year.high.date,
    });
  }
  header(sum);
  sum.addRow([]);
  sum.addRow([`Week ${s.week.start} to ${s.week.end}, ${s.fixings} fixings, against ${s.previousWeek.start} to ${s.previousWeek.end}.`]);

  const day = wb.addWorksheet('Daily');
  day.columns = [
    { header: 'Date', key: 'date', width: 12 },
    ...CURRENCIES.map((c) => ({ header: `${c} per EUR (ECB)`, key: c, width: 16, style: { numFmt: '0.0000#' } })),
    ...PAIRS.filter((p) => p.calculated).map((p) => ({ header: `${p.label} (calculated)`, key: p.pair, width: 26, style: { numFmt: '0.0000' } })),
  ];
  for (const row of daily) day.addRow(row);
  header(day);

  const src = wb.addWorksheet('Source');
  src.columns = [{ header: 'About this workbook', key: 'a', width: 120 }];
  for (const line of [...NOTES, `Retrieved ${retrieved} from ${url}`, 'Reuse: ECB statistics may be reused free of charge provided the source is quoted.']) src.addRow({ a: line });
  header(src);

  return wb;
}
