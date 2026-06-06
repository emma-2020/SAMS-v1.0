/** @type {import('tailwindcss').Config} */

const sharedColors = {
  'sams-accent':  '#6366F1',
  'sams-danger':  '#EF4444',
  'sams-success': '#10B981',
  'sams-admin':   '#7C3AED',
  'sams-coach':   '#2563EB',
  'sams-player':  '#059669',
  'sams-parent':  '#D97706',
  'sams-navy':    '#0D1B3E',
};

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: sharedColors,
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
    },
  },
  plugins: [],
};
