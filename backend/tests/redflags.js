/* Vital red-flag detection. Run: node tests/redflags.js
 *
 * Exists because "douleur thoracique intense et je respire plus" was answered as
 * an ordinary triage message whenever the classifier was rate-limited, timed
 * out, or running against a stub. The gateway now short-circuits on these
 * phrases before any model call.
 */
const { matchVitalRedFlag } = require('../src/core/lib/redFlags');

const MUST_FLAG = [
  // French
  ['douleur thoracique intense et je respire plus'],
  ["J'ai une douleur dans la poitrine"],
  ['je ne respire plus'],
  ['difficulté à respirer'],
  ['perte de connaissance hier'],
  ['hémorragie massive'],
  ['crise épileptique'],
  ['paralysie du visage'],
  ['je veux me tuer'],
  ['choking on food'],
  ['brûlure grave'],
  // English
  ['chest pain radiating to my arm'],
  ['pain in the chest'],
  ['I have a headache and chest pain'],
  ['severe bleeding from a wound'],
  ['stroke symptoms'],
  ['seizure at home'],
  ['I cannot breathe'],
  ['I want to kill myself'],
  // Arabic script
  ['عندي صعوبة في التنفس'],
  ['عندي ألم في الصدر'],
  ['فقدت الوعي'],
  ['نزيف غزير'],
  ['أريد قتل نفسي'],
  // Darija, arabizi (Latin)
  ['wher ma kanef nfes'],
  ['mcha nfes 3la 9rib'],
  ['kane9der 3la nfes'],
  ['msa7er nfes'],
  ['tsadder fi sadr'],
  ['fchdit dhakni'],
  ['mchiit dhakni'],
  ['nzif bzaf'],
  ['rqesse bzaf'],
  ['ana baghi n9tel rasi'],
  // Darija, Arabic script
  ['عندي الم في الصدر'],
];

// Must NOT flag. A false positive dials 150 at someone with a headache, which
// is its own kind of harm.
const MUST_NOT_FLAG = [
  'j\'ai mal à la tête depuis hier',
  'mrid 3ini men 3lih',
  'عندي صداع',
  'I have a headache and a fever',
  'as much as you want',
  'wher kan lli9a',
  'ⴰⵣⵓⵍ, ⵉⵅⴼ ⵉⵏⵓ',
  'douleur uterine',
  'mal de ventre',
  'wajd 3andi 3ayeb',
  'I am as sick as a dog',
  'diabète bien géré',
  'mal de dos depuis le ménage',
];

// Negations must cancel the flag.
const NEGATIONS = [
  ["I don't have chest pain", false],
  ['I do not have any chest pain', false],
  ['pas de douleur thoracique', false],
  ['je n\'ai pas de douleur dans la poitrine', false],
  ['aucune douleur à la poitrine', false],
  ['ما كاينش الم في الصدر', false],
  ['pain in the chest', true],
  ['douleur thoracique', true],
  ['I have chest pain', true],
];

let failures = 0;

for (const [message] of MUST_FLAG) {
  if (!matchVitalRedFlag(message)) {
    console.log(`FAIL (not flagged) "${message}"`);
    failures++;
  }
}

for (const message of MUST_NOT_FLAG) {
  const hit = matchVitalRedFlag(message);
  if (hit) {
    console.log(`FAIL (false positive) "${message}" -> ${hit}`);
    failures++;
  }
}

for (const [message, shouldFlag] of NEGATIONS) {
  const hit = matchVitalRedFlag(message);
  if (Boolean(hit) !== shouldFlag) {
    console.log(`FAIL (negation) "${message}" -> ${hit || 'no flag'}, expected ${shouldFlag ? 'flag' : 'no flag'}`);
    failures++;
  }
}

const total = MUST_FLAG.length + MUST_NOT_FLAG.length + NEGATIONS.length;
console.log(`\n${total - failures}/${total} red-flag cases passed`);
process.exit(failures === 0 ? 0 : 1);
