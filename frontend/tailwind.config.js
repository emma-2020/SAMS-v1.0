/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: {
    preflight: false, // don't reset existing SAMS design-system styles
  },
  theme: {
    extend: {
      colors: {
        'sams-pink':   '#EC4899',
        'sams-purple': '#8B5CF6',
        'sams-indigo': '#6366F1',
        'sams-ocean':  '#0EA5E9',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'premium': '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
        'glow-purple': '0 4px 14px rgba(168,85,247,0.25)',
      },
    },
  },
  plugins: [],
};
