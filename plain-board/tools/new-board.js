// Make the kit yours.
//
// The demo is a help desk. Renaming it by hand means finding the name in four files
// and the storage key in a fifth, and missing one leaves a board called two things.
// This changes all of them at once, then rebuilds the pages.
//
//   node tools/new-board.js "Intake board" --team "Admissions" --key intake-board
//
// It renames. It does not touch the data: assets/js/shared/data.js is still yours to
// replace, and that is the real work of making this board about something else.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(file, 'utf8');

// ---------- what was asked for ----------
const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--team' && argv[argv.indexOf(a) - 1] !== '--key');
const flag = (word) => {
  const at = argv.indexOf('--' + word);
  return at === -1 ? null : argv[at + 1];
};

if (!name) {
  console.log('What is the board called?\n');
  console.log('  node tools/new-board.js "Intake board"');
  console.log('  node tools/new-board.js "Intake board" --team "Admissions" --key intake-board\n');
  console.log('  --team  the small word under the name in the menu (default: the board name)');
  console.log('  --key   the prefix for choices this board remembers (default: made from the name)');
  process.exit(1);
}

const team = flag('team') || name;
const key = flag('key') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- what it is called now ----------
const boardJs = read(path.join(root, 'assets/js/shared/board.js'));
const currentName = (boardJs.match(/name: '([^']+)'/) || [])[1];
const currentKey = (boardJs.match(/storageKey: '([^']+)'/) || [])[1];
const buildJs = read(path.join(root, 'tools/build-pages.js'));
const currentTeam = (buildJs.match(/const BOARD_TEAM = '([^']+)'/) || [])[1];

if (!currentName || !currentKey || !currentTeam) {
  console.error('Could not read the current name, team or storage key. Nothing changed.');
  process.exit(1);
}

if (currentName === name && currentTeam === team && currentKey === key) {
  console.log('Already called that. Nothing to do.');
  process.exit(0);
}

// ---------- the change ----------
const swap = (file, pairs) => {
  const full = path.join(root, file);
  let s = read(full);
  let hits = 0;
  pairs.forEach(([from, to]) => {
    const found = s.split(from).length - 1;
    hits += found;
    s = s.split(from).join(to);
  });
  fs.writeFileSync(full, s);
  return hits;
};

let changed = 0;
changed += swap('assets/js/shared/board.js', [
  [`name: '${currentName}'`, `name: '${name}'`],
  [`storageKey: '${currentKey}'`, `storageKey: '${key}'`]
]);
changed += swap('tools/build-pages.js', [
  [`const BOARD_NAME = '${currentName}'`, `const BOARD_NAME = '${name}'`],
  [`const BOARD_TEAM = '${currentTeam}'`, `const BOARD_TEAM = '${team}'`]
]);
changed += swap('assets/js/shared/session.js', [[`'${currentTeam}'`, `'${team}'`]]);
changed += swap('index.html', [[currentName, name], [`>${currentTeam}<`, `>${team}<`]]);

// ---------- rebuild, so the pages carry the new name ----------
execFileSync(process.execPath, [path.join(root, 'tools/build-pages.js')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(root, 'tools/stamp-assets.js')], { stdio: 'inherit' });

console.log(`\nThe board is now "${name}" (${team}), remembering choices under "${key}".`);
console.log(`${changed} name(s) replaced across five files, and the pages are rebuilt.\n`);
console.log('Still yours to do:');
console.log('  · assets/js/shared/data.js — the rows, the people, the groups. This is the real work.');
console.log('  · assets/js/shared/board.js — the menu, the search, and what the footer says.');
console.log('  · assets/img/logo.svg — the mark in the menu.');
console.log('  · README.md and DESIGN.md — they still describe a help desk.');
