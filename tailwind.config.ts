import type { Config } from 'tailwindcss';

// Sheldon College palette (dark mode only).
//   Primary   #00295c  navy
//   Secondary #a3c1e7  light blue
//   Accent    #fbd708  gold (used sparingly)
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef3fa',
          100: '#d9e4f4',
          200: '#a3c1e7',
          300: '#7aa5da',
          400: '#4f82c4',
          500: '#2a5fa3',
          600: '#1a477f',
          700: '#0f3568',
          800: '#00295c',
          900: '#071d3f',
          950: '#04122a',
        },
        sky: {
          DEFAULT: '#a3c1e7',
        },
        gold: {
          DEFAULT: '#fbd708',
          600: '#d9b800',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(163,193,231,0.08), 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .25s ease-out both' },
    },
  },
  plugins: [],
} satisfies Config;
