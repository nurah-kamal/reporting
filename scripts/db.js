// Loads the calendar and the sample requests into an in-memory SQLite database
// (Node's built-in node:sqlite, so there is nothing to install).

import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { addDays, weekday } from '../src/dates.js';
import { holidayOn, isWorkingDay } from '../src/index.js';

const root = new URL('../', import.meta.url);
const CALENDAR_FROM = '2022-12-01';
const CALENDAR_TO = '2026-12-31';

export function openDatabase(csv = readFileSync(new URL('data/sample/requests.csv', root), 'utf8')) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('sql/schema.sql', root), 'utf8'));

  const addDay = db.prepare('INSERT INTO calendar VALUES (?, ?, ?, ?, ?, ?)');
  const addRequest = db.prepare('INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  let index = 0;
  for (let d = CALENDAR_FROM; d <= CALENDAR_TO; d = addDays(d, 1)) {
    const working = isWorkingDay(d);
    if (working) index += 1;
    const h = holidayOn(d);
    addDay.run(d, weekday(d), h?.name ?? null, h?.kind ?? null, working ? 1 : 0, index);
  }
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  if (header !== 'request_id,opened_on,closed_on,channel,category,target_working_days') {
    throw new Error(`Unexpected columns: ${header}`);
  }
  for (const line of lines) {
    const [id, opened, closed, channel, category, target] = line.split(',');
    addRequest.run(id, opened, closed || null, channel, category, Number(target));
  }
  db.exec('COMMIT');
  return db;
}

// Each file in sql/questions is one question; the file name is its key.
export function questions() {
  const dir = new URL('sql/questions/', root);
  return readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((file) => {
    const sql = readFileSync(new URL(file, dir), 'utf8');
    const title = sql.split('\n').filter((l) => l.startsWith('--')).map((l) => l.slice(2).trim()).join(' ');
    return { key: file.replace(/^\d+_|\.sql$/g, ''), file, title, sql };
  });
}

export function runAll(db) {
  return Object.fromEntries(questions().map((q) => [q.key, {
    file: `sql/questions/${q.file}`,
    question: q.title,
    rows: db.prepare(q.sql).all().map((r) => ({ ...r })),
  }]));
}
