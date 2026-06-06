/** Shared design token palette — identical values used in tailwind.config.js */
export const ROLE_COLOR = {
  Admin:  '#7C3AED',
  Coach:  '#2563EB',
  Player: '#059669',
  Parent: '#D97706',
} as const;

export const ROLE_GRADIENT = {
  Admin:  ['#7C3AED', '#A78BFA'],
  Coach:  ['#1D4ED8', '#60A5FA'],
  Player: ['#047857', '#34D399'],
  Parent: ['#B45309', '#FBBF24'],
} as const;

export const ACCENT = '#6366F1';
export const DANGER = '#EF4444';
export const SUCCESS = '#10B981';

export const NAVY_DARK = '#0D1B3E';
export const ACTIVE_NAV_START = '#EC4899';
export const ACTIVE_NAV_END   = '#8B5CF6';
