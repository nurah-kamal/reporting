// Builds the static site into dist/: the page, the library (so the calculator
// runs the same code the tests check) and data/report.json from the SQL.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { openDatabase, runAll } from './db.js';
import { DECLARED, VERIFIED_FROM, VERIFIED_TO } from '../src/index.js';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);

rmSync(dist, { recursive: true, force: true });
mkdirSync(new URL('data/', dist), { recursive: true });
cpSync(new URL('site/', root), dist, { recursive: true });
cpSync(new URL('src/', root), new URL('lib/', dist), { recursive: true });

const db = openDatabase();
const range = db.prepare('SELECT min(opened_on) AS first, max(opened_on) AS last, count(*) AS requests FROM requests').get();
const report = {
  data: { ...range, source: 'data/sample/requests.csv (synthetic)' },
  holidays: { verifiedFrom: VERIFIED_FROM, verifiedTo: VERIFIED_TO, declared: DECLARED.length },
  results: runAll(db),
};
writeFileSync(new URL('data/report.json', dist), JSON.stringify(report, null, 1));
console.log(`Built dist/ from ${range.requests} requests (${range.first} to ${range.last})`);
