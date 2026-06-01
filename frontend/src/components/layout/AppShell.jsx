// src/components/layout/AppShell.jsx
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { logout as logoutApi } from '../../services/auth.api';

// ─── SVG Icon set ────────────────────────────────────────────────

const icons = {
  calendar:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clipboard:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
  heart:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  message:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  users:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shield:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  mail:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>,
  logout:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ─── Navigation config per role ──────────────────────────────────

const NAV_CONFIG = {
  Admin: [
    { label: 'Schedule',    path: '/dashboard/admin/schedule',    icon: icons.calendar  },
    { label: 'Invitations', path: '/dashboard/admin/invite',      icon: icons.mail      },
    { label: 'Roster',      path: '/dashboard/admin/roster',      icon: icons.users     },
    { label: 'Chat',        path: '/dashboard/admin/chat',        icon: icons.message   },
  ],
  Coach: [
    { label: 'Schedule',    path: '/dashboard/coach/schedule',    icon: icons.calendar  },
    { label: 'Attendance',  path: '/dashboard/coach/attendance',  icon: icons.clipboard },
    { label: 'Roster',      path: '/dashboard/coach/roster',      icon: icons.users     },
    { label: 'Health',      path: '/dashboard/coach/health',      icon: icons.heart     },
    { label: 'Chat',        path: '/dashboard/coach/chat',        icon: icons.message   },
  ],
  Player: [
    { label: 'Schedule',    path: '/dashboard/player/schedule',   icon: icons.calendar  },
    { label: 'Workouts',    path: '/dashboard/player/workouts',   icon: icons.clipboard },
    { label: 'Health',      path: '/dashboard/player/health',     icon: icons.heart     },
    { label: 'Chat',        path: '/dashboard/player/chat',       icon: icons.message   },
  ],
  Parent: [
    { label: 'Schedule',    path: '/dashboard/parent/schedule',   icon: icons.calendar  },
    { label: 'Health',      path: '/dashboard/parent/health',     icon: icons.heart     },
    { label: 'Messages',    path: '/dashboard/parent/chat',       icon: icons.message   },
  ],
};

const ROLE_COLOR = {
  Admin: 'var(--role-admin)',  Coach:  'var(--role-coach)',
  Player:'var(--role-player)', Parent: 'var(--role-parent)',
};

// ─────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems   = NAV_CONFIG[user?.role] || [];
  const roleColor  = ROLE_COLOR[user?.role] || 'var(--accent)';
  const initials   = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`
    : '??';

  async function handleLogout() {
    await logoutApi();
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={shell.root}>

      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          style={shell.mobileOverlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside style={{ ...shell.sidebar, ...(sidebarOpen ? shell.sidebarOpen : {}) }}>

        {/* Wordmark */}
        <div style={shell.sidebarTop}>
          <div style={shell.wordmark}>
            <span style={{ color: 'var(--accent)' }}>S</span>
            <span style={{ color: 'var(--text-secondary)' }}>AMS</span>
          </div>
          <button
            style={shell.closeBtn}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            {icons.close}
          </button>
        </div>

        {/* Role indicator strip */}
        <div style={{ ...shell.roleBadge, borderColor: roleColor }}>
          <span style={{ ...shell.roleDot, background: roleColor }} />
          <span style={{ ...shell.roleLabel, color: roleColor }}>
            {user?.role} Access
          </span>
        </div>

        {/* Navigation */}
        <nav style={shell.nav} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                ...shell.navItem,
                ...(isActive ? shell.navItemActive : {}),
                '--role-color': roleColor,
              })}
            >
              <span style={shell.navIcon}>{item.icon}</span>
              <span style={shell.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer — user profile */}
        <div style={shell.sidebarFooter}>
          <div style={shell.userCard}>
            <div style={{ ...shell.avatar, background: roleColor + '22', borderColor: roleColor + '44' }}>
              <span style={{ ...shell.avatarText, color: roleColor }}>{initials}</span>
            </div>
            <div style={shell.userInfo}>
              <div style={shell.userName}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={shell.userEmail}>{user?.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={shell.logoutBtn}
            aria-label="Sign out"
          >
            {icons.logout}
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <div style={shell.main}>

        {/* Mobile top bar */}
        <header style={shell.topBar}>
          <button
            style={shell.menuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            {icons.menu}
          </button>
          <div style={shell.topBarWordmark}>
            <span style={{ color: 'var(--accent)' }}>S</span>
            <span style={{ color: 'var(--text-secondary)' }}>AMS</span>
          </div>
          <div style={{ ...shell.avatar, ...shell.avatarSm,
            background: roleColor + '22', borderColor: roleColor + '44' }}>
            <span style={{ ...shell.avatarText, fontSize: '0.7rem', color: roleColor }}>
              {initials}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={shell.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── Shell styles ────────────────────────────────────────────────

const shell = {
  root: {
    display:   'flex',
    minHeight: '100vh',
    background:'var(--bg-base)',
  },

  // ── Sidebar ──────────────────────────────────────────────────
  sidebar: {
    width:          'var(--sidebar-width)',
    flexShrink:     0,
    display:        'flex',
    flexDirection:  'column',
    background:     'var(--bg-surface)',
    borderRight:    '1px solid var(--border-subtle)',
    position:       'fixed',
    top:            0,
    left:           0,
    height:         '100vh',
    zIndex:         100,
    transition:     'transform var(--transition-normal)',
    overflowY:      'auto',
  },

  sidebarOpen: {
    transform: 'translateX(0)',
  },

  mobileOverlay: {
    position: 'fixed',
    inset:    0,
    background: 'rgba(0,0,0,0.6)',
    zIndex:   99,
    backdropFilter: 'blur(2px)',
  },

  sidebarTop: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '20px 20px 0',
  },

  wordmark: {
    fontFamily:    'var(--font-display)',
    fontWeight:    800,
    fontSize:      '1.1rem',
    letterSpacing: '0.25em',
  },

  closeBtn: {
    display:        'none',
    background:     'none',
    border:         'none',
    color:          'var(--text-muted)',
    cursor:         'pointer',
    padding:        '4px',
    borderRadius:   'var(--radius-sm)',
  },

  roleBadge: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    margin:       '16px 20px',
    padding:      '8px 12px',
    background:   'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    border:       '1px solid',
  },

  roleDot: {
    width:        '6px',
    height:       '6px',
    borderRadius: '50%',
    flexShrink:   0,
  },

  roleLabel: {
    fontFamily:    'var(--font-display)',
    fontSize:      '0.72rem',
    fontWeight:    700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },

  // ── Nav ──────────────────────────────────────────────────────
  nav: {
    flex:          1,
    padding:       '8px 12px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
  },

  navItem: {
    display:       'flex',
    alignItems:    'center',
    gap:           '12px',
    padding:       '10px 12px',
    borderRadius:  'var(--radius-md)',
    color:         'var(--text-secondary)',
    fontSize:      '0.875rem',
    fontFamily:    'var(--font-body)',
    fontWeight:    500,
    transition:    'all var(--transition-fast)',
    textDecoration:'none',
    border:        '1px solid transparent',
  },

  navItemActive: {
    background:    'var(--accent-subtle)',
    color:         'var(--accent)',
    borderColor:   'var(--border-accent)',
  },

  navIcon:  { display: 'flex', flexShrink: 0 },
  navLabel: { fontWeight: 500 },

  // ── Footer ───────────────────────────────────────────────────
  sidebarFooter: {
    padding:     '12px',
    borderTop:   '1px solid var(--border-subtle)',
    display:     'flex',
    flexDirection:'column',
    gap:         '8px',
  },

  userCard: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    padding:    '10px',
    background: 'var(--bg-elevated)',
    borderRadius:'var(--radius-md)',
  },

  avatar: {
    width:        '34px',
    height:       '34px',
    borderRadius: '50%',
    border:       '1px solid',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },

  avatarSm: { width: '30px', height: '30px' },

  avatarText: {
    fontFamily: 'var(--font-display)',
    fontSize:   '0.75rem',
    fontWeight: 700,
    letterSpacing:'0.05em',
  },

  userInfo:  { overflow: 'hidden', minWidth: 0 },
  userName:  {
    fontSize:     '0.82rem',
    fontWeight:   600,
    color:        'var(--text-primary)',
    whiteSpace:   'nowrap',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize:     '0.72rem',
    color:        'var(--text-muted)',
    whiteSpace:   'nowrap',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
  },

  logoutBtn: {
    display:       'flex',
    alignItems:    'center',
    gap:           '8px',
    width:         '100%',
    padding:       '9px 12px',
    background:    'none',
    border:        '1px solid var(--border-subtle)',
    borderRadius:  'var(--radius-md)',
    color:         'var(--text-muted)',
    fontSize:      '0.82rem',
    cursor:        'pointer',
    transition:    'all var(--transition-fast)',
    fontFamily:    'var(--font-body)',
  },

  // ── Main ─────────────────────────────────────────────────────
  main: {
    marginLeft: 'var(--sidebar-width)',
    flex:       1,
    display:    'flex',
    flexDirection:'column',
    minHeight:  '100vh',
    minWidth:   0,
  },

  topBar: {
    display:        'none',   // hidden on desktop
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 16px',
    height:         '56px',
    background:     'var(--bg-surface)',
    borderBottom:   '1px solid var(--border-subtle)',
    position:       'sticky',
    top:            0,
    zIndex:         50,
  },

  menuBtn: {
    background:   'none',
    border:       'none',
    color:        'var(--text-secondary)',
    cursor:       'pointer',
    display:      'flex',
    padding:      '6px',
    borderRadius: 'var(--radius-sm)',
  },

  topBarWordmark: {
    fontFamily:    'var(--font-display)',
    fontWeight:    800,
    fontSize:      '1.1rem',
    letterSpacing: '0.25em',
  },

  content: {
    flex:    1,
    padding: 'clamp(20px, 3vw, 40px)',
    maxWidth:'1200px',
    width:   '100%',
  },
};
