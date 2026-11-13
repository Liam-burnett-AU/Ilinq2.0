import type { Config } from 'tailwindcss';

// Colours are CSS variables (see src/index.css) so themes can swap them at
// runtime while every utility class keeps working with Tailwind alpha syntax.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

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
          400: v('primary-strong'),
          500: v('primary-strong'),
          600: '#1a477f',
          700: v('nav-active'),
          800: v('primary'),
          900: v('surface'),
          950: v('bg'),
        },
        sky: { DEFAULT: v('secondary') },
        gold: { DEFAULT: v('accent'), 600: v('accent-deep') },
        ink: { DEFAULT: v('text'), muted: v('muted') },
        line: { DEFAULT: v('border') },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { card: 'var(--radius-card)' },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .25s ease-out both' },
    },
  },
  plugins: [],
} satisfies Config;
