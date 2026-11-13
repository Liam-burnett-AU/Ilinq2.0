import { describe, expect, it } from 'vitest';
import { ApiError, SchoolboxClient, parseResponse } from '../api/client';

const fail = async (p: Promise<unknown>) => (await p.catch((e: unknown) => e)) as ApiError;
const jsonRes = (status: number, body: unknown, ct = 'application/json') => new Response(JSON.stringify(body), { status, headers: { 'content-type': ct } });

describe('SchoolboxClient', () => {
  it('builds URLs with query strings and skips empty values', () => {
    const c = new SchoolboxClient({ baseUrl: '/sb/' });
    expect(c.url('/calendar/ajax/full', { start: 1, end: 2, userId: 3, folderId: undefined })).toBe('/sb/calendar/ajax/full?start=1&end=2&userId=3');
  });

  it('sends Accept: application/json and bearer tokens', async () => {
    let seen: Request | undefined;
    const c = new SchoolboxClient({
      baseUrl: 'https://x.test',
      mode: 'bearer',
      token: 'abc',
      fetchImpl: async (input, init) => {
        seen = new Request(input as string, init);
        return jsonRes(200, { ok: true });
      },
    });
    await c.get('/api/user/1');
    expect(seen?.headers.get('accept')).toBe('application/json');
    expect(seen?.headers.get('authorization')).toBe('Bearer abc');
  });

  it('encodes form posts for /api/session', async () => {
    let body = '';
    let ct = '';
    const c = new SchoolboxClient({
      baseUrl: '/sb',
      fetchImpl: async (_i, init) => {
        body = String(init?.body);
        ct = new Headers(init?.headers).get('content-type') ?? '';
        return jsonRes(200, { id: 1, key: 'k', role: 'student', username: 'u' });
      },
    });
    await c.post('/api/session', { form: { username: 'u', password: 'p&q' } });
    expect(ct).toContain('application/x-www-form-urlencoded');
    expect(body).toBe('username=u&password=p%26q');
  });
});

describe('parseResponse', () => {
  it('turns RFC 7807 problems into ApiError', async () => {
    const err = await fail(parseResponse(jsonRes(404, { type: 'about:blank', title: 'Not Found', status: 404, detail: 'No such user' }, 'application/problem+json')));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.message).toBe('No such user');
  });
  it('treats an HTML login page on a 200 as an expired session', async () => {
    const res = new Response('<html><body>Login</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    const err = await fail(parseResponse(res));
    expect(err.status).toBe(401);
  });
  it('uses short plain-text bodies as the message', async () => {
    const res = new Response(JSON.stringify('Incorrect username or password'), { status: 401, headers: { 'content-type': 'application/json' } });
    const err = await fail(parseResponse(res));
    expect(err.message).toBe('Incorrect username or password');
  });
});
