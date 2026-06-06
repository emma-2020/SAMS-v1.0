const { sharedTheme } = require('@sams/ui/src/theme/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: sharedTheme,
  plugins: [],
};
