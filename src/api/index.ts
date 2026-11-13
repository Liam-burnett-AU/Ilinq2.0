import { SchoolboxClient } from './client';
import { DemoApi } from './demo/client';
import { LiveApi, type PortalApi } from './schoolbox';
import { config } from '@/lib/config';

export type { PortalApi } from './schoolbox';
export { ApiError } from './client';

const TOKEN_KEY = 'ilinq2.token';

export function createApi(kind: 'live' | 'demo', token?: string | null): PortalApi {
  if (kind === 'demo') return new DemoApi(config.schoolboxOrigin);
  const stored = token ?? sessionStorage.getItem(TOKEN_KEY);
  const client = new SchoolboxClient({ baseUrl: config.apiBase, mode: stored ? 'bearer' : 'session', token: stored });
  return new LiveApi(client, config.schoolboxOrigin);
}

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};
