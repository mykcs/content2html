import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export function messageStyles() {
  return ['tokens.css', 'message.css'].map(file => readFileSync(path.join(root, 'src/styles', file), 'utf8').trim()).join('\n\n');
}
export function syncMessageStyles({ check = false } = {}) {
  const file = path.join(root, 'public/404.html');
  const original = readFileSync(file, 'utf8');
  const region = /<!-- BEGIN SHARED MESSAGE STYLES -->[\s\S]*?<!-- END SHARED MESSAGE STYLES -->/;
  if (!region.test(original)) throw new Error('Missing generated 404 style region');
  const next = original.replace(region, `<!-- BEGIN SHARED MESSAGE STYLES -->\n<style>\n${messageStyles()}\n</style>\n<!-- END SHARED MESSAGE STYLES -->`);
  if (check && original !== next) throw new Error('public/404.html styles are stale; run npm run styles:sync');
  if (!check && original !== next) writeFileSync(file, next);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) syncMessageStyles({ check: process.argv.includes('--check') });
