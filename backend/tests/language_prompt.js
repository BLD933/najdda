/* End-to-end check of the reply-language path, without a database.
 *
 * Covers the two things the chat depends on that no route test reaches:
 *   1. detectReplyLanguage() on a real patient message
 *   2. the compact profile the LLM actually receives, which is where the
 *      detected language has to end up or the agent ignores it
 *
 * Run: node tests/language_prompt.js
 */
const { detectReplyLanguage } = require('../src/core/lib/language');
const llmClient = require('../src/core/lib/LlmClient');

const PROFILE = {
  fullName: 'Sami',
  gender: 'Male',
  dateOfBirth: '1990-05-12',
  weight: 75,
  height: 178,
  preferredLanguage: 'Arabic',
  chronicDiseases: 'None',
  medications: [],
  drugAllergies: 'None',
  isPregnant: false,
};

// What the patient actually types, with the profile language left at the
// seeded default — the case that used to answer in Modern Standard Arabic.
const MESSAGES = [
  ['mrid ana', 'Moroccan Darija'],
  ['عندي صداع', 'Moroccan Darija'],
  ['Jai mal a la tete', 'French'],
  ['I have a fever', 'English'],
  ['ⴰⵣⵓⵍ', 'Tamazight'],
];

let failures = 0;
for (const [message, expected] of MESSAGES) {
  const replyLanguage = detectReplyLanguage(message, PROFILE.preferredLanguage);
  const prompt = llmClient.formatCompactProfile({ ...PROFILE, replyLanguage });
  const inPrompt = prompt.includes(`ReplyLang: ${expected}`);

  const ok = replyLanguage === expected && inPrompt;
  if (!ok) failures++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} "${message}" -> ${replyLanguage} (expected ${expected})` +
      `${inPrompt ? '' : ' | NOT forwarded to the prompt'}`
  );
}

console.log(`\n${MESSAGES.length - failures}/${MESSAGES.length} messages routed to the right language`);
process.exit(failures === 0 ? 0 : 1);
