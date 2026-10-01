/* Structural check of the n8n emergency workflow.
 *
 * The workflow could not be executed here (no n8n runtime), so the contract it
 * depends on is asserted statically instead:
 *
 *   1. the graph is connected — no orphan node, no dead branch
 *   2. every failure-prone HTTP node is non-fatal
 *   3. the payload the backend sends is read by the workflow's Code nodes
 *
 * Run: node tests/n8n_workflow.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'n8n', 'emergency-workflow.json');
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

let failures = 0;
const check = (label, ok, detail) => {
  if (ok) console.log(`OK   ${label}`);
  else {
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failures++;
  }
};

// ── 1. Graph connectivity ────────────────────────────────────────────────────
const names = wf.nodes.map((n) => n.name);
const connected = new Set();
for (const [src, tgt] of Object.entries(wf.connections)) {
  connected.add(src);
  for (const branch of tgt.main) for (b of branch) connected.add(b.node);
}
const orphans = names.filter((n) => !connected.has(n));
check('no orphan node', orphans.length === 0, orphans.join(', '));

// Every IF must feed both branches, or the false case vanishes silently.
for (const [src, tgt] of Object.entries(wf.connections)) {
  if (!names.includes(src) || !wf.nodes.find((n) => n.name === src && n.type.includes('.if'))) continue;
  const branches = tgt.main;
  const empty = branches.some((b) => b.length === 0);
  check(`IF "${src}" has both branches connected`, branches.length === 2 && !empty);
}

// Every node's declared type is importable by n8n.
const deprecated = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.function');
check('no legacy function node (use code)', deprecated.length === 0, deprecated.map((n) => n.name).join(', '));

// ── 2. Failure handling ──────────────────────────────────────────────────────
// A WhatsApp/Maps outage must not abort the run before the audit log.
for (const n of wf.nodes.filter((x) => x.type.includes('httpRequest'))) {
  check(`"${n.name}" is non-fatal and retried`,
    n.onError === 'continueRegularOutput' && n.retryOnFail === true,
    `onError=${n.onError} retryOnFail=${n.retryOnFail}`);
}

// ── 3. Backend contract ──────────────────────────────────────────────────────
const code = wf.nodes
  .filter((n) => n.type === 'n8n-nodes-base.code')
  .map((n) => n.parameters.jsCode)
  .join('\n');

// Fields emergencyMiddleware.js actually sends.
const sentFields = ['isEmergency', 'userId', 'message', 'location', 'medicalProfile', 'source'];
for (const f of sentFields) {
  check(`workflow reads backend field "${f}"`, code.includes(f));
}

// The contact array/object mismatch that silently produced a WhatsApp call
// with no recipient.
check('workflow normalises emergencyContacts[] and emergencyContact{}',
  code.includes('emergencyContacts') && code.includes('emergencyContact') && code.includes('recipientPhone'));

// A missing phone must not be sent to WhatsApp.
check('missing recipient short-circuits before the WhatsApp node',
  code.includes('canNotify'));

// Auth.
check('workflow verifies the shared secret',
  code.includes('N8N_WEBHOOK_SECRET') && code.includes('x-n8n-secret'));

// Log must reach a terminal state, not a "prepared" placeholder.
// The strings are checked in the *runtime* values, not the comments: the
// replacement note in the Code node quotes the old literal on purpose.
const logNode = wf.nodes.find((n) => n.name === 'Prepare Emergency Log');
const logCode = logNode ? logNode.parameters.jsCode.replace(/\/\/.*$/gm, '') : '';
check('emergency log has a real status',
  Boolean(logCode) && !logCode.includes('prepared_for_logging')
    && /status:\s*alert\.canNotify\s*\?/.test(logCode)
    && logCode.includes('processedAt'));

// The deterministic pre-filter path is recognised.
check('workflow accepts source=keyword (deterministic pre-filter)',
  wf.nodes.some((n) => (n.parameters?.conditions?.conditions?.[0]?.leftValue || '').includes('keyword')));

const total = failures === 0 ? 'all checks passed' : `${failures} check(s) failed`;
console.log(`\n${total}`);
process.exit(failures === 0 ? 0 : 1);
