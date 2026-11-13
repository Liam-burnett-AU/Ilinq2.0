// Minimal production server: serves the built SPA from ./dist and reverse
// proxies VITE_API_BASE (default /sb) to the Schoolbox instance, rewriting the
// session cookie so it is first-party for the browser.
//
//   SCHOOLBOX_ORIGIN=https://ilinq.sheldoncollege.com PORT=8080 node server/proxy.mjs
//
// No dependencies beyond Node 18+.
import http from 'node:http';
import https from 'node:https';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const ORIGIN = new URL(process.env.SCHOOLBOX_ORIGIN || 'https://ilinq.sheldoncollege.com');
const BASE = (process.env.VITE_API_BASE || '/sb').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Hop-by-hop headers must not be forwarded.
const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host']);

function proxy(req, res) {
  const upstreamPath = req.url.slice(BASE.length) || '/';
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k)) headers[k] = v;
  headers.host = ORIGIN.host;
  headers.accept = headers.accept || 'application/json';
  headers.origin = ORIGIN.origin;
  headers.referer = ORIGIN.origin + '/';

  const upstream = (ORIGIN.protocol === 'https:' ? https : http).request(
    { protocol: ORIGIN.protocol, hostname: ORIGIN.hostname, port: ORIGIN.port || undefined, method: req.method, path: upstreamPath, headers },
    (up) => {
      const out = { ...up.headers };
      delete out['content-security-policy'];
      delete out['x-frame-options'];
      if (out['set-cookie']) {
        out['set-cookie'] = out['set-cookie'].map((c) =>
          c.replace(/;\s*domain=[^;]*/i, '').replace(/;\s*path=[^;]*/i, '; Path=/').replace(/;\s*samesite=none/i, '; SameSite=Lax'),
        );
      }
      if (out.location && out.location.startsWith(ORIGIN.origin)) out.location = BASE + out.location.slice(ORIGIN.origin.length);
      res.writeHead(up.statusCode || 502, out);
      up.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/problem+json' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Bad Gateway', status: 502, detail: String(err.message) }));
  });
  req.pipe(upstream);
}

function serveStatic(req, res) {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, path);
  if (!file.startsWith(ROOT)) file = join(ROOT, 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');
  const ext = extname(file);
  const immutable = path.startsWith('/assets/');
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    if (req.url.startsWith(BASE + '/') || req.url === BASE) return proxy(req, res);
    return serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`iLINQ 2.0 listening on http://localhost:${PORT}  (proxying ${BASE} -> ${ORIGIN.origin})`);
  });
