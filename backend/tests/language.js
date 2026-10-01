/* Reply-language detection. Run: node tests/language.js
 *
 * The case that motivated the Latin-script scoring: on a Moroccan phone the
 * Latin keyboard is the default, so "mrid ana" (I am cold) is an ordinary
 * message. Classifying it from the profile default replied in Modern Standard
 * Arabic to a patient who does not read it.
 */
const { detectReplyLanguage } = require('../src/core/lib/language');

const cases = [
  // Latin-script Darija (arabizi) — the regression this file exists for
  ['mrid ana', 'Arabic', 'Moroccan Darija'],
  ['mrid w3t', 'Arabic', 'Moroccan Darija'],
  ['wach kayn chi더', 'Arabic', 'Moroccan Darija'],
  ['3andi sou9', 'Arabic', 'Moroccan Darija'],
  ['bghit n3ref wach 3and 3ndi', 'French', 'Moroccan Darija'],
  ['ghadi n9der l3dine', 'French', 'Moroccan Darija'],
  ['sara7a w l3diya mrhba', 'Arabic', 'Moroccan Darija'],
  // French must NOT be swallowed
  ['Jai mal a la tete depuis hier', 'Arabic', 'French'],
  ['je me sens faible et j ai de la fievre', 'Moroccan Darija', 'French'],
  ["j'ai mal, wach c'est grave ?", 'Arabic', 'Moroccan Darija'],
  ['douleur thoracique et je respire mal', 'Arabic', 'French'],
  // English
  ['I have a headache and a fever', 'French', 'English'],
  ['my head hurts since yesterday', 'English', 'English'],
  // Arabic script
  ['عندي صداع شديد', 'Arabic', 'Moroccan Darija'],
  ['عندي صداع شديد', 'Moroccan Darija', 'Moroccan Darija'],
  ['لدي لا أستطيع التنفس', 'Moroccan Darija', 'Arabic'],
  ['عندي الم في الصدر', 'Moroccan Darija', 'Moroccan Darija'],
  // Tifinagh
  ['ⴰⵣⵓⵍ, ⵉⵅⴼ ⵉⵏⵓ', 'French', 'Tamazight'],
  // Edge cases
  ['', 'Arabic', 'French'],
  ['   ', 'Arabic', 'French'],
  ['hello', 'Moroccan Darija', 'Moroccan Darija'],
];

let pass = 0;
const failures = [];
for (const [msg, profile, expected] of cases) {
  const got = detectReplyLanguage(msg, profile);
  if (got === expected) pass++;
  else failures.push(`  "${msg}" (profile: ${profile}) -> ${got}, expected ${expected}`);
}

console.log(`${pass}/${cases.length} language detection cases passed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(f);
  process.exit(1);
}
