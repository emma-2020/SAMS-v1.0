// src/components/layout/AppShell.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Activity,
  Dumbbell, MessageSquare, Settings, LogOut, Menu, X, Bell,
  Search, ChevronUp, ChevronRight, Sun, Moon,
  Shield, Trophy, Zap, UserCircle,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { logout as logoutApi } from '../../services/auth.api';
import { useTheme } from '../../context/ThemeContext';
import { notificationsApi } from '../../services/notifications.api';

// ─── Nav config ───────────────────────────────────────────────
const SETTINGS_ITEM = { label: 'Settings', path: '/dashboard/settings', icon: Settings };

const NAV_CONFIG = {
  Admin: {
    main: [
      { label: 'Dashboard',   path: '/dashboard/admin',          icon: LayoutDashboard },
      { label: 'Schedule',    path: '/dashboard/admin/schedule', icon: CalendarDays    },
      { label: 'Invitations', path: '/dashboard/admin/invite',   icon: Zap             },
      { label: 'Roster',      path: '/dashboard/admin/roster',   icon: Users           },
      { label: 'Teams',       path: '/dashboard/admin/teams',    icon: Trophy          },
      { label: 'Chat',        path: '/dashboard/admin/chat',     icon: MessageSquare   },
    ],
    other: [SETTINGS_ITEM],
  },
  Coach: {
    main: [
      { label: 'Dashboard',  path: '/dashboard/coach',             icon: LayoutDashboard },
      { label: 'Players',    path: '/dashboard/coach/players',     icon: Users           },
      { label: 'Schedule',   path: '/dashboard/coach/schedule',    icon: CalendarDays    },
      { label: 'Attendance', path: '/dashboard/coach/attendance',  icon: ClipboardList   },
      { label: 'Health',     path: '/dashboard/coach/health',      icon: Activity        },
      { label: 'Workouts',   path: '/dashboard/coach/workouts',    icon: Dumbbell        },
      { label: 'Chat',       path: '/dashboard/coach/chat',        icon: MessageSquare   },
    ],
    other: [SETTINGS_ITEM],
  },
  Player: {
    main: [
      { label: 'Dashboard', path: '/dashboard/player',          icon: LayoutDashboard },
      { label: 'Schedule',  path: '/dashboard/player/schedule', icon: CalendarDays    },
      { label: 'Workouts',  path: '/dashboard/player/workouts', icon: Dumbbell        },
      { label: 'Health',    path: '/dashboard/player/health',   icon: Activity        },
      { label: 'Chat',      path: '/dashboard/player/chat',     icon: MessageSquare   },
    ],
    other: [SETTINGS_ITEM],
  },
  Parent: {
    main: [
      { label: 'Dashboard', path: '/dashboard/parent',          icon: LayoutDashboard },
      { label: 'Schedule',  path: '/dashboard/parent/schedule', icon: CalendarDays    },
      { label: 'Health',    path: '/dashboard/parent/health',   icon: Activity        },
      { label: 'Messages',  path: '/dashboard/parent/chat',     icon: MessageSquare   },
    ],
    other: [SETTINGS_ITEM],
  },
};

const ROLE_COLOR = {
  Admin:  '#7C3AED',
  Coach:  '#2563EB',
  Player: '#059669',
  Parent: '#D97706',
};

const ROLE_GRADIENT = {
  Admin:  'linear-gradient(135deg, #7C3AED, #A78BFA)',
  Coach:  'linear-gradient(135deg, #1D4ED8, #60A5FA)',
  Player: 'linear-gradient(135deg, #047857, #34D399)',
  Parent: 'linear-gradient(135deg, #B45309, #FBBF24)',
};

const ROLE_ICON_MAP = { Admin: Shield, Coach: Trophy, Player: Zap, Parent: UserCircle };

// Active nav gradient — pink → purple
const ACTIVE_NAV_BG = 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)';

// ─── Notification helpers ─────────────────────────────────────
const NOTIF_META = {
  schedule:     { emoji: '📅', color: '#818CF8' },
  health_flag:  { emoji: '🚨', color: '#F87171' },
  workout:      { emoji: '🏋️', color: '#FBBF24' },
  chat:         { emoji: '💬', color: '#60A5FA' },
  invite:       { emoji: '✉️', color: '#34D399' },
  system:       { emoji: '📢', color: '#A78BFA' },
};
const notifMeta = (t) => NOTIF_META[t] || { emoji: '🔔', color: '#818CF8' };

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60)    return 'just now';
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

// ─── useClickOutside ──────────────────────────────────────────
function useClickOutside(ref, handler) {
  useEffect(() => {
    function h(e) { if (!ref.current || ref.current.contains(e.target)) return; handler(e); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, handler]);
}

// ─── Avatar ───────────────────────────────────────────────────
function UserAvatar({ user, size = 34 }) {
  const name  = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  const seed  = encodeURIComponent(name || user?.email || 'user');
  const color = ROLE_COLOR[user?.role] ?? '#7C3AED';
  const src   = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e3a5f&fontFamily=Inter&fontSize=38&fontWeight=700&textColor=ffffff&size=64`;

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}40` }}
      />
    );
  }

  return (
    <img
      src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${color}40`, background: '#1e3a5f' }}
      onError={e => { e.currentTarget.style.display = 'none'; const n = e.currentTarget.nextSibling; if (n) n.style.display = 'flex'; }}
    />
  );
}

function FallbackAvatar({ user, size = 34 }) {
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const color = ROLE_COLOR[user?.role] ?? '#7C3AED';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: `${color}18`, border: `2px solid ${color}35`,
      fontSize: size * 0.3, fontWeight: 800, color,
    }}>
      {initials}
    </div>
  );
}

// ─── Nav Item — light sidebar, pink-purple gradient active ────
function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path.split('/').length <= 3}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10, textDecoration: 'none',
        fontSize: '0.855rem', fontWeight: isActive ? 600 : 450,
        color: isActive ? '#fff' : 'var(--text-secondary)',
        background: isActive ? ACTIVE_NAV_BG : 'transparent',
        boxShadow: isActive ? '0 4px 14px rgba(168,85,247,0.25)' : 'none',
        transition: 'all 0.15s ease',
      })}
      onMouseEnter={e => {
        const active = e.currentTarget.getAttribute('aria-current') === 'page';
        if (!active) {
          e.currentTarget.style.background = 'rgba(139,92,246,0.07)';
          e.currentTarget.style.color = '#7C3AED';
        }
      }}
      onMouseLeave={e => {
        const active = e.currentTarget.getAttribute('aria-current') === 'page';
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {({ isActive }) => (
        <>
          <span style={{ display: 'flex', opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>
            <Icon size={16} strokeWidth={isActive ? 2.25 : 1.75} />
          </span>
          <span style={{ flex: 1, letterSpacing: '0.005em' }}>{item.label}</span>
          {isActive && <ChevronRight size={12} style={{ opacity: 0.55 }} />}
        </>
      )}
    </NavLink>
  );
}

// ─── Notification Panel ───────────────────────────────────────
function NotificationPanel({ notifications, unreadCount, onMarkRead, onMarkAllRead, onRemove, onClose, navigate }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: 368, maxHeight: 520,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 16, boxShadow: 'var(--shadow-xl)',
      animation: 'fadeIn 0.15s ease',
      overflow: 'hidden', zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, background: '#EF4444', color: 'white' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', padding: '2px 6px', borderRadius: 6 }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Bell size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>All caught up!</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>No notifications yet.</div>
          </div>
        ) : (
          notifications.map(n => {
            const meta = notifMeta(n.type);
            return (
              <div
                key={n.id}
                onClick={() => { if (!n.is_read) onMarkRead(n.id); if (n.link) { navigate(n.link); onClose(); } }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                  background: n.is_read ? 'transparent' : `${meta.color}07`,
                  cursor: n.link ? 'pointer' : 'default',
                  transition: 'background 0.12s', position: 'relative',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : `${meta.color}07`; }}
              >
                {!n.is_read && (
                  <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${meta.color}15`, border: `1px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', marginLeft: 8 }}>
                  {meta.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: n.is_read ? 500 : 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.body}</div>}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onRemove(n.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '2px 4px', borderRadius: 4, lineHeight: 1, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────
export default function AppShell() {
  const [sidebarOpen,     setSidebarOpen]    = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRolePicker,  setShowRolePicker]  = useState(false);
  const [viewAsRole,      setViewAsRole]      = useState(null);
  const [showNotifPanel,  setShowNotifPanel]  = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [unreadCount,     setUnreadCount]     = useState(0);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const profileMenuRef = useRef(null);
  const rolePickerRef  = useRef(null);
  const notifRef       = useRef(null);

  useClickOutside(profileMenuRef, () => setShowProfileMenu(false));
  useClickOutside(rolePickerRef,  () => setShowRolePicker(false));
  useClickOutside(notifRef,       () => setShowNotifPanel(false));

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  const handleMarkRead    = async (id) => { try { await notificationsApi.markRead(id); setNotifications(p => p.map(n => n.id === id ? {...n, is_read: true} : n)); setUnreadCount(p => Math.max(0, p - 1)); } catch (_) {} };
  const handleMarkAllRead = async ()   => { try { await notificationsApi.markAllRead(); setNotifications(p => p.map(n => ({...n, is_read: true}))); setUnreadCount(0); } catch (_) {} };
  const handleRemoveNotif = async (id) => {
    try {
      await notificationsApi.remove(id);
      const removed = notifications.find(n => n.id === id);
      setNotifications(p => p.filter(n => n.id !== id));
      if (removed && !removed.is_read) setUnreadCount(p => Math.max(0, p - 1));
    } catch (_) {}
  };

  async function handleLogout() {
    try { await logoutApi(); } catch (_) {}
    logout();
    navigate('/login', { replace: true });
  }

  function handleSwitchRole(role) {
    setShowRolePicker(false);
    if (role === user?.role) { setViewAsRole(null); navigate(`/dashboard/${user.role.toLowerCase()}`, { replace: true }); }
    else { setViewAsRole(role); navigate(`/dashboard/${role.toLowerCase()}`, { replace: true }); }
  }

  const effectiveRole = viewAsRole || user?.role;
  const config        = NAV_CONFIG[effectiveRole] || { main: [], other: [] };
  const roleColor     = ROLE_COLOR[effectiveRole]  || '#7C3AED';
  const trueRoleColor = ROLE_COLOR[user?.role]     || '#7C3AED';
  const RoleIcon      = ROLE_ICON_MAP[effectiveRole] || Shield;

  const allItems  = [...config.main, ...config.other];
  const active    = allItems.find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
  const pageTitle = active?.label || 'Dashboard';

  // ── Sidebar content ────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 18px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            background: ROLE_GRADIENT[user?.role] || ROLE_GRADIENT.Admin,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${trueRoleColor}40`,
          }}>
            <Trophy size={17} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>SAMS</div>
            <div style={{ fontSize: '0.6rem', color: '#94A3B8', letterSpacing: '0.06em', marginTop: -1 }}>Sports Academy</div>
          </div>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', display: 'none' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Role badge */}
      <div style={{ padding: '10px 14px 6px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 11px', borderRadius: 8,
          background: `${roleColor}0D`, border: `1px solid ${roleColor}22`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, flexShrink: 0, boxShadow: `0 0 5px ${roleColor}80` }} />
          <span style={{ flex: 1, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: roleColor }}>
            {viewAsRole ? `Viewing as ${viewAsRole}` : `${user?.role} Access`}
          </span>
          {viewAsRole && (
            <button
              onClick={() => { setViewAsRole(null); navigate(`/dashboard/${user?.role?.toLowerCase()}`, { replace: true }); }}
              style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}25`, borderRadius: 5, color: roleColor, cursor: 'pointer', fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', letterSpacing: '0.04em' }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Main nav */}
      <div style={{ padding: '6px 10px 0', flex: 1 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>
          Menu
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {config.main.map(item => (
            <NavItem key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>
      </div>

      {/* General nav */}
      <div style={{ padding: '0 10px 6px' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>
          General
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {config.other.map(item => (
            <NavItem key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>
      </div>

      {/* Log out */}
      <div style={{ padding: '0 10px 8px' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', background: 'none', border: 'none', borderRadius: 9,
            color: '#94A3B8', cursor: 'pointer',
            fontSize: '0.855rem', fontWeight: 450, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = '#EF4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          Log Out
        </button>
      </div>

      {/* User card + role switcher */}
      <div style={{ padding: '8px 12px 14px', borderTop: '1px solid var(--border-subtle)', position: 'relative' }} ref={rolePickerRef}>

        {/* Role picker popup (light theme) */}
        {user?.role === 'Admin' && showRolePicker && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% - 4px)', left: 12, right: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 14, boxShadow: '0 -16px 40px rgba(15,23,42,0.12)',
            overflow: 'hidden', animation: 'fadeIn 0.15s ease', zIndex: 200,
          }}>
            <div style={{ padding: '10px 14px 8px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              Switch Role View
            </div>
            {['Admin', 'Coach', 'Player', 'Parent'].map(role => {
              const rc    = ROLE_COLOR[role];
              const RIcon = ROLE_ICON_MAP[role];
              const isAct = effectiveRole === role;
              return (
                <button
                  key={role}
                  onClick={() => handleSwitchRole(role)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px',
                    background: isAct ? `${rc}0D` : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isAct) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { if (!isAct) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: `${rc}15`, border: `1px solid ${rc}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rc }}>
                    <RIcon size={13} />
                  </span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: '0.83rem', fontWeight: isAct ? 700 : 500, color: isAct ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {role}
                    {role === user?.role && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}
                  </span>
                  {isAct && <div style={{ width: 6, height: 6, borderRadius: '50%', background: rc, boxShadow: `0 0 5px ${rc}` }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* User card */}
        <button
          onClick={() => user?.role === 'Admin' && setShowRolePicker(p => !p)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10, padding: '8px 10px',
            cursor: user?.role === 'Admin' ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (user?.role === 'Admin') e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (user?.role === 'Admin' && !showRolePicker) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        >
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <UserAvatar user={user} size={34} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: trueRoleColor, border: '2px solid var(--bg-elevated)' }} />
          </div>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
          {user?.role === 'Admin' && (
            <ChevronUp size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: showRolePicker ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          )}
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
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Sidebar — light minimalist */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, overflowY: 'auto', transition: 'transform 0.22s ease',
      }}>
        {sidebar}
      </aside>

      {/* Main */}
      <div style={{ marginLeft: 'var(--sidebar-width)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: 62, background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center',
          padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
          gap: 14, boxShadow: '0 1px 0 var(--border-subtle)',
        }}>
          <button
            className="topbar-mobile"
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 6, borderRadius: 8 }}
          >
            <Menu size={20} />
          </button>

          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {pageTitle}
          </div>

          {viewAsRole && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: `${ROLE_COLOR[viewAsRole]}0D`,
              border: `1px solid ${ROLE_COLOR[viewAsRole]}22`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: ROLE_COLOR[viewAsRole], animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ROLE_COLOR[viewAsRole] }}>
                Preview: {viewAsRole}
              </span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div className="search-input" style={{ width: 200 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input placeholder="Search…" />
          </div>

          {/* Bell */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => setShowNotifPanel(p => !p)}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: showNotifPanel ? '#F3EFFF' : 'var(--bg-elevated)',
                border: `1px solid ${showNotifPanel ? '#DDD6FE' : 'var(--border-default)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: showNotifPanel ? '#7C3AED' : 'var(--text-secondary)',
                position: 'relative', transition: 'all 0.15s',
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 16, height: 16, borderRadius: 99,
                  background: '#EF4444', color: 'white',
                  fontSize: '0.58rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '2px solid var(--bg-surface)',
                  lineHeight: 1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onRemove={handleRemoveNotif}
                onClose={() => setShowNotifPanel(false)}
                navigate={navigate}
              />
            )}
          </div>

          {/* Avatar + profile menu */}
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: showProfileMenu ? 'var(--bg-hover)' : 'transparent',
                border: `1px solid ${showProfileMenu ? 'var(--border-default)' : 'transparent'}`,
                borderRadius: 10, padding: '4px 8px 4px 4px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              onMouseLeave={e => { if (!showProfileMenu) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${trueRoleColor}40`, background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserAvatar user={user} size={30} />
                </div>
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#10B981', border: '2px solid var(--bg-surface)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.first_name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user?.role}</span>
              </div>
              <ChevronUp size={12} style={{ color: 'var(--text-muted)', transform: showProfileMenu ? 'none' : 'rotate(180deg)', transition: 'transform 0.15s' }} />
            </button>

            {showProfileMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 248,
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 14, boxShadow: 'var(--shadow-xl)',
                animation: 'fadeIn 0.15s ease', overflow: 'hidden', zIndex: 200,
              }}>
                <div style={{
                  padding: '14px 16px',
                  background: `linear-gradient(135deg, ${trueRoleColor}0D, var(--bg-elevated))`,
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${trueRoleColor}40`, background: '#1e3a5f', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserAvatar user={user} size={40} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                      <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 99, background: `${trueRoleColor}12`, border: `1px solid ${trueRoleColor}22` }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: trueRoleColor }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: trueRoleColor }}>{user?.role}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '6px' }}>
                  <MenuItem icon={<Settings size={15} />} label="Profile Settings" onClick={() => { navigate('/dashboard/settings'); setShowProfileMenu(false); }} />
                  <MenuItem
                    icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    onClick={toggleTheme}
                    badge={<span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: theme === 'dark' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)', color: theme === 'dark' ? '#FBBF24' : 'var(--accent)' }}>{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>}
                  />
                </div>

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 6px' }} />

                <div style={{ padding: '6px' }}>
                  <MenuItem icon={<LogOut size={15} />} label="Sign Out" onClick={handleLogout} danger />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 'var(--density-py) var(--density-px)', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const menuItemStyle = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px', borderRadius: 8,
  background: 'transparent', border: 'none',
  cursor: 'pointer', fontSize: '0.85rem',
  color: 'var(--text-secondary)', transition: 'background 0.12s',
  textAlign: 'left',
};

function MenuItem({ icon, label, onClick, danger, badge }) {
  return (
    <button
      onClick={onClick}
      style={{ ...menuItemStyle, color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'var(--danger-subtle)' : 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ display: 'flex', color: danger ? 'var(--danger)' : 'var(--text-muted)' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge}
      {!badge && !danger && <ChevronRight size={13} style={{ opacity: 0.4 }} />}
    </button>
  );
}
