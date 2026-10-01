/**
 * Key-parity check across ALL locales (fr, en, ar, ary, tzm).
 *
 * Run:  npm run i18n:check
 *
 * A key missing from one dictionary falls back through its chain
 * (ary→ar, tzm→fr, all→en) — which for a medical product means a patient
 * may see a string in the wrong language without anyone noticing. Checked
 * here rather than by eye. Placeholders must also match en (the reference).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LOCALES = ['fr', 'en', 'ar', 'ary', 'tzm'];

const load = (name) => {
  const path = fileURLToPath(new URL(`./locales/${name}.js`, import.meta.url));
  const source = readFileSync(path, 'utf8')
    .replace(/^export default/m, 'return');
  return new Function(source)();
};

const dicts = Object.fromEntries(LOCALES.map((l) => [l, load(l)]));
const en = dicts.en;

let bad = 0;

const report = (label, items, hint) => {
  if (items.length === 0) return;
  bad += items.length;
  console.log(`\n${label} (${items.length}):`);
  for (const k of items) console.log(`  - ${k}`);
  if (hint) console.log(`  → ${hint}`);
};

for (const l of LOCALES) {
  if (l === 'en') continue;
  const missing = Object.keys(en).filter((k) => !(k in dicts[l]));
  report(`missing from ${l}.js`, missing, 'translate the EN string');
}

const extra = [];
for (const l of LOCALES) {
  for (const k of Object.keys(dicts[l])) {
    if (!(k in en)) extra.push(`${l}:${k}`);
  }
}
report('keys absent from en.js (reference)', extra, 'add the EN string first');

const placeholders = Object.keys(en).filter((k) => {
  const ref = (en[k] || '').match(/\{(\w+)\}/g)?.sort().join(',') || '';
  return LOCALES.some((l) => {
    const v = dicts[l][k];
    if (v === undefined) return false;
    const ph = (v || '').match(/\{(\w+)\}/g)?.sort().join(',') || '';
    return ph !== ref;
  });
});
report('placeholder mismatch vs en', placeholders, 'keep every {var} identical');

// Also catches a key added twice, which silently keeps the last value.
const dupes = (dict) => {
  const seen = new Set();
  return Object.keys(dict).filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
};
for (const l of LOCALES) report(`duplicated keys (${l})`, dupes(dicts[l]));

console.log(`\n${LOCALES.map((l) => `${l}: ${Object.keys(dicts[l]).length}`).join(', ')}`);

if (bad === 0) {
  console.log('parity OK — same keys and same placeholders in all dictionaries');
  process.exit(0);
}
process.exit(1);
