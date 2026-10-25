// The page: reads the two files in the browser, lets the reader adjust how
// each figure is worked out, and shows the checker's verdicts two ways.
// Nothing here sends a file anywhere; the only requests are for the samples.

import { checkReport, describeMeasure, formatLike, formatNumber, guessRecipe, readTable, REASONS } from '../lib/index.js';

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

const PATHS = {
  tick: '<path d="m3 8.5 3.2 3L13 4.5"/>',
  cross: '<path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/>',
  remove: '<path d="m4 4 8 8M12 4l-8 8"/>',
};
const icon = (name) => h('span', { html: `<svg viewBox="0 0 16 16" aria-hidden="true">${PATHS[name]}</svg>` }).firstChild;

const REASON_ORDER = ['duplicates', 'filter', 'date-range', 'stale', 'rounding', 'join', 'total', 'inherited', 'unknown'];
const AGGS = [['count', 'Count rows'], ['sum', 'Add up a column'], ['mean', 'Average a column'], ['share', 'Share of rows where…'], ['distinct', 'Count different values']];

const state = {
  files: { report: null, source: null },
  names: { report: '', source: '' },
  recipe: null,
  sample: null,
  result: null,
  filter: 'all',
  open: null,
};

/* files */

function showSlot(slot) {
  const el = $(`[data-slot="${slot}"]`);
  const t = state.files[slot];
  el.classList.toggle('loaded', !!t);
  $('[data-hint]', el).textContent = t
    ? `${state.names[slot]} · ${formatNumber(t.rows.length)} rows, ${t.headers.length} columns${t.sheet ? ` · sheet "${t.sheet}"` : ''}`
    : 'Choose a file or drop it here';
}

function markSamples(id) {
  for (const b of $$('[data-sample]')) b.setAttribute('aria-pressed', String(b.dataset.sample === id));
}

async function addFile(slot, file) {
  const el = $(`[data-slot="${slot}"]`);
  $('[data-error]', el).textContent = '';
  if (state.sample) {
    state.sample = null;
    markSamples(null);
    for (const s of ['report', 'source']) { state.files[s] = null; showSlot(s); }
    hideResults();
  }
  try {
    const table = await readTable(file.name, await file.arrayBuffer());
    if (!table.rows.length) throw new Error('This file has a header row but nothing under it.');
    state.files[slot] = table;
    state.names[slot] = file.name;
  } catch (e) {
    state.files[slot] = null;
    $('[data-error]', el).textContent = `${file.name} could not be read. ${e.message}`;
  }
  showSlot(slot);
  if (state.files.report && state.files.source) {
    try {
      state.recipe = guessRecipe(state.files.report, state.files.source);
    } catch (e) {
      $('[data-error]', el).textContent = e.message;
      return;
    }
    renderRecipe(true);
    run({ scroll: true });
  }
}

async function loadSample(id, button) {
  button.setAttribute('aria-busy', 'true');
  const meta = $('.sample-meta', button);
  const label = meta.textContent;
  meta.textContent = 'Reading the files…';
  try {
    const base = `samples/${id}/`;
    const meta = await (await fetch(`${base}sample.json`)).json();
    const [report, source] = await Promise.all([meta.report, meta.source].map(async (name) => {
      const res = await fetch(base + name);
      if (!res.ok) throw new Error(`${name} did not load (${res.status}).`);
      return readTable(name, await res.arrayBuffer());
    }));
    state.files = { report, source };
    state.names = { report: meta.report, source: meta.source };
    state.sample = meta;
    state.recipe = structuredClone(meta.recipe);
    for (const s of ['report', 'source']) { $(`[data-slot="${s}"] [data-error]`).textContent = ''; showSlot(s); }
    markSamples(id);
    renderRecipe(false);
    run({ scroll: true });
  } catch (e) {
    $('[data-slot="report"] [data-error]').textContent = `The sample could not be loaded. ${e.message}`;
  } finally {
    button.removeAttribute('aria-busy');
    meta.textContent = label;
  }
}

/* how each figure is worked out */

function distinctValues(column) {
  const t = state.files.source;
  const i = t.headers.indexOf(column);
  const seen = new Map();
  for (const r of t.rows) {
    const v = r[i];
    if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
    if (seen.size > 60) break;
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

let fieldId = 0;
function select(label, options, value, onchange) {
  const id = `f${++fieldId}`;
  const sel = h('select', { id, onchange: (e) => onchange(e.target.value) },
    options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));
  return h('div', { class: 'field' }, h('label', { for: id }, label), sel);
}

const columns = () => state.files.source.headers.map((c) => [c, c]);

function summary() {
  const r = state.recipe;
  const keys = r.keys.map((k) => k.report).join(' and ');
  const left = r.filters.length ? `leaves out ${r.filters.map((f) => `${f.column} = ${f.not}`).join(', ')}` : 'leaves no rows out';
  return `Rows matched on ${keys} · ${left} · ${r.measures.length} figure columns`;
}

function renderRecipe(open) {
  const wrap = $('[data-recipe-wrap]');
  const form = $('[data-recipe]');
  const r = state.recipe;
  wrap.hidden = false;
  if (open != null) $('[data-recipe-details]').open = open;
  $('[data-recipe-sum]').textContent = summary();
  const changed = () => { renderRecipe(); run(); };

  const keyRules = r.keys.map((k) => h('div', { class: 'rule' },
    h('p', { class: 'what' }, k.report, h('small', {}, 'column in the report')),
    select('Matches source column', columns(), k.source, (v) => { k.source = v; changed(); }),
    select('Read as', [['value', 'Its value'], ['month', 'Month of a date']], k.as, (v) => { k.as = v; changed(); }),
    h('span', { class: 'spacer' }), h('span', { class: 'spacer' })));

  const idRule = h('div', { class: 'rule' },
    h('p', { class: 'what' }, 'Each row\'s reference', h('small', {}, 'to spot rows that appear twice')),
    select('Source column', [['', 'None'], ...columns()], r.id ?? '', (v) => { r.id = v || null; changed(); }),
    h('span', { class: 'spacer' }), h('span', { class: 'spacer' }), h('span', { class: 'spacer' }));

  const filterRules = r.filters.map((f, n) => h('div', { class: 'rule' },
    h('p', { class: 'what' }, 'Leave out rows where'),
    select('Column', columns(), f.column, (v) => { f.column = v; f.not = distinctValues(v)[0] ?? ''; changed(); }),
    select('Is', distinctValues(f.column).map((v) => [v, v]), f.not, (v) => { f.not = v; changed(); }),
    h('span', { class: 'spacer' }),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove the rule for ${f.column}`, onclick: () => { r.filters.splice(n, 1); changed(); } }, icon('remove'))));

  const measureRules = r.measures.map((m) => {
    const parts = [
      h('p', { class: 'what' }, m.report, h('small', {}, describeMeasure(m))),
      select('Is worked out as', AGGS, m.agg, (v) => {
        m.agg = v;
        if (v === 'count') { delete m.column; delete m.value; }
        else {
          m.column = m.column ?? state.files.source.headers[0];
          if (v === 'share') m.value = m.value ?? distinctValues(m.column)[0];
          else delete m.value;
        }
        changed();
      }),
    ];
    if (m.agg !== 'count') parts.push(select('Of column', columns(), m.column, (v) => { m.column = v; if (m.agg === 'share') m.value = distinctValues(v)[0]; changed(); }));
    else parts.push(h('span', { class: 'spacer' }));
    if (m.agg === 'share') parts.push(select('Is', distinctValues(m.column).map((v) => [v, v]), m.value, (v) => { m.value = v; changed(); }));
    else parts.push(h('span', { class: 'spacer' }));
    parts.push(h('span', { class: 'spacer' }));
    return h('div', { class: 'rule' }, parts);
  });

  const addFilter = h('button', {
    type: 'button', class: 'text-btn',
    onclick: () => {
      const col = state.files.source.headers.find((c) => /status|state|type|category/i.test(c)) ?? state.files.source.headers[0];
      r.filters.push({ column: col, not: distinctValues(col)[0] ?? '' });
      changed();
    },
  }, 'Add a rule');

  const focused = document.activeElement?.id;
  form.replaceChildren(
    h('fieldset', {}, h('legend', {}, 'Pair report rows with source rows'), h('div', { class: 'rule-list' }, keyRules, idRule)),
    h('fieldset', {}, h('legend', {}, 'Rows to leave out'),
      h('div', { class: 'rule-list' }, filterRules.length ? filterRules : h('p', { class: 'recipe-note' }, 'None. Every source row counts.')), addFilter),
    h('fieldset', {}, h('legend', {}, 'Figures'), h('div', { class: 'rule-list' }, measureRules)),
  );
  if (focused && $(`#${focused}`)) $(`#${focused}`).focus();
}

/* results */

function hideResults() {
  $('[data-results]').hidden = true;
  $('[data-recipe-wrap]').hidden = true;
  state.result = null;
}

const figKey = (f) => `${f.rowIndex}|${f.measure}`;

function run({ scroll = false } = {}) {
  const results = $('[data-results]');
  const err = $('[data-run-error]');
  results.hidden = false;
  err.hidden = true;
  try {
    state.result = checkReport(state.files.report, state.files.source, state.recipe);
  } catch (e) {
    state.result = null;
    err.textContent = `The report can't be checked with these rules: ${e.message}`;
    err.hidden = false;
    $('[data-verdict]').textContent = 'Nothing checked yet';
    for (const sel of ['[data-chips]', '[data-marked]', '[data-list]', '[data-working]']) $(sel).replaceChildren();
    $('[data-planted]').hidden = true;
    return;
  }
  state.filter = 'all';
  state.open = null;
  renderResults();
  if (scroll) {
    results.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    $('[data-verdict]').focus({ preventScroll: true });
  }
}

function renderResults() {
  const res = state.result;
  const total = res.figures.length;
  const verdict = $('[data-verdict]');
  if (!total) verdict.textContent = 'No figures to check. Look at the figure columns under "How each figure is worked out".';
  else if (res.mismatched) verdict.replaceChildren(h('b', {}, formatNumber(res.mismatched)), ` of ${formatNumber(total)} figures ${res.mismatched === 1 ? "doesn't" : "don't"} match the source.`);
  else verdict.textContent = `All ${formatNumber(total)} figures match the source.`;

  const planted = $('[data-planted]');
  if (state.sample) {
    const byKey = new Map(res.figures.map((f) => [`${f.keys.filter(Boolean).join(' · ')}|${f.measure}`, f]));
    const list = state.sample.planted;
    const found = list.filter((p) => byKey.get(`${p.row.join(' · ')}|${p.measure}`)?.reason?.code === p.reason).length;
    const all = found === list.length && res.mismatched === list.length;
    planted.className = `planted${all ? '' : ' short'}`;
    planted.replaceChildren(icon(all ? 'tick' : 'cross'), all
      ? `Planted in this sample: ${list.length} wrong figures. All ${list.length} found, each for the reason it was planted.`
      : `Planted in this sample: ${list.length} wrong figures. ${found} found for the reason planted.`);
    planted.hidden = false;
  } else planted.hidden = true;

  renderChips();
  renderMarked();
  renderList();
  renderWorking();
}

function renderChips() {
  const res = state.result;
  const chip = (id, label, n, cls = '') => h('button', {
    type: 'button', class: `chip ${cls}`, 'aria-pressed': String(state.filter === id),
    onclick: () => { state.filter = state.filter === id && id !== 'all' ? 'all' : id; renderChips(); applyFilter(); },
  }, cls ? h('span', { class: 'dot', 'aria-hidden': 'true' }) : null, label, ' ', h('b', {}, formatNumber(n)));
  const chips = [chip('all', 'All figures', res.figures.length)];
  for (const code of REASON_ORDER) if (res.byReason[code]) chips.push(chip(code, REASONS[code], res.byReason[code], 'bad'));
  if (res.matched) chips.push(chip('match', 'Match the source', res.matched, 'ok'));
  $('[data-chips]').replaceChildren(...chips);
}

const shown = (f) => state.filter === 'all' || (state.filter === 'match' ? f.status === 'match' : f.reason?.code === state.filter);

function applyFilter() {
  for (const b of $$('[data-marked] .fig')) b.classList.toggle('dim', !shown(figures.get(b.dataset.key)));
  renderList();
}

let figures = new Map();

function sourceText(f) {
  return formatLike(f.reported, f.recalculated);
}

function renderMarked() {
  const report = state.files.report;
  const res = state.result;
  figures = new Map(res.figures.map((f) => [figKey(f), f]));
  const keyCols = new Set(state.recipe.keys.map((k) => report.headers.findIndex((x) => x.trim().toLowerCase() === k.report.trim().toLowerCase())));
  const measureAt = new Map(state.recipe.measures.map((m) => [report.headers.findIndex((x) => x.trim().toLowerCase() === m.report.trim().toLowerCase()), m.report]));
  let stagger = 0;
  const rows = report.rows.map((cells, ri) => {
    const isTotal = res.figures.some((f) => f.rowIndex === ri && f.isTotal);
    return h('tr', { class: isTotal ? 'total' : null }, cells.map((text, c) => {
      if (keyCols.has(c)) return h('td', { class: 'key' }, text);
      const f = measureAt.has(c) ? figures.get(`${ri}|${measureAt.get(c)}`) : null;
      if (!f) return h('td', { class: 'plain', 'data-label': report.headers[c] }, text);
      const miss = f.status === 'mismatch';
      const label = `${f.row}, ${f.measure}: the report says ${text}, the source gives ${sourceText(f)}. ${miss ? f.reason.title : 'Matches'}.`;
      const btn = h('button', {
        type: 'button', class: `fig ${miss ? 'miss' : 'match'}${shown(f) ? '' : ' dim'}`,
        'data-key': figKey(f), 'aria-expanded': String(state.open === figKey(f)), 'aria-controls': 'working', 'aria-label': label,
        style: miss ? `--i:${stagger++}` : null,
        onclick: () => { state.open = state.open === figKey(f) ? null : figKey(f); renderWorking(); },
      }, miss
        ? [h('span', { class: 'pair' }, h('span', { class: 'was' }, text), h('span', { class: 'now' }, sourceText(f))), h('span', { class: 'tag' }, f.reason.title)]
        : h('span', { class: 'now' }, text, icon('tick')));
      return h('td', { 'data-label': report.headers[c] }, btn);
    }));
  });
  $('[data-marked]').replaceChildren(h('table', {},
    h('thead', {}, h('tr', {}, report.headers.map((x, c) => h('th', { scope: 'col', class: keyCols.has(c) ? 'key' : null }, x)))),
    h('tbody', {}, rows)));
}

function scopeText(f) {
  const r = state.recipe;
  const parts = f.isTotal ? [] : r.keys.map((k, j) => `${k.source} ${k.as === 'month' ? 'falls in' : 'is'} ${f.keys[j]}`);
  const where = parts.length ? `rows where ${parts.join(' and ')}` : 'all rows';
  const left = r.filters.length ? `, leaving out rows where ${r.filters.map((x) => `${x.column} is ${x.not}`).join(' or ')}` : '';
  const dups = r.id ? `, each ${r.id} counted once` : '';
  return `${where}${left}${dups}`;
}

function renderWorking() {
  const box = $('[data-working]');
  box.id = 'working';
  for (const b of $$('[data-marked] .fig')) b.setAttribute('aria-expanded', String(b.dataset.key === state.open));
  const f = state.open && figures.get(state.open);
  if (!f) { box.replaceChildren(); return; }
  const m = state.recipe.measures.find((x) => x.report === f.measure);
  const miss = f.status === 'mismatch';
  const diff = f.reported.value - f.recalculated;
  const diffText = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${formatNumber(Math.abs(diff), f.reported.decimals + (miss && f.reason.code === 'rounding' ? 2 : 0))}${f.reported.percent ? ' points' : ''}`;
  box.replaceChildren(
    h('h3', {}, `${f.row} · ${f.measure}`),
    h('dl', { class: 'nums' },
      h('div', { class: miss ? 'bad' : '' }, h('dt', {}, 'The report says'), h('dd', {}, formatLike(f.reported, f.reported.value))),
      h('div', { class: 'good' }, h('dt', {}, 'The source gives'), h('dd', {}, sourceText(f))),
      h('div', {}, h('dt', {}, 'Difference'), h('dd', {}, diffText))),
    h('p', {}, h('span', { class: `pill ${miss ? 'bad' : 'good'}` }, icon(miss ? 'cross' : 'tick'), miss ? f.reason.title : 'Matches the source')),
    h('p', {}, miss ? f.reason.detail : 'The source agrees at the precision the report shows.'),
    h('p', { class: 'how' }, `Worked out as: ${describeMeasure(m).toLowerCase()}, over ${scopeText(f)}.`),
  );
}

function renderList() {
  const res = state.result;
  if (!res) return;
  const row = (f) => {
    const miss = f.status === 'mismatch';
    const diff = f.reported.value - f.recalculated;
    return h('div', { class: 'ledger-row', role: 'row' },
      h('div', { class: 'fig-name', role: 'cell' }, h('b', {}, f.row), h('span', {}, f.measure)),
      h('div', { class: 'n', role: 'cell' }, h('span', { class: 'lab' }, 'Report'), formatLike(f.reported, f.reported.value)),
      h('div', { class: `n${miss ? ' off' : ''}`, role: 'cell' }, h('span', { class: 'lab' }, 'Source'), sourceText(f)),
      h('div', { class: 'n', role: 'cell' }, h('span', { class: 'lab' }, 'Difference'), miss ? `${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff), f.reported.decimals)}${f.reported.percent ? ' pts' : ''}` : '0'),
      h('div', { class: 'why', role: 'cell' },
        h('span', { class: `pill ${miss ? 'bad' : 'good'}` }, icon(miss ? 'cross' : 'tick'), miss ? f.reason.title : 'Matches'),
        miss ? h('p', {}, f.reason.detail) : null));
  };
  const visible = res.figures.filter(shown);
  const misses = visible.filter((f) => f.status === 'mismatch');
  const matches = visible.filter((f) => f.status === 'match');
  const head = h('div', { class: 'ledger-head', role: 'row' }, ['Figure', 'Report', 'Source', 'Difference', 'Why'].map((x) => h('span', { role: 'columnheader' }, x)));
  const body = [];
  body.push(...misses.map(row));
  if (matches.length) {
    if (misses.length) body.push(h('div', { class: 'ledger-gap', role: 'row' }, h('span', { role: 'cell' }, `Figures that match the source (${matches.length})`)));
    body.push(...matches.map(row));
  }
  if (!visible.length) body.push(h('p', { class: 'ledger-empty' }, 'No figures in this group.'));
  $('[data-list]').replaceChildren(h('div', { role: 'table', 'aria-label': 'Every figure checked', class: 'ledger' }, head, body));
}

/* tabs */

function selectTab(view, focus = false) {
  for (const t of $$('[role="tab"]')) {
    const on = t.dataset.view === view;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  }
  for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== view;
}

/* wiring */

for (const b of $$('[data-sample]')) b.addEventListener('click', () => loadSample(b.dataset.sample, b));

for (const input of $$('[data-file]')) {
  input.addEventListener('change', () => { if (input.files[0]) addFile(input.dataset.file, input.files[0]); input.value = ''; });
}

for (const slot of $$('[data-slot]')) {
  slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('over'); });
  slot.addEventListener('dragleave', () => slot.classList.remove('over'));
  slot.addEventListener('drop', (e) => {
    e.preventDefault();
    slot.classList.remove('over');
    const file = e.dataTransfer.files[0];
    if (file) addFile(slot.dataset.slot, file);
  });
}
// A link such as #sample=sales&view=list opens straight onto a sample.
const linked = new URLSearchParams(location.hash.slice(1));
const linkedButton = $(`[data-sample="${CSS.escape(linked.get('sample') ?? '')}"]`);
if (linkedButton) {
  loadSample(linkedButton.dataset.sample, linkedButton).then(() => {
    if (linked.get('view') === 'list') selectTab('list');
    const open = linked.get('open');
    if (open && state.result) {
      const f = state.result.figures.filter((x) => x.status === 'mismatch')[Number(open) - 1];
      if (f) { state.open = figKey(f); renderWorking(); }
    }
  });
}

// A file dropped anywhere else would make the browser open it instead.
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => e.preventDefault());

for (const t of $$('[role="tab"]')) {
  t.addEventListener('click', () => selectTab(t.dataset.view));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    selectTab(t.dataset.view === 'marked' ? 'list' : 'marked', true);
  });
}
