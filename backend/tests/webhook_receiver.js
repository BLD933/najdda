/* Local stand-in for the n8n webhook, used to verify the backend→n8n contract
 * without a running n8n instance.
 *
 * The workflow itself cannot execute here, but the part that is ours — the
 * payload emergencyMiddleware.js POSTs, the shared secret, and the fact that a
 * webhook failure never delays the patient's emergency response — can be
 * asserted end to end.
 *
 * Usage:  node tests/webhook_receiver.js [port]
 *         then set N8N_EMERGENCY_WEBHOOK_URL=http://127.0.0.1:<port>/emergency-alert
 */
const http = require('http');

const PORT = Number(process.argv[2] || 5055);
const SECRET = process.env.N8N_WEBHOOK_SECRET || 'test-secret';

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const send = (code, payload) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'GET' && req.url === '/__stats') return send(200, stats);
    if (req.url === '/__reset') { stats.count = 0; stats.rejected = []; stats.payloads = []; return send(200, { ok: true }); }
    if (req.url !== '/emergency-alert' || req.method !== 'POST') return send(404, { error: 'not found' });

    // `count` means alerts actually accepted for delivery, so a rejected
    // request must not appear as a delivered alert.
    const provided = req.headers['x-n8n-secret'];
    if (SECRET && provided !== SECRET) {
      stats.rejected.push({ at: new Date().toISOString(), hasSecret: Boolean(provided) });
      return send(401, { error: 'unauthorized' });
    }

    stats.count += 1;
    let parsed;
    try { parsed = JSON.parse(body); } catch { return send(400, { error: 'invalid json' }); }
    stats.payloads.push(parsed);
    console.log(`[receiver] alert #${stats.count}`, JSON.stringify({
      source: parsed.source,
      userId: parsed.userId,
      message: parsed.message,
      location: parsed.location,
      contacts: Array.isArray(parsed.emergencyContacts) ? parsed.emergencyContacts.length : (parsed.emergencyContact ? 1 : 0),
    }));
    // `responseMode: onReceived` — the backend does not wait for this.
    send(200, { received: true });
  });
});

const stats = { count: 0, rejected: [], payloads: [] };

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[receiver] listening on http://127.0.0.1:${PORT}/emergency-alert (secret: ${SECRET})`);
});
