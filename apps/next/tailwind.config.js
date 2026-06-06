const { sharedTheme } = require('@sams/ui/src/theme/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app/src/**/*.{ts,tsx}',
  ],
  theme: {
    ...sharedTheme,
    extend: {
      ...sharedTheme.extend,
      colors: {
        ...sharedTheme.extend.colors,
      },
    },
  },
  plugins: [],
};
