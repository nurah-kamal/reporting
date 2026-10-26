import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (name) => readFileSync(new URL(`../apps-script/${name}`, import.meta.url), 'utf8');

// Runs .gs files the way Apps Script does: as plain scripts sharing one global
// scope. `globals` stands in for SpreadsheetApp and the other services.
export function load(files, globals = {}) {
  const context = vm.createContext({ ...globals });
  for (const file of files) vm.runInContext(read(file), context, { filename: file });
  return context;
}

export { sheetValues } from '../scripts/csv.js';
