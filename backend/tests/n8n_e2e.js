/* End-to-end check of the backend → n8n emergency webhook.
 *
 * Starts the stand-in receiver, points the emergency middleware at it, fires a
 * vital-danger message and asserts the three things the product depends on:
 *   1. the alert is delivered, with the location and the medical profile
 *   2. it carries the shared secret, and a wrong one is rejected
 *   3. the patient still gets their emergency response even if the webhook is
 *      down — a WhatsApp outage must never delay a 150 call
 *
 * Run: node tests/n8n_e2e.js
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { notifyEmergencyWorkflow } = require('../src/api/middlewares/emergencyMiddleware');

const PORT = 5099;
const API_PORT = 5199;
const URL = `http://127.0.0.1:${PORT}/emergency-alert`;
const API = `http://127.0.0.1:${API_PORT}`;
const SECRET = 'e2e-secret';

let failures = 0;
const check = (label, ok, detail) => {
  if (ok) console.log(`OK   ${label}`);
  else { console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); failures++; }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = async (url, body, headers = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const getJson = async (url) => (await fetch(url)).json();

/** Registers a fresh patient and returns their bearer token. */
async function makePatient(name) {
  const email = `e2e-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.ma`;
  await post(`${API}/api/auth/register`, { fullName: name, email, password: 'motdepasse123' });
  const { json } = await post(`${API}/api/auth/login`, { email, password: 'motdepasse123' });
  return json.token;
}

(async () => {
  const receiver = spawn(
    process.execPath,
    [path.join(__dirname, 'webhook_receiver.js'), String(PORT)],
    { env: { ...process.env, N8N_WEBHOOK_SECRET: SECRET }, stdio: 'ignore' },
  );

  const api = spawn(
    process.execPath,
    [path.join(__dirname, '..', 'src', 'server.js')],
    {
      env: {
        ...process.env,
        N8N_EMERGENCY_WEBHOOK_URL: URL,
        N8N_WEBHOOK_SECRET: SECRET,
        PORT: String(API_PORT),
        LLM_MOCK: 'true',
        USE_PGLITE: 'true',
      },
      stdio: 'ignore',
    },
  );

  process.on('exit', () => { receiver.kill(); api.kill(); });

  for (let i = 0; i < 50; i += 1) {
    try {
      const h = await fetch(`${API}/api/health`);
      if (h.ok) break;
    } catch { /* not listening yet */ }
    await sleep(300);
  }
  await sleep(700);

  // ── Setup: a patient the middleware can attach a profile to ──────────────
  const token = await makePatient('alert');
  check('auth works against the embedded DB', Boolean(token));

  await fetch(`${API}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      phoneNumber: '+212600000000', dateOfBirth: '1990-01-01', gender: 'Male',
      bloodType: 'O+', city: 'Fes', country: 'Morocco', preferredLanguage: 'French',
      chronicDiseases: 'Hypertension', weight: 75, height: 178,
      latitude: 34.0331, longitude: -5.0003,
      emergencyContacts: [{ name: 'Yasmine', relationship: 'Sister', phone: '+212600000001' }],
    }),
  });

  await fetch(`http://127.0.0.1:${PORT}/__reset`);

  // ── 1. The alert is delivered ───────────────────────────────────────────
  const emergency = await post(
    `${API}/api/orchestrator/chat`,
    { message: 'douleur thoracique intense et je respire plus' },
    { Authorization: `Bearer ${token}` },
  );

  check('emergency response returned to the patient',
    emergency.status === 200 && emergency.json.isEmergency === true,
    `status=${emergency.status}`);
  check('emergency number is country-correct (Morocco = 150)',
    emergency.json.emergencyNumber === '150', String(emergency.json.emergencyNumber));

  await sleep(600);
  const stats = await getJson(`http://127.0.0.1:${PORT}/__stats`);
  check('exactly one webhook delivered', stats.count === 1, `count=${stats.count}`);

  const payload = stats.payloads[0] || {};
  check('payload records the deterministic pre-filter as the source',
    payload.source === 'keyword', String(payload.source));
  check('payload carries the patient id', payload.userId != null);
  check('payload carries the coordinates', payload.location?.lat === 34.0331);
  check('payload carries the medical profile', payload.medicalProfile?.bloodType === 'O+');
  check('payload carries the emergency contact',
    Array.isArray(payload.emergencyContacts)
      ? payload.emergencyContacts.length === 1
      : Boolean(payload.emergencyContact));

  // ── 2. Unauthenticated callers are rejected ────────────────────────────
  const before = (await getJson(`http://127.0.0.1:${PORT}/__stats`)).count;
  await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isEmergency: true, userId: 'attacker', message: 'spoof' }),
  });
  await sleep(300);
  const after = await getJson(`http://127.0.0.1:${PORT}/__stats`);
  check('a request without the shared secret is rejected',
    after.rejected.length === 1 && after.count === before && after.payloads.length === 1,
    `rejected=${after.rejected.length} count=${after.count}`);

  // ── 3. A webhook outage must not delay care ─────────────────────────────
  receiver.kill();
  await sleep(300);

  const token2 = await makePatient('down');
  const start = Date.now();
  const stillWorks = await post(
    `${API}/api/orchestrator/chat`,
    { message: 'perte de connaissance' },
    { Authorization: `Bearer ${token2}` },
  );
  const elapsed = Date.now() - start;

  check('patient still gets the emergency response with the webhook down',
    stillWorks.status === 200 && stillWorks.json.isEmergency === true,
    `status=${stillWorks.status}`);
  check('response was not delayed by the dead webhook', elapsed < 10000, `${elapsed}ms`);

  // ── 4. A 5xx is retried, a 4xx is not ───────────────────────────────────
  // A missed alert means a family member is not called, so a transient 5xx has
  // to be retried. A rejected payload (4xx) would fail identically forever.
  const flaky = http.createServer((req, res) => {
    flaky.hits += 1;
    res.writeHead(flaky.failWith, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  flaky.hits = 0;
  flaky.failWith = 500;
  await new Promise((r) => flaky.listen(PORT + 1, '127.0.0.1', r));

  process.env.N8N_EMERGENCY_WEBHOOK_URL = `http://127.0.0.1:${PORT + 1}/emergency-alert`;
  notifyEmergencyWorkflow({ isEmergency: true, message: 'retry probe' });
  await sleep(1500);
  check('a 5xx from the webhook is retried once', flaky.hits === 2, `hits=${flaky.hits}`);

  flaky.hits = 0;
  flaky.failWith = 400;
  notifyEmergencyWorkflow({ isEmergency: true, message: 'no-retry probe' });
  await sleep(1200);
  check('a 4xx is not retried', flaky.hits === 1, `hits=${flaky.hits}`);

  await new Promise((r) => flaky.close(r));

  api.kill();
  console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
})();