/**
 * Cloudflare Worker for iLINQ 2.0.
 *
 * - Serves the built SPA from the `dist` assets binding (SPA fallback on).
 * - Reverse-proxies `${API_BASE}/*` (default /sb) to the Schoolbox instance,
 *   rewriting the PHPSESSID cookie so it is first-party on the Worker's domain.
 *
 * This is the Cloudflare equivalent of server/proxy.mjs.
 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SCHOOLBOX_ORIGIN?: string;
  API_BASE?: string;
}

const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry', 'x-forwarded-proto', 'x-real-ip']);

function rewriteCookie(c: string): string {
  return c
    .replace(/;\s*domain=[^;]*/i, '')
    .replace(/;\s*path=[^;]*/i, '; Path=/')
    .replace(/;\s*samesite=none/i, '; SameSite=Lax');
}

async function proxy(req: Request, env: Env, url: URL, base: string): Promise<Response> {
  const origin = new URL(env.SCHOOLBOX_ORIGIN || 'https://ilinq.sheldoncollege.com');
  const upstream = new URL(url.pathname.slice(base.length) || '/', origin);
  upstream.search = url.search;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) headers.set(k, v);
  });
  headers.set('host', origin.host);
  headers.set('origin', origin.origin);
  headers.set('referer', origin.origin + '/');
  if (!headers.has('accept')) headers.set('accept', 'application/json');

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  let up: Response;
  try {
    up = await fetch(upstream.toString(), { method: req.method, headers, body: hasBody ? req.body : undefined, redirect: 'manual' });
  } catch (err) {
    return Response.json({ type: 'about:blank', title: 'Bad Gateway', status: 502, detail: String((err as Error).message) }, { status: 502, headers: { 'content-type': 'application/problem+json' } });
  }

  const out = new Headers();
  up.headers.forEach((v, k) => {
    const key = k.toLowerCase();
    if (key === 'set-cookie' || key === 'content-security-policy' || key === 'content-security-policy-report-only' || key === 'x-frame-options' || key === 'content-encoding' || key === 'content-length') return;
    out.set(k, v);
  });
  const cookies = typeof (up.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function' ? (up.headers as Headers & { getSetCookie: () => string[] }).getSetCookie() : [];
  for (const c of cookies) out.append('set-cookie', rewriteCookie(c));
  const loc = up.headers.get('location');
  if (loc && loc.startsWith(origin.origin)) out.set('location', base + loc.slice(origin.origin.length));

  // Classic iLINQ pages are embedded in the app. Rewrite absolute links to the
  // Schoolbox origin so navigation inside the frame stays on the proxy.
  const ct = up.headers.get('content-type') || '';
  if (/text\/html/i.test(ct) && up.body) {
    const html = await up.text();
    const appOrigin = url.origin;
    const rewritten = html
      .split(origin.origin)
      .join(appOrigin + base)
      .split(origin.origin.replace(/^https?:/, ''))
      .join(appOrigin.replace(/^https?:/, '') + base);
    return new Response(rewritten, { status: up.status, statusText: up.statusText, headers: out });
  }
  return new Response(up.body, { status: up.status, statusText: up.statusText, headers: out });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const base = (env.API_BASE || '/sb').replace(/\/$/, '');
    const url = new URL(req.url);
    if (url.pathname === base || url.pathname.startsWith(base + '/')) return proxy(req, env, url, base);
    return env.ASSETS.fetch(req);
  },
};
