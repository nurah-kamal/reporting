// Cheap checks that need no install: every script parses, the JSON is valid,
// and every relative link in the Markdown docs points at a file that exists.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const skip = new Set(['.git', 'node_modules', 'dist', '.impeccable']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);
const problems = [];

for (const f of files.filter((f) => f.endsWith('.js'))) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    problems.push(`${relative(root, f)} does not parse: ${e.stderr}`);
  }
}

for (const f of files.filter((f) => f.endsWith('.json'))) {
  try { JSON.parse(readFileSync(f, 'utf8')); } catch (e) { problems.push(`${relative(root, f)}: ${e.message}`); }
}

for (const f of files.filter((f) => f.endsWith('.md'))) {
  const md = readFileSync(f, 'utf8');
  for (const [, target] of md.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = join(dirname(f), target.split('#')[0]);
    if (!existsSync(path)) problems.push(`${relative(root, f)} links to missing ${target}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Checked ${files.length} files: scripts parse, JSON is valid, doc links resolve.`);
