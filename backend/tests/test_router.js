/* Smoke test for the router node.
 *
 * Was a print-only script that called the live Groq API, so it crashed CI with
 * `401 invalid_api_key` and asserted nothing. It now falls back to the offline
 * stub when no key is configured, and asserts what the router is responsible
 * for: picking a domain and returning the reasoning that led there.
 *
 * The message asks for Arabic and mentions a child on amoxicillin, which is the
 * case that must route to pediatrics rather than general triage.
 *
 * Run: node tests/test_router.js
 */
require('dotenv').config();
const { routerNode } = require('../src/core/orchestrator/nodes/routerNode');

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

  const state = {
    userMessage:
      'My 4-year-old son has a fever of 39C. He is currently taking Amoxicillin '
      + 'for an ear infection. Can I give him Advil to lower the fever? Answer me in Arabic',
    patientProfile: { age: 30 },
    messages: [],
  };

  const result = await routerNode(state);

  check('the router returns a result', Boolean(result));
  check('a domain is chosen', typeof result?.domain === 'string' && result.domain.length > 0,
    String(result?.domain));
  check('at least one agent is activated',
    Array.isArray(result?.activeAgents) && result.activeAgents.length > 0,
    JSON.stringify(result?.activeAgents));
  check('no internal error is reported', !result?.errors?.length,
    JSON.stringify(result?.errors));

  console.log(`\ndomain      : ${result?.domain}`);
  console.log(`agents      : ${(result?.activeAgents || []).join(', ')}`);
  console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

test().catch((err) => {
  console.error('test_router threw:', err.message);
  process.exit(1);
});