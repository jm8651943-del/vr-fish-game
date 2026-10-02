const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const publicDir = path.resolve(__dirname, 'public');
const vendorThreeDir = path.resolve(__dirname, 'node_modules/three/build');
const buildVersion = require('./package.json').version;
const startedAt = new Date().toISOString();

const telemetry = { total: 0, events: Object.create(null), lastEventAt: null };

const compliance = Object.freeze({
  version: "2026-09-30",
  minAge: Number(process.env.MIN_PLAYER_AGE || 21),
  goldModeEnabled: process.env.GOLD_MODE_ENABLED !== "false",
  sweepstakesEnabled: process.env.SWEEPSTAKES_ENABLED === "true",
  paymentsEnabled: process.env.PAYMENTS_ENABLED === "true",
  redemptionEnabled: process.env.REDEMPTION_ENABLED === "true",
  freeEntryEnabled: process.env.FREE_ENTRY_ENABLED === "true",
  kycRequired: true,
  geofenceRequired: true,
  currentJurisdictionStatus: "NOT_CLEARED",
  notice: "Gold mode is entertainment-only. Sweepstakes, payments, and redemption require separate jurisdiction and processor approval."
});

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self)',
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'"
};

function writeHeaders(res, extra = {}) {
  for (const [key, value] of Object.entries({ ...securityHeaders, ...extra })) res.setHeader(key, value);
}

function sendJson(res, status, payload) {
  writeHeaders(res, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function sendFile(req, res, filePath, cacheControl = 'no-cache') {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      writeHeaders(res, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.statusCode = err.code === 'ENOENT' ? 404 : 500;
      return res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
    writeHeaders(res, {
      'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cacheControl
    });
    res.statusCode = 200;
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
}

function readJson(req, maxBytes = 32768) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let oversized = false;
    req.on('data', chunk => {
      if (oversized) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        oversized = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (oversized) return;
      if (!chunks.length) return resolve({});
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Object required');
        resolve(value);
      }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function clean(value, max = 200) {
  return String(value ?? '').replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
}

const server = http.createServer(async (req, res) => {
  const rawPath = (req.url || '/').split('?')[0];

  if (rawPath === '/health') {
    return sendJson(res, 200, { status: 'healthy', app: 'vr-fish-game', build: 'abyss-arena-' + buildVersion + '-expedition', webxr: true, startedAt });
  }

  if (rawPath === '/api/stats' && req.method === 'GET') {
    return sendJson(res, 200, { startedAt, totalEvents: telemetry.total, events: telemetry.events, lastEventAt: telemetry.lastEventAt });
  }

  if (rawPath === '/api/compliance' && req.method === 'GET') {
    return sendJson(res, 200, compliance);
  }

  if (rawPath === '/api/telemetry' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const eventType = clean(body.eventType, 80).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      if (!eventType) return sendJson(res, 400, { error: 'eventType required' });

      telemetry.total += 1;
      const aggregateKey = Object.hasOwn(telemetry.events, eventType) || Object.keys(telemetry.events).length < 64 ? eventType : 'other';
      telemetry.events[aggregateKey] = (telemetry.events[aggregateKey] || 0) + 1;
      telemetry.lastEventAt = new Date().toISOString();

      const event = {
        eventType,
        sessionId: clean(body.sessionId, 120),
        level: Number.isFinite(Number(body.level)) ? Number(body.level) : null,
        score: Number.isFinite(Number(body.score)) ? Number(body.score) : null,
        catches: Number.isFinite(Number(body.catches)) ? Number(body.catches) : null,
        vr: Boolean(body.vr),
        detail: clean(body.detail, 500),
        at: telemetry.lastEventAt
      };
      console.log('[FISH telemetry] ' + JSON.stringify(event));
      return sendJson(res, 202, { accepted: true });
    } catch (error) {
      return sendJson(res, error.status || 500, { error: error.status ? error.message : 'Telemetry unavailable' });
    }
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && rawPath.startsWith('/vendor/')) {
    const vendorFile = rawPath.slice('/vendor/'.length);
    if (!/^three(?:\.core|\.module)?(?:\.min)?\.js$/.test(vendorFile)) {
      return sendJson(res, 404, { error: 'Vendor asset not found' });
    }
    const vendorPath = path.resolve(vendorThreeDir, vendorFile);
    if (!vendorPath.startsWith(vendorThreeDir + path.sep)) {
      return sendJson(res, 403, { error: 'Forbidden' });
    }
    return sendFile(req, res, vendorPath, 'public, max-age=86400');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (rawPath === '/' || rawPath === '/index.html') {
    return sendFile(req, res, path.join(publicDir, 'index.html'));
  }

  let decoded;
  try { decoded = decodeURIComponent(rawPath); }
  catch { writeHeaders(res); res.statusCode = 400; return res.end('Bad request'); }

  const relativePath = decoded.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, relativePath);
  if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
    writeHeaders(res); res.statusCode = 403; return res.end('Forbidden');
  }
  sendFile(req, res, filePath);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`VR Fish Game Expedition ${buildVersion} listening on ${port}`);
});
