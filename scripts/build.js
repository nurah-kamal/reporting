// Builds the static site into dist/: the page, the library (so the page runs
// the same code the tests check) and the sample files.

import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(new URL('site/', root), dist, { recursive: true });
cpSync(new URL('src/', root), new URL('lib/', dist), { recursive: true });
cpSync(new URL('samples/', root), new URL('samples/', dist), { recursive: true });

const samples = readdirSync(new URL('samples/', root));
console.log(`Built dist/ with ${samples.length} samples: ${samples.join(', ')}`);
