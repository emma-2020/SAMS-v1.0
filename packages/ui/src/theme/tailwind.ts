/**
 * Shared Tailwind theme extension — import this in both apps/next and apps/expo
 * tailwind.config.js files to keep tokens in sync.
 */
export const sharedTheme = {
  extend: {
    colors: {
      'sams-accent':  '#6366F1',
      'sams-danger':  '#EF4444',
      'sams-success': '#10B981',
      'sams-admin':   '#7C3AED',
      'sams-coach':   '#2563EB',
      'sams-player':  '#059669',
      'sams-parent':  '#D97706',
      'sams-navy':    '#0D1B3E',
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      mono: ['JetBrains Mono', 'ui-monospace'],
    },
  },
};
