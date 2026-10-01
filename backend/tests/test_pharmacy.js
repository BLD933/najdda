/* Smoke test for the medication safety service.
 *
 * Was a print-only script that called the live Groq API, so it crashed CI with
 * `401 invalid_api_key` and asserted nothing. It now:
 *   - falls back to the offline stub when no API key is configured, so it runs
 *     anywhere
 *   - asserts the response shape, which is what actually matters here
 *   - reports the FDA label fetch separately: the service must pass documented
 *     interaction text to the model, and a silent zero there is the bug that
 *     made interactions vanish once the RxNav API was retired upstream
 *
 * Run: node tests/test_pharmacy.js
 */
require('dotenv').config();
const DrugSafetyService = require('../src/core/services/DrugSafetyService');

const usingMock = !process.env.LLM_API_KEY;
if (usingMock) process.env.LLM_MOCK = 'true';

let failures = 0;
const check = (label, ok, detail) => {
  if (ok) console.log(`OK   ${label}`);
  else { console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); failures++; }
};

async function test() {
  if (usingMock) {
    console.log('[info] no LLM_API_KEY — running against the offline stub\n');
  }

  const medications = ['Aspirin', 'Warfarin'];
  const result = await DrugSafetyService.checkInteraction({
    message: 'I am taking Aspirin and Warfarin together. Is this safe?',
    medications,
  });

  check('the call resolves', Boolean(result));
  check('a status is returned', typeof result.status === 'string', String(result.status));
  check('advice is an array', Array.isArray(result.advice), typeof result.advice);
  check('both drugs were checked',
    Array.isArray(result.meta?.medicationsChecked)
      && result.meta.medicationsChecked.length === medications.length,
    JSON.stringify(result.meta?.medicationsChecked));
  check('an interaction block was built for two drugs',
    Number(result.meta?.interactionsFound) > 0,
    `interactionsFound=${result.meta?.interactionsFound}`);

  // Informational, not a failure: OpenFDA rate-limits anonymous callers, and a
  // flaky network must not fail the build. The point is that the data reaches
  // the prompt whenever the fetch succeeds.
  const { fdaWarnings, interactions } = await DrugSafetyService.gatherDrugData(medications);
  if (fdaWarnings.length > 0) {
    console.log(`OK   FDA labels reached the prompt (${fdaWarnings.length} drug(s))`);
  } else {
    console.log('[warn] no FDA label returned — OpenFDA rate limit or network?');
  }
  const documented = (interactions[0]?.sources || []).length;
  if (documented > 0) {
    console.log(`OK   interaction text reached the prompt for ${documented} drug(s)`);
  } else {
    console.log('[warn] no interaction section found — cannot assert the prompt carries it');
  }

  console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

test().catch((err) => {
  console.error('test_pharmacy threw:', err.message);
  process.exit(1);
});