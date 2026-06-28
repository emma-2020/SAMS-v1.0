import type { UserProfile } from '@sams/api';

export interface NavItem {
  label: string;
  path: string;
  icon: string; // lucide icon name, resolved by platform
}

const SETTINGS_ITEM: NavItem = { label: 'Settings', path: '/dashboard/settings', icon: 'Settings' };

export const NAV_CONFIG: Record<UserProfile['role'], { main: NavItem[]; other: NavItem[] }> = {
  Admin: {
    main: [
      { label: 'Dashboard',     path: '/dashboard/admin',                  icon: 'LayoutDashboard' },
      { label: 'Analytics',     path: '/dashboard/admin/analytics',        icon: 'BarChart2'       },
      { label: 'Schedule',      path: '/dashboard/admin/schedule',         icon: 'CalendarDays'    },
      { label: 'Invitations',   path: '/dashboard/admin/invite',           icon: 'Zap'             },
      { label: 'Registrations', path: '/dashboard/admin/registrations',    icon: 'ClipboardList'   },
      { label: 'Roster',        path: '/dashboard/admin/roster',           icon: 'Users'           },
      { label: 'Teams',         path: '/dashboard/admin/teams',            icon: 'Trophy'          },
      { label: 'Workouts',      path: '/dashboard/admin/workouts',         icon: 'Dumbbell'        },
      { label: 'Fees',          path: '/dashboard/admin/fees',             icon: 'Wallet'          },
      { label: 'Announcements', path: '/dashboard/admin/announcements',    icon: 'Megaphone'       },
      { label: 'Chat',          path: '/dashboard/admin/chat',             icon: 'MessageSquare'   },
    ],
    other: [SETTINGS_ITEM],
  },
  Coach: {
    main: [
      { label: 'Dashboard',  path: '/dashboard/coach',             icon: 'LayoutDashboard' },
      { label: 'Analytics',  path: '/dashboard/coach/analytics',   icon: 'BarChart2'       },
      { label: 'Players',    path: '/dashboard/coach/players',     icon: 'Users'           },
      { label: 'Schedule',   path: '/dashboard/coach/schedule',    icon: 'CalendarDays'    },
      { label: 'Attendance', path: '/dashboard/coach/attendance',  icon: 'ClipboardList'   },
      { label: 'Health',     path: '/dashboard/coach/health',      icon: 'Activity'        },
      { label: 'Workouts',   path: '/dashboard/coach/workouts',    icon: 'Dumbbell'        },
      { label: 'Chat',       path: '/dashboard/coach/chat',        icon: 'MessageSquare'   },
    ],
    other: [SETTINGS_ITEM],
  },
  Player: {
    main: [
      { label: 'Dashboard',     path: '/dashboard/player',              icon: 'LayoutDashboard' },
      { label: 'Registration',  path: '/dashboard/player/registration', icon: 'ClipboardList'   },
      { label: 'My Progress',   path: '/dashboard/player/analytics',    icon: 'BarChart2'       },
      { label: 'Schedule',      path: '/dashboard/player/schedule',     icon: 'CalendarDays'    },
      { label: 'Workouts',      path: '/dashboard/player/workouts',     icon: 'Dumbbell'        },
      { label: 'Health',        path: '/dashboard/player/health',       icon: 'Activity'        },
      { label: 'Chat',          path: '/dashboard/player/chat',         icon: 'MessageSquare'   },
    ],
    other: [SETTINGS_ITEM],
  },
  Parent: {
    main: [
      { label: 'Dashboard',    path: '/dashboard/parent',            icon: 'LayoutDashboard' },
      { label: "Child's Progress", path: '/dashboard/parent/analytics', icon: 'BarChart2'    },
      { label: 'Schedule',     path: '/dashboard/parent/schedule',   icon: 'CalendarDays'    },
      { label: 'Workouts',     path: '/dashboard/parent/workouts',   icon: 'Dumbbell'        },
      { label: 'Health',       path: '/dashboard/parent/health',     icon: 'Activity'        },
      { label: 'Messages',     path: '/dashboard/parent/chat',       icon: 'MessageSquare'   },
    ],
    other: [SETTINGS_ITEM],
  },
};

export const ROLE_DASHBOARD: Record<UserProfile['role'], string> = {
  Admin:  '/dashboard/admin',
  Coach:  '/dashboard/coach',
  Player: '/dashboard/player',
  Parent: '/dashboard/parent',
};
