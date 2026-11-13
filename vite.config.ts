/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The dev server proxies /sb/* to the real Schoolbox instance so that the
// browser talks to a single origin. That keeps the PHPSESSID session cookie
// first-party and sidesteps CORS entirely.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const origin = env.SCHOOLBOX_ORIGIN || 'https://ilinq.sheldoncollege.com';
  const base = env.VITE_API_BASE || '/sb';

  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        [base]: {
          target: origin,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(new RegExp(`^${base}`), ''),
          cookieDomainRewrite: '',
          cookiePathRewrite: '/',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Ask Schoolbox for JSON (RFC 7807 problems rather than HTML pages).
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
      },
    },
    build: {
      sourcemap: false,
      target: 'es2020',
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
