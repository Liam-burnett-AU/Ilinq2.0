import type { Problem } from './types';

export type AuthMode = 'session' | 'bearer';

export interface ClientOptions {
  /** Same-origin path (e.g. "/sb") or absolute origin. */
  baseUrl: string;
  mode?: AuthMode;
  token?: string | null;
  fetchImpl?: typeof fetch;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: Problem;
  readonly body?: unknown;
  constructor(status: number, message: string, problem?: Problem, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.body = body;
  }
  get isUnauthorised() {
    return this.status === 401 || this.status === 403;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  form?: Record<string, string>;
}

/**
 * Thin fetch wrapper for a Schoolbox instance.
 *
 * - Always sends `Accept: application/json` so errors arrive as RFC 7807.
 * - `session` mode relies on the PHPSESSID cookie (requires same origin or a
 *   proxy such as server/proxy.mjs); `bearer` mode sends a JWT.
 */
export class SchoolboxClient {
  baseUrl: string;
  mode: AuthMode;
  token: string | null;
  private fetchImpl: typeof fetch;

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.mode = opts.mode ?? 'session';
    this.token = opts.token ?? null;
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));
  }

  url(path: string, query?: RequestOptions['query']) {
    const u = this.baseUrl + (path.startsWith('/') ? path : `/${path}`);
    if (!query) return u;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${u}?${qs}` : u;
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { query, json, form, headers, ...init } = opts;
    const h = new Headers(headers);
    h.set('Accept', 'application/json');
    if (this.mode === 'bearer' && this.token) h.set('Authorization', `Bearer ${this.token}`);
    let body: BodyInit | undefined;
    if (json !== undefined) {
      h.set('Content-Type', 'application/json');
      body = JSON.stringify(json);
    } else if (form) {
      h.set('Content-Type', 'application/x-www-form-urlencoded');
      body = new URLSearchParams(form).toString();
    }
    const res = await this.fetchImpl(this.url(path, query), {
      ...init,
      headers: h,
      body,
      credentials: this.mode === 'session' ? 'include' : 'same-origin',
      redirect: 'manual',
    });
    return parseResponse<T>(res);
  }

  get<T>(path: string, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'GET', query });
  }
  post<T>(path: string, opts: RequestOptions = {}) {
    return this.request<T>(path, { ...opts, method: 'POST' });
  }
}

export async function parseResponse<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('json');
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    if (isJson) return (await res.json()) as T;
    const text = await res.text();
    // Some Schoolbox endpoints answer HTML when the session has expired.
    if (/<html/i.test(text)) throw new ApiError(401, 'Session expired or not signed in', undefined, text);
    return text as unknown as T;
  }
  let problem: Problem | undefined;
  let body: unknown;
  try {
    body = isJson ? await res.json() : await res.text();
  } catch {
    body = undefined;
  }
  if (body && typeof body === 'object' && 'title' in (body as object)) problem = body as Problem;
  const message =
    problem?.detail || problem?.title || (typeof body === 'string' && body.length < 200 && !/<html/i.test(body) ? body : `HTTP ${res.status}`);
  // opaque redirects (status 0) happen when Schoolbox 302s us to its login page
  const status = res.type === 'opaqueredirect' ? 401 : res.status;
  throw new ApiError(status, message, problem, body);
}
