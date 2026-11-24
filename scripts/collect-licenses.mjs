// Collects the license texts of everything shipped inside the app (runtime
// dependencies, their dependencies, the fonts and the offline-cache code)
// into public/licenses.txt, shown on the app's Licenses page.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Workbox code is generated into the service worker (offline support).
const extra = ['workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies'];
const queue = [...Object.keys(pkg.dependencies ?? {}), ...extra];
const seen = new Map();

while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  const dir = join(root, 'node_modules', name);
  if (!existsSync(join(dir, 'package.json'))) continue;
  const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f));
  seen.set(name, {
    name,
    version: p.version,
    license: typeof p.license === 'string' ? p.license : (p.license?.type ?? 'see text'),
    text: file ? readFileSync(join(dir, file), 'utf8').trim() : `License: ${p.license ?? 'unknown'}`,
  });
  queue.push(...Object.keys(p.dependencies ?? {}));
}

const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
const out = [
  'Third-party software and fonts used in Legion Companion',
  '',
  ...entries.map((e) => `- ${e.name} ${e.version} (${e.license})`),
  '',
  ...entries.map((e) => `${'='.repeat(70)}\n${e.name} ${e.version} (${e.license})\n${'='.repeat(70)}\n\n${e.text}\n`),
].join('\n');
writeFileSync(join(root, 'public', 'licenses.txt'), out);
console.log(`licenses.txt: ${entries.length} packages`);
