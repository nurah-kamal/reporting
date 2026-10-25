// A small .xlsx reader with no libraries. An .xlsx file is a zip of XML
// files; the browser (and Node) can inflate zip entries with
// DecompressionStream, so all this needs is the zip directory and a few
// regular expressions over the sheet XML.
//
// Each cell comes back as the text Excel would show, so 0.806 in a cell
// formatted 0.0% reads as "80.6%" and a date serial reads as "2026-03-04".

import { roundTo } from './numbers.js';

const td = new TextDecoder();

function u16(b, at) { return b[at] | (b[at + 1] << 8); }
function u32(b, at) { return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0; }

async function inflate(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('This is not an Excel (.xlsx) file: no zip directory found.');
  const count = u16(b, end + 10);
  let at = u32(b, end + 16);
  if (at === 0xffffffff) throw new Error('This workbook is too large to read here (zip64).');
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (u32(b, at) !== 0x02014b50) throw new Error('The workbook\'s zip directory is damaged.');
    const method = u16(b, at + 10);
    const size = u32(b, at + 20);
    const nameLen = u16(b, at + 28);
    const extraLen = u16(b, at + 30);
    const commentLen = u16(b, at + 32);
    const local = u32(b, at + 42);
    const name = td.decode(b.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;
    files.set(name, { method, size, local });
  }
  return {
    names: [...files.keys()],
    async read(name) {
      const f = files.get(name);
      if (!f) return null;
      const start = f.local + 30 + u16(b, f.local + 26) + u16(b, f.local + 28);
      const data = b.subarray(start, start + f.size);
      if (f.method === 0) return td.decode(data);
      if (f.method === 8) return td.decode(await inflate(data));
      throw new Error(`Unsupported compression in ${name}.`);
    },
  };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodeXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
    return ENTITIES[e] ?? m;
  });
}

function attrs(tag) {
  const out = {};
  for (const [, k, v] of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[k] = decodeXml(v);
  return out;
}

// All the <t> text inside a fragment, joined (rich text has several runs).
function text(fragment) {
  let s = '';
  for (const [, t] of fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) s += t;
  return decodeXml(s);
}

const BUILTIN = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%',
  11: '0.00E+00', 12: '# ?/?', 13: '# ??/??', 14: 'yyyy-mm-dd', 15: 'd-mmm-yy', 16: 'd-mmm',
  17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'yyyy-mm-dd h:mm',
  37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)',
  45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 48: '##0.0E+0', 49: '@',
};

function isDateFormat(code) {
  const bare = code.split(';')[0].replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  return /[dmyhs]/i.test(bare) && !/^general$/i.test(bare);
}

function serialToDate(serial, date1904) {
  const days = Math.floor(serial) + (date1904 ? 1462 : 0);
  const t = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  return t.toISOString().slice(0, 10);
}

export function formatCell(raw, code, date1904 = false) {
  const v = Number(raw);
  if (!Number.isFinite(v)) return raw;
  if (!code || /^general$/i.test(code) || code === '@') return String(Number(v.toPrecision(15)));
  if (isDateFormat(code)) return serialToDate(v, date1904);
  const first = code.split(';')[0].replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
  const decimals = (first.match(/\.([0#]+)/) || [, ''])[1].length;
  if (first.includes('%')) return `${roundTo(v * 100, decimals).toFixed(decimals)}%`;
  const fixed = roundTo(v, decimals).toFixed(decimals);
  return /[#0],[#0]/.test(first) ? fixed.replace(/^-?\d+/, (n) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ',')) : fixed;
}

function columnIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function resolveTarget(target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `xl/${target}`.split('/');
  const out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
  return out.join('/');
}

export async function readXlsx(input) {
  const zip = await unzip(input);
  const workbook = await zip.read('xl/workbook.xml');
  if (!workbook) throw new Error('This zip has no xl/workbook.xml, so it is not an Excel workbook.');
  const date1904 = /<workbookPr\b[^>]*date1904="(1|true)"/.test(workbook);
  const rels = (await zip.read('xl/_rels/workbook.xml.rels')) || '';
  const targets = {};
  for (const [tag] of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const a = attrs(tag);
    targets[a.Id] = a.Target;
  }

  const shared = [];
  const sst = await zip.read('xl/sharedStrings.xml');
  if (sst) for (const [, si] of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(text(si));

  const formats = {};
  const styles = [];
  const css = await zip.read('xl/styles.xml');
  if (css) {
    for (const [tag] of css.matchAll(/<numFmt\b[^>]*>/g)) {
      const a = attrs(tag);
      formats[a.numFmtId] = a.formatCode;
    }
    const xfs = css.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
    if (xfs) for (const [tag] of xfs[1].matchAll(/<xf\b[^>]*>/g)) styles.push(+(attrs(tag).numFmtId || 0));
  }
  const codeFor = (s) => {
    const id = styles[+s || 0] ?? 0;
    return formats[id] ?? BUILTIN[id] ?? 'General';
  };

  const sheets = [];
  for (const [tag] of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const a = attrs(tag);
    const xml = await zip.read(resolveTarget(targets[a['r:id']] || ''));
    if (!xml) continue;
    const rows = [];
    for (const [, rowAttrs, body = ''] of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = attrs(rowAttrs).r;
      const index = r ? +r - 1 : rows.length;
      const cells = [];
      let next = 0;
      for (const [, cellAttrs, inner = ''] of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const c = attrs(cellAttrs);
        const col = c.r ? columnIndex(c.r) : next;
        next = col + 1;
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let value = '';
        if (c.t === 's') value = shared[+v] ?? '';
        else if (c.t === 'inlineStr') value = text(inner);
        else if (c.t === 'str' || c.t === 'e') value = v == null ? '' : decodeXml(v);
        else if (c.t === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
        else if (v != null) value = formatCell(v, codeFor(c.s), date1904);
        cells[col] = value;
      }
      rows[index] = Array.from(cells, (x) => x ?? '');
    }
    const width = Math.max(0, ...rows.filter(Boolean).map((r) => r.length));
    sheets.push({ name: a.name, rows: Array.from(rows, (r) => { const x = r || []; while (x.length < width) x.push(''); return x; }) });
  }
  if (!sheets.length) throw new Error('No worksheets found in this workbook.');
  return { sheets };
}
