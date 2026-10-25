// Your own rows, instead of the ones this kit ships with.
//
// This runs before data.js, because every figure on the board is computed from the row
// list once, at parse time — which is exactly what makes it impossible for a headline
// figure and a chart to disagree. So the rows have to be decided before anything is
// derived from them, and that means a file which arrives later is stored and picked up
// on the next load rather than swapped in mid-page.
//
// What it will and will not do, in full:
//
//   · A file you choose or drop is read in this browser by the File API. It is not
//     uploaded. There is no server to upload it to.
//   · It is kept in this browser's storage so the board still shows it tomorrow. It is
//     not shared, not synced, and clearing site data removes it.
//   · A file sitting next to the board on the same address can be fetched — see
//     BOARD.dataFile. A file on another address cannot: the content security policy on
//     every page allows connections to 'self' only. That is a deliberate part of this
//     kit, and widening it is a decision to make on purpose, not by accident.

const SOURCE_KEY = (() => {
  // board.js has not run yet, so the board names itself by the folder it is served
  // from. Four boards on one address must not read each other's data.
  const folder = location.pathname.split('/').filter(Boolean)[0] || 'board';
  return folder + ':data';
})();

// ---------- reading a file ----------

// A CSV parser, because a CSV is the format a report comes out of a system in, and
// splitting on commas is wrong the moment a note contains one.
function parseDelimited(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  const source = text.replace(/^﻿/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { value += '"'; i += 1; }
        else quoted = false;
      } else value += char;
      continue;
    }

    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(value); value = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(value); rows.push(row); row = []; value = ''; continue; }
    value += char;
  }
  row.push(value);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

// The columns this board understands, and what else they are commonly called. A report
// is exported with whatever heading the system that made it uses, so the board meets it
// part of the way rather than making somebody rename columns by hand.
const COLUMNS = {
  id: ['id', 'ref', 'reference', 'ticket', 'number', 'case'],
  product: ['product', 'group', 'category', 'type', 'service', 'queue'],
  channel: ['channel', 'source', 'via', 'received by'],
  person: ['person', 'owner', 'assignee', 'assigned to', 'handler', 'agent'],
  arrived: ['arrived', 'date', 'opened', 'created', 'received', 'raised'],
  days: ['days', 'days ago', 'age'],
  reply: ['reply', 'reply hours', 'hours to reply', 'first reply hours', 'response hours'],
  replied: ['replied', 'first reply', 'responded', 'answered at'],
  state: ['state', 'status'],
  note: ['note', 'notes', 'comment', 'summary', 'detail', 'description']
};

const tidyHeading = (text) => String(text || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

function mapColumns(headings) {
  const tidy = headings.map(tidyHeading);
  const found = {};
  const used = new Set();

  Object.entries(COLUMNS).forEach(([field, names]) => {
    const at = tidy.findIndex((heading, index) => !used.has(index) && names.includes(heading));
    if (at !== -1) { found[field] = at; used.add(at); }
  });

  const ignored = headings.filter((heading, index) => !used.has(index) && String(heading).trim());
  return { found, ignored };
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Dates arrive written a dozen ways. Everything unambiguous is accepted; anything that
// could be read two ways is refused rather than guessed at, because guessing 03/04 wrong
// moves a row by a month.
function readDate(text) {
  const given = String(text || '').trim();
  if (!given) return null;

  const iso = given.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = given.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (dmy) {
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    // Day-first is the South African and British order. A first number above 12 proves
    // it; anything else is ambiguous and is refused with that said out loud.
    if (first > 12) return new Date(Number(dmy[3]), second - 1, first);
    if (second > 12) return new Date(Number(dmy[3]), first - 1, second);
    return 'ambiguous';
  }

  const parsed = new Date(given);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const STATES = { open: 'open', answered: 'answered', closed: 'closed', resolved: 'closed', done: 'closed', new: 'open', waiting: 'open' };

// Turn a file into the rows this board reads, and a plain account of everything it
// could not use. The account matters as much as the rows: a board that quietly drops a
// tenth of a report is worse than one that refuses it.
function readSource(text, fileName) {
  const problems = [];
  const today = startOfDay(new Date());
  let rows = [];
  let ignored = [];

  const trimmed = text.trim();
  if (!trimmed) return { error: 'That file is empty.' };

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    let parsed;
    try { parsed = JSON.parse(trimmed); } catch (error) {
      return { error: 'That file looks like JSON but could not be read: ' + error.message };
    }
    const list = Array.isArray(parsed) ? parsed : parsed.rows;
    if (!Array.isArray(list)) return { error: 'JSON has to be a list of rows, or an object with a "rows" list in it.' };

    // Checked as closely as a CSV. A list of the wrong objects is a wrong file, and
    // finding that out on the Trends page is finding out too late.
    list.forEach((given, index) => {
      const at = index + 1;
      if (!given || typeof given !== 'object') return problems.push({ line: at, why: 'it is not a row' });

      const id = String(given.id || '').trim();
      if (!id) return problems.push({ line: at, why: 'no id' });

      let days = null;
      if (given.days !== undefined && given.days !== null && given.days !== '') {
        const number = Number(given.days);
        if (!Number.isFinite(number) || number < 0) return problems.push({ line: at, why: 'days is not a number of days' });
        days = Math.floor(number);
      } else {
        const when = readDate(given.arrived || given.date);
        if (when === 'ambiguous') return problems.push({ line: at, why: 'the date could be read two ways' });
        if (!when) return problems.push({ line: at, why: 'no days and no date that could be read' });
        days = Math.round((today - startOfDay(when)) / 86400000);
        if (days < 0) return problems.push({ line: at, why: 'the date is in the future' });
      }

      let reply = null;
      if (given.reply !== undefined && given.reply !== null && given.reply !== '') {
        const number = Number(given.reply);
        if (!Number.isFinite(number) || number < 0) return problems.push({ line: at, why: 'the reply time is not a number of hours' });
        reply = number;
      }

      rows.push({
        id,
        product: String(given.product || given.group || '').trim() || 'Ungrouped',
        channel: String(given.channel || '').trim() || 'Not recorded',
        person: String(given.person || given.owner || '').trim() || 'Nobody recorded',
        days,
        reply,
        state: STATES[String(given.state || '').toLowerCase()] || (reply === null ? 'open' : 'answered'),
        note: String(given.note || '')
      });
    });
  } else {
    const table = parseDelimited(trimmed);
    if (table.length < 2) return { error: 'That file has a heading row and nothing under it.' };

    const { found, ignored: spare } = mapColumns(table[0]);
    ignored = spare;

    if (found.id === undefined) {
      return { error: 'No column in that file names each row. One called id, ref, reference, ticket, number or case is needed, so a row can be pointed at.' };
    }
    if (found.arrived === undefined && found.days === undefined) {
      return { error: 'No column says when a row arrived. One called arrived, date, opened, created, received or raised is needed — or days, counting back from today.' };
    }

    const pick = (line, field) => (found[field] === undefined ? '' : String(line[found[field]] || '').trim());

    table.slice(1).forEach((line, index) => {
      const number = index + 2;
      if (line.every((cell) => !String(cell).trim())) return;

      const id = pick(line, 'id');
      if (!id) return problems.push({ line: number, why: 'no id' });

      let days = null;
      if (found.days !== undefined && pick(line, 'days') !== '') {
        const given = Number(pick(line, 'days'));
        if (!Number.isFinite(given) || given < 0) return problems.push({ line: number, why: 'days is not a number of days' });
        days = Math.floor(given);
      } else {
        const when = readDate(pick(line, 'arrived'));
        if (when === 'ambiguous') return problems.push({ line: number, why: 'the date could be read two ways' });
        if (!when) return problems.push({ line: number, why: 'the date could not be read' });
        days = Math.round((today - startOfDay(when)) / 86400000);
        if (days < 0) return problems.push({ line: number, why: 'the date is in the future' });
      }

      let reply = null;
      if (found.reply !== undefined && pick(line, 'reply') !== '') {
        const given = Number(pick(line, 'reply'));
        if (!Number.isFinite(given) || given < 0) return problems.push({ line: number, why: 'the reply time is not a number of hours' });
        reply = given;
      } else if (found.replied !== undefined && pick(line, 'replied')) {
        const when = readDate(pick(line, 'replied'));
        if (when && when !== 'ambiguous') {
          const arrived = found.arrived !== undefined ? readDate(pick(line, 'arrived')) : null;
          if (arrived && arrived !== 'ambiguous') reply = Math.max(0, Math.round((when - arrived) / 3600000));
        }
      }

      const state = STATES[pick(line, 'state').toLowerCase()] || (reply === null ? 'open' : 'answered');

      rows.push({
        id,
        product: pick(line, 'product') || 'Ungrouped',
        channel: pick(line, 'channel') || 'Not recorded',
        person: pick(line, 'person') || 'Nobody recorded',
        days,
        reply,
        state,
        note: pick(line, 'note')
      });
    });
  }

  if (!rows.length) return { error: 'Nothing in that file could be read as a row. ' + (problems.length ? problems.length + ' line(s) were tried and refused.' : '') };

  // A group key has to be a key, not a label, because the board puts it in the address
  // bar. The label is kept for reading.
  const groups = {};
  const keyFor = (label) => String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ungrouped';
  rows.forEach((row) => {
    const key = keyFor(row.product);
    if (!groups[key]) groups[key] = row.product;
    row.product = key;
  });

  const newest = Math.min(...rows.map((row) => row.days));
  const oldest = Math.max(...rows.map((row) => row.days));

  return {
    rows,
    groups,
    ignored,
    problems,
    newest,
    oldest,
    // A path is how the board found it; a name is what to call it on screen.
    name: String(fileName || '').split('/').pop(),
    read: new Date().toISOString()
  };
}

// ---------- keeping it ----------

const BoardSource = {
  stored() {
    try {
      const saved = JSON.parse(localStorage.getItem(SOURCE_KEY) || 'null');
      return saved && Array.isArray(saved.rows) && saved.rows.length ? saved : null;
    } catch (error) {
      return null;
    }
  },

  keep(source) {
    try {
      localStorage.setItem(SOURCE_KEY, JSON.stringify(source));
      return { kept: true };
    } catch (error) {
      return { kept: false, why: 'This browser would not keep a file that size. It holds about 5MB per site. Export a shorter period, or drop the columns the board does not read.' };
    }
  },

  forget() {
    try { localStorage.removeItem(SOURCE_KEY); } catch (error) { /* nothing to undo */ }
  }
};

// Decided here, before anything is derived from it.
const BOARD_SOURCE = BoardSource.stored();
