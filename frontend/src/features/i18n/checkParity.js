/**
 * Key-parity check between fr.js and en.js.
 *
 * Run:  npm run i18n:check
 *
 * A key that exists in one dictionary and not the other means the other
 * language silently falls back — which for a bilingual medical product means a
 * French patient sees an English string, or the reverse. That is exactly the
 * kind of thing that reaches production unnoticed, so it is checked here
 * rather than by eye.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const load = (name) => {
  const path = fileURLToPath(new URL(`./locales/${name}.js`, import.meta.url));
  const source = readFileSync(path, 'utf8')
    .replace(/^export default/m, 'return');
  return new Function(source)();
};

const fr = load('fr');
const en = load('en');

const frKeys = Object.keys(fr);
const enKeys = Object.keys(en);

const missingInFr = enKeys.filter((k) => !(k in fr));
const missingInEn = frKeys.filter((k) => !(k in en));

// Also catches a key added twice, which silently keeps the last value.
const dupes = (dict) => {
  const seen = new Set();
  return Object.keys(dict).filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
};

const placeholders = (dict) =>
  Object.entries(dict)
    .filter(([k, v]) => {
      const enPh = (en[k] || '').match(/\{(\w+)\}/g)?.sort().join(',') || '';
      const frPh = (v || '').match(/\{(\w+)\}/g)?.sort().join(',') || '';
      return enPh !== frPh;
    })
    .map(([k]) => k);

let bad = 0;

const report = (label, items, hint) => {
  if (items.length === 0) return;
  bad += items.length;
  console.log(`\n${label} (${items.length}):`);
  for (const k of items) console.log(`  - ${k}`);
  if (hint) console.log(`  → ${hint}`);
};

report('missing from fr.js', missingInFr, 'copy the EN string and translate it');
report('missing from en.js', missingInEn, 'add the EN string');
report('placeholder mismatch between fr and en', placeholders({ ...en, ...fr }));
report('duplicated keys (fr)', dupes(fr));
report('duplicated keys (en)', dupes(en));

console.log(`\nfr: ${frKeys.length} keys, en: ${enKeys.length} keys`);

if (bad === 0) {
  console.log('parity OK — same keys and same placeholders in both dictionaries');
  process.exit(0);
}
process.exit(1);
