// Screens — .web.tsx variants are resolved first on Next.js (see next.config.js resolve.extensions)
export { LoginScreen } from './screens/LoginScreen';
export { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen';
export { CoachDashboardScreen } from './screens/coach/CoachDashboardScreen';
export { PlayerDashboardScreen } from './screens/player/PlayerDashboardScreen';
export { ParentDashboardScreen } from './screens/parent/ParentDashboardScreen';

// Navigation
export { NAV_CONFIG, ROLE_DASHBOARD } from './navigation/config';
export type { NavItem } from './navigation/config';
