// Every tile carries an (i) saying what its figure does not prove. A tile without one
// is not finished — and until now that was a sentence in a document, which is the kind
// of rule that holds right up until somebody is in a hurry.
//
// This makes it a fact instead. build-pages.js runs it, so a tile with a figure and no
// caveat stops the build and names itself.
//
// It reads the page scripts rather than the built pages, because a tile is written in
// a script and a person adding one should be told there, not after deploying.

const fs = require('fs');
const path = require('path');

const PAGES = path.join(__dirname, '..', 'assets', 'js', 'pages');

// Keys at the top level of one object literal. Nested objects, such as watch and a
// verdict, are stepped over, so `watch: { unit: ... }` never looks like a key of the tile.
function topLevelKeys(text) {
  const keys = [];
  let depth = 0;
  let quote = null;
  let word = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quote) {
      if (char === '\\') { i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; word = ''; continue; }

    if (char === '{' || char === '[' || char === '(') { depth += 1; word = ''; continue; }
    if (char === '}' || char === ']' || char === ')') { depth -= 1; word = ''; continue; }

    if (depth === 0 && char === ':') { if (word.trim()) keys.push(word.trim()); word = ''; continue; }
    if (char === ',') { word = ''; continue; }
    word += char;
  }
  return keys;
}

// The object literal starting at the given '{', returned without its outer braces.
function objectAt(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\') { i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i };
    }
  }
  return null;
}

// Every object literal at the top level of an array literal.
function objectsInArray(text, open) {
  const found = [];
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\') { i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }

    if (char === '[') { depth += 1; continue; }
    if (char === ']') { depth -= 1; if (depth === 0) break; continue; }

    if (char === '{' && depth === 1) {
      const object = objectAt(text, i);
      if (!object) break;
      found.push({ body: object.body, at: i });
      i = object.end;
    }
  }
  return found;
}

// A copy of the file, the same length as the original, with the inside of every string,
// template literal and comment replaced by spaces. Brackets can then be counted without
// an apostrophe in a comment — "Today's chips" — being taken for the start of a string and
// swallowing everything after it. Every position still lines up with the original.
function maskedCode(text) {
  const out = text.split('');
  const blank = (at) => { out[at] = text[at] === '\n' ? '\n' : ' '; };
  let i = 0;

  while (i < text.length) {
    if (text[i] === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') { blank(i); i += 1; }
      continue;
    }
    if (text[i] === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2);
      const stop = close === -1 ? text.length : close + 2;
      while (i < stop) { blank(i); i += 1; }
      continue;
    }
    if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
      const quote = text[i];
      i += 1;
      while (i < text.length) {
        if (text[i] === '\\') { blank(i); blank(i + 1); i += 2; continue; }
        if (text[i] === quote) break;
        blank(i);
        i += 1;
      }
      i += 1;
      continue;
    }
    i += 1;
  }

  return out.join('');
}

// The ']' that closes the '[' at the given index of masked code, or -1.
function matchingBracket(masked, open) {
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === '[') depth += 1;
    else if (masked[i] === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const lineOf = (text, at) => text.slice(0, at).split('\n').length;

// A tile is an object that gives statTile a figure. Chart data has a label and a value
// too, which is why nothing here matches on those alone: an object only counts when it
// is handed to statTile, directly or through a map.
function tilesIn(text) {
  const tiles = [];

  // statTile({ ... })
  const direct = /statTile\(\s*\{/g;
  let match;
  while ((match = direct.exec(text))) {
    const open = text.indexOf('{', match.index);
    const object = objectAt(text, open);
    if (!object) continue;
    tiles.push({ body: object.body, at: open });
    direct.lastIndex = object.end;
  }

  // NAME.map(statTile), where NAME is an array declared in the same file
  const mapped = /([A-Za-z_$][\w$]*)\s*\.map\(\s*statTile\s*\)/g;
  while ((match = mapped.exec(text))) {
    const name = match[1];
    // const tiles = [ ... ] — the objects are written out
    const asArray = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*\\[').exec(text);
    if (asArray) {
      objectsInArray(text, text.indexOf('[', asArray.index)).forEach((object) => tiles.push(object));
      continue;
    }

    // const tiles = rows.map((row) => { ... return { ... }; }) — the tile is built per
    // row, so what has to be checked is whatever that callback returns.
    const asMap = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=').exec(text);
    if (!asMap) continue;
    const body = text.slice(asMap.index, mapped.lastIndex);
    const returns = /return\s*\{/g;
    let found;
    while ((found = returns.exec(body))) {
      const open = body.indexOf('{', found.index);
      const object = objectAt(body, open);
      if (!object) break;
      tiles.push({ body: object.body, at: asMap.index + open });
      returns.lastIndex = object.end;
    }
  }

  // [ { ... }, { ... } ].map(statTile) — written out in place, so there is no name to look
  // up. Every '[' is tested for a .map(statTile) just past its own closing bracket, read
  // off masked code so a comment or a string cannot throw the count off.
  const masked = maskedCode(text);
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] !== '[') continue;

    const close = matchingBracket(masked, i);
    if (close === -1) continue;
    if (!/^\s*\.map\(\s*statTile\s*\)/.test(masked.slice(close + 1, close + 32))) continue;

    // Positions come from the masked copy, the text from the original.
    objectsInArray(masked, i).forEach((object) => {
      tiles.push({ body: text.slice(object.at + 1, object.at + 1 + object.body.length), at: object.at });
    });
    i = close;
  }

  return tiles;
}

function check() {
  const problems = [];
  let counted = 0;

  fs.readdirSync(PAGES).filter((name) => name.endsWith('.js')).forEach((name) => {
    const file = path.join(PAGES, name);
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

    tilesIn(text).forEach((tile) => {
      const keys = topLevelKeys(tile.body);
      if (!keys.includes('value')) return;   // not a figure; nothing to caveat
      counted += 1;
      if (keys.includes('about')) return;

      const label = (tile.body.match(/label:\s*'([^']*)'/) || [, 'an unnamed tile'])[1];
      problems.push(`${name}:${lineOf(text, tile.at)}  ${label}`);
    });
  });

  return { counted, problems };
}

const { counted, problems } = check();

if (problems.length) {
  console.error(`\n${problems.length} of ${counted} tiles carry a figure with no (i) saying what it does not prove:\n`);
  problems.forEach((problem) => console.error('  ' + problem));
  console.error('\nEvery tile needs an `about`. It is the rule this board is built on: a figure');
  console.error('that cannot say what it does not prove has no business being on the page.\n');
  process.exit(1);
}

if (!counted) {
  // Nothing found is not the same as nothing wrong. A board whose pages build tiles some
  // other way needs saying so out loud, or this prints a pass over an unread board.
  console.log('no tiles found: nothing on these pages is built with statTile, so there was nothing to check');
  process.exit(0);
}

console.log(`tiles: ${counted}, every one carrying an (i)`);
