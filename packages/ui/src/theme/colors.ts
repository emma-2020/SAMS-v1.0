/** Shared design token palette — identical values used in tailwind.config.js */
export const ROLE_COLOR: Record<string, string> = {
  Admin:  '#7C3AED',
  Coach:  '#7C3AED',
  Player: '#7C3AED',
  Parent: '#7C3AED',
} as const;

export const ROLE_GRADIENT = {
  Admin:  ['#4F46E5', '#EC4899'],
  Coach:  ['#4F46E5', '#EC4899'],
  Player: ['#4F46E5', '#EC4899'],
  Parent: ['#4F46E5', '#EC4899'],
} as const;

export const ACCENT = '#6366F1';
export const DANGER = '#EF4444';
export const SUCCESS = '#10B981';

export const NAVY_DARK = '#0D1B3E';
export const ACTIVE_NAV_START = '#EC4899';
export const ACTIVE_NAV_END   = '#8B5CF6';
