// src/components/layout/AppShell.jsx
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { logout as logoutApi } from '../../services/auth.api';

// ─── SVG Icons ───────────────────────────────────────────────────
const icons = {
  calendar:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clipboard: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
  heart:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  message:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  users:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  mail:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>,
  logout:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ─── Navigation config ───────────────────────────────────────────

const NAV_CONFIG = {
  Admin: [
    { label: 'Schedule',    path: '/dashboard/admin/schedule', icon: icons.calendar  },
    { label: 'Invitations', path: '/dashboard/admin/invite',   icon: icons.mail      },
    { label: 'Roster',      path: '/dashboard/admin/roster',   icon: icons.users     },
    { label: 'Chat',        path: '/dashboard/admin/chat',     icon: icons.message   },
  ],
  Coach: [
    { label: 'Schedule',   path: '/dashboard/coach/schedule',   icon: icons.calendar  },
    { label: 'Attendance', path: '/dashboard/coach/attendance', icon: icons.clipboard },
    { label: 'Roster',     path: '/dashboard/coach/roster',     icon: icons.users     },
    { label: 'Health',     path: '/dashboard/coach/health',     icon: icons.heart     },
    { label: 'Chat',       path: '/dashboard/coach/chat',       icon: icons.message   },
  ],
  Player: [
    { label: 'Schedule', path: '/dashboard/player/schedule', icon: icons.calendar  },
    { label: 'Workouts', path: '/dashboard/player/workouts', icon: icons.clipboard },
    { label: 'Health',   path: '/dashboard/player/health',   icon: icons.heart     },
    { label: 'Chat',     path: '/dashboard/player/chat',     icon: icons.message   },
  ],
  Parent: [
    { label: 'Schedule', path: '/dashboard/parent/schedule', icon: icons.calendar },
    { label: 'Health',   path: '/dashboard/parent/health',   icon: icons.heart    },
    { label: 'Messages', path: '/dashboard/parent/chat',     icon: icons.message  },
  ],
};

const ROLE_META = {
  Admin:  { color: 'var(--role-admin)',  label: 'Admin Access'  },
  Coach:  { color: 'var(--role-coach)',  label: 'Coach Access'  },
  Player: { color: 'var(--role-player)', label: 'Player Access' },
  Parent: { color: 'var(--role-parent)', label: 'Parent Access' },
};

// ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems  = NAV_CONFIG[user?.role] || [];
  const meta      = ROLE_META[user?.role] || { color: 'var(--accent)', label: 'Access' };
  const initials  = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '??';

  async function handleLogout() {
    try { await logoutApi(); } catch (_) {}
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #0B1220 0%, #070B11 100%)',
        borderRight: '1px solid var(--border-subtle)',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, overflowY: 'auto',
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform var(--transition-normal)',
      }}>

        {/* Top: wordmark + close */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 20px 0',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1.2rem', letterSpacing: '0.28em',
            display: 'flex', alignItems: 'center', gap: 0,
          }}>
            <span style={{
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(245,158,11,0.5)',
            }}>S</span>
            <span style={{ color: 'var(--text-secondary)' }}>AMS</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            style={{
              display: 'none', background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: '4px', borderRadius: 'var(--radius-sm)',
            }}
            className="sidebar-close-btn"
          >
            {icons.close}
          </button>
        </div>

        {/* Role badge */}
        <div style={{
          margin: '16px 16px 8px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: `${meta.color}14`,
          border: `1px solid ${meta.color}33`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: meta.color, flexShrink: 0,
            boxShadow: `0 0 6px ${meta.color}`,
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.72rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: meta.color,
          }}>
            {meta.label}
          </span>
        </div>

        {/* Nav section label */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '0.62rem',
          fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--text-muted)', padding: '12px 20px 4px',
        }}>
          Navigation
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 600 : 450,
                transition: 'all var(--transition-fast)',
                position: 'relative',
                color: isActive ? meta.color : 'var(--text-secondary)',
                background: isActive ? `${meta.color}12` : 'transparent',
                border: `1px solid ${isActive ? `${meta.color}25` : 'transparent'}`,
                borderLeft: isActive ? `3px solid ${meta.color}` : '3px solid transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{
                    display: 'flex', flexShrink: 0,
                    opacity: isActive ? 1 : 0.6,
                  }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span style={{ marginLeft: 'auto', opacity: 0.5 }}>
                      {icons.chevron}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 16px' }} />

        {/* User footer */}
        <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: `${meta.color}20`,
              border: `1.5px solid ${meta.color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.72rem', color: meta.color, letterSpacing: '0.04em',
              }}>
                {initials}
              </span>
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{
                fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{
                fontSize: '0.7rem', color: 'var(--text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontFamily: 'var(--font-mono)',
              }}>
                {user?.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 12px',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)', fontSize: '0.82rem',
              cursor: 'pointer', transition: 'all var(--transition-fast)',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
              e.currentTarget.style.background = 'var(--danger-subtle)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.background = 'none';
            }}
          >
            {icons.logout}
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div style={{
        marginLeft: 'var(--sidebar-width)', flex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0,
      }}>

        {/* Mobile top bar */}
        <header className="topbar-mobile" style={{
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 56,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', padding: 6,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {icons.menu}
          </button>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1.1rem', letterSpacing: '0.25em',
          }}>
            <span style={{ color: 'var(--accent)' }}>S</span>
            <span style={{ color: 'var(--text-secondary)' }}>AMS</span>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: `${meta.color}20`,
            border: `1.5px solid ${meta.color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.68rem', color: meta.color,
            }}>
              {initials}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, padding: 'clamp(24px, 3vw, 40px)',
          maxWidth: 1280, width: '100%',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
