// src/components/layout/AppShell.jsx
import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { logout as logoutApi } from '../../services/auth.api';

// ─── SVG Icons ───────────────────────────────────────────────
const Ico = {
  home:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  calendar:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clipboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
  heart:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  message:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  users:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  mail:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>,
  settings:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  bell:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

// ─── Nav config ───────────────────────────────────────────────
const SETTINGS = { label: 'Settings', path: '/dashboard/settings', icon: Ico.settings };

const NAV_CONFIG = {
  Admin: {
    main: [
      { label: 'Dashboard',   path: '/dashboard/admin',          icon: Ico.home      },
      { label: 'Schedule',    path: '/dashboard/admin/schedule', icon: Ico.calendar  },
      { label: 'Invitations', path: '/dashboard/admin/invite',   icon: Ico.mail      },
      { label: 'Roster',      path: '/dashboard/admin/roster',   icon: Ico.users     },
      { label: 'Chat',        path: '/dashboard/admin/chat',     icon: Ico.message   },
    ],
    other: [SETTINGS],
  },
  Coach: {
    main: [
      { label: 'Dashboard',  path: '/dashboard/coach',             icon: Ico.home      },
      { label: 'Schedule',   path: '/dashboard/coach/schedule',    icon: Ico.calendar  },
      { label: 'Attendance', path: '/dashboard/coach/attendance',  icon: Ico.clipboard },
      { label: 'Roster',     path: '/dashboard/coach/roster',      icon: Ico.users     },
      { label: 'Health',     path: '/dashboard/coach/health',      icon: Ico.heart     },
      { label: 'Chat',       path: '/dashboard/coach/chat',        icon: Ico.message   },
    ],
    other: [SETTINGS],
  },
  Player: {
    main: [
      { label: 'Dashboard', path: '/dashboard/player',          icon: Ico.home      },
      { label: 'Schedule',  path: '/dashboard/player/schedule', icon: Ico.calendar  },
      { label: 'Workouts',  path: '/dashboard/player/workouts', icon: Ico.clipboard },
      { label: 'Health',    path: '/dashboard/player/health',   icon: Ico.heart     },
      { label: 'Chat',      path: '/dashboard/player/chat',     icon: Ico.message   },
    ],
    other: [SETTINGS],
  },
  Parent: {
    main: [
      { label: 'Dashboard', path: '/dashboard/parent',          icon: Ico.home     },
      { label: 'Schedule',  path: '/dashboard/parent/schedule', icon: Ico.calendar },
      { label: 'Health',    path: '/dashboard/parent/health',   icon: Ico.heart    },
      { label: 'Messages',  path: '/dashboard/parent/chat',     icon: Ico.message  },
    ],
    other: [SETTINGS],
  },
};

const ROLE_COLOR = {
  Admin:  '#7C3AED',
  Coach:  '#2563EB',
  Player: '#059669',
  Parent: '#D97706',
};

// ─── Nav item ─────────────────────────────────────────────────

function NavItem({ item, roleColor, onClick }) {
  return (
    <NavLink
      to={item.path}
      end={item.path.split('/').length <= 3}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: '0.875rem',
        fontWeight: isActive ? 600 : 450,
        transition: 'all 0.15s ease',
        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
        background: isActive ? `rgba(255,255,255,0.1)` : 'transparent',
        borderLeft: isActive ? `3px solid ${roleColor}` : '3px solid transparent',
        marginLeft: 0,
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{ display: 'flex', opacity: isActive ? 1 : 0.7 }}>
            {item.icon}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {isActive && (
            <span style={{ opacity: 0.6, display: 'flex' }}>{Ico.chevron}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─────────────────────────────────────────────────────────────

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();

  const config    = NAV_CONFIG[user?.role] || { main: [], other: [] };
  const roleColor = ROLE_COLOR[user?.role] || '#6366F1';
  const initials  = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  // Current page title from nav config
  const allItems  = [...config.main, ...config.other];
  const active    = allItems.find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
  const pageTitle = active?.label || 'Dashboard';

  async function handleLogout() {
    try { await logoutApi(); } catch (_) {}
    logout();
    navigate('/login', { replace: true });
  }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${roleColor}40`,
          }}>
            <span style={{
              fontWeight: 900, fontSize: '0.85rem', color: 'white',
              fontFamily: 'var(--font-display)',
            }}>S</span>
          </div>
          <div>
            <div style={{
              fontWeight: 800, fontSize: '0.95rem', color: 'white',
              letterSpacing: '0.08em',
            }}>SAMS</div>
            <div style={{
              fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.04em',
            }}>
              Sports Academy
            </div>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            padding: 4, borderRadius: 6,
          }}
          className="sidebar-close-btn"
        >
          {Ico.close}
        </button>
      </div>

      {/* Role badge */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{
          padding: '6px 12px',
          borderRadius: 6,
          background: `${roleColor}20`,
          border: `1px solid ${roleColor}35`,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: roleColor, flexShrink: 0,
            boxShadow: `0 0 6px ${roleColor}`,
          }} />
          <span style={{
            fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: roleColor,
          }}>
            {user?.role} Access
          </span>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ padding: '4px 10px 0' }}>
        <div style={{
          fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
          padding: '8px 6px 6px',
        }}>
          Menu
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {config.main.map(item => (
            <NavItem
              key={item.path}
              item={item}
              roleColor={roleColor}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>
      </div>

      <div style={{ flex: 1 }} />

      {/* General/other nav */}
      <div style={{ padding: '0 10px 4px' }}>
        <div style={{
          fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
          padding: '8px 6px 6px',
        }}>
          General
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {config.other.map(item => (
            <NavItem
              key={item.path}
              item={item}
              roleColor={roleColor}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>
      </div>

      {/* Support link */}
      <div style={{ padding: '0 10px 8px' }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 14px',
            background: 'none', border: 'none', borderRadius: 8,
            color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 450,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          onClick={handleLogout}
        >
          <span style={{ display: 'flex', opacity: 0.7 }}>{Ico.logout}</span>
          Log Out
        </button>
      </div>

      {/* User card */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `${roleColor}30`,
          border: `1.5px solid ${roleColor}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 800,
            color: roleColor, letterSpacing: '0.02em',
          }}>
            {initials}
          </span>
        </div>
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.82rem', fontWeight: 600, color: 'white',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: 'var(--font-mono)',
          }}>
            {user?.email}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', display: 'flex',
            padding: 4, borderRadius: 6, flexShrink: 0,
            transition: 'color 0.15s',
          }}
          title="Sign out"
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          {Ico.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        background: 'var(--sidebar-bg)',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, overflowY: 'auto',
        transition: 'transform 0.2s ease',
      }}>
        {sidebarContent}
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div style={{
        marginLeft: 'var(--sidebar-width)', flex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0,
      }}>

        {/* Top bar */}
        <header style={{
          height: 60,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center',
          padding: '0 32px',
          position: 'sticky', top: 0, zIndex: 50,
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Mobile menu btn */}
          <button
            className="topbar-mobile"
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', padding: 6,
              borderRadius: 8,
            }}
          >
            {Ico.menu}
          </button>

          {/* Page title */}
          <div style={{
            fontSize: '1rem', fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '-0.01em',
          }}>
            {pageTitle}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div className="search-input" style={{ width: 220 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{Ico.search}</span>
            <input placeholder="Search..." />
          </div>

          {/* Bell */}
          <button style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
            position: 'relative',
          }}>
            {Ico.bell}
          </button>

          {/* User avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `${roleColor}20`,
            border: `1.5px solid ${roleColor}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 800,
              color: roleColor,
            }}>
              {initials}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          padding: '28px 32px',
          maxWidth: 1400,
          width: '100%',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
