'use client';

/**
 * Next.js web AppShell — full-fidelity port of the existing CRA AppShell.
 * Uses the same design tokens, nav config, and sidebar behaviour.
 * Uses `next/navigation` instead of react-router hooks.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Activity,
  Dumbbell, MessageSquare, Settings, LogOut, Menu, X, Bell,
  Search, ChevronUp, ChevronRight, Sun, Moon,
  Shield, Trophy, Zap, UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@sams/store';
import { authApi, notificationsApi } from '@sams/api';
import { useTheme } from '@/lib/theme/provider';
import { NAV_CONFIG, ROLE_DASHBOARD } from '@sams/app';
import type { NavItem } from '@sams/app';
import type { Notification, UserProfile } from '@sams/api';

// ── Icon resolver ──────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Activity,
  Dumbbell, MessageSquare, Settings, LogOut, Shield, Trophy, Zap, UserCircle,
};
function NavIcon({ name, size = 16, ...rest }: { name: string; size?: number; [k: string]: unknown }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon size={size} {...(rest as object)} />;
}

// ── Colours ────────────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  Admin: '#7C3AED', Coach: '#2563EB', Player: '#059669', Parent: '#D97706',
};
const ROLE_GRADIENT: Record<string, string> = {
  Admin:  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  Coach:  'linear-gradient(135deg,#1D4ED8,#60A5FA)',
  Player: 'linear-gradient(135deg,#047857,#34D399)',
  Parent: 'linear-gradient(135deg,#B45309,#FBBF24)',
};
const ACTIVE_NAV_BG = 'linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)';

const NOTIF_META: Record<string, { emoji: string; color: string }> = {
  schedule:    { emoji: '📅', color: '#818CF8' },
  health_flag: { emoji: '🚨', color: '#F87171' },
  workout:     { emoji: '🏋️', color: '#FBBF24' },
  chat:        { emoji: '💬', color: '#60A5FA' },
  invite:      { emoji: '✉️', color: '#34D399' },
  system:      { emoji: '📢', color: '#A78BFA' },
};
const notifMeta = (t: string) => NOTIF_META[t] ?? { emoji: '🔔', color: '#818CF8' };

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)    return 'just now';
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ── Click outside ──────────────────────────────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, handler]);
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 34 }: { user: UserProfile | null; size?: number }) {
  const name  = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  const seed  = encodeURIComponent(name || user?.email || 'user');
  const color = ROLE_COLOR[user?.role ?? ''] ?? '#7C3AED';
  const src   = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e3a5f&fontFamily=Inter&fontSize=38&fontWeight=700&textColor=ffffff&size=64`;

  return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${color}40`, background: '#1e3a5f' }} />
  );
}

// ── NavItem ────────────────────────────────────────────────────────────────────
function SidebarNavItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const isActive  = pathname === item.path || pathname.startsWith(item.path + '/');
  const depth     = item.path.split('/').length;
  const isExact   = depth <= 3;

  const activeCheck = isExact
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(item.path + '/');

  return (
    <button
      onClick={() => { router.push(item.path); onClick?.(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10,
        fontSize: '0.855rem', fontWeight: activeCheck ? 600 : 450,
        color: activeCheck ? '#fff' : 'var(--text-secondary)',
        background: activeCheck ? ACTIVE_NAV_BG : 'transparent',
        boxShadow: activeCheck ? '0 4px 14px rgba(168,85,247,0.25)' : 'none',
        border: 'none', cursor: 'pointer', width: '100%',
        transition: 'all 0.15s ease', textAlign: 'left',
      }}
      onMouseEnter={(e) => { if (!activeCheck) { e.currentTarget.style.background = 'rgba(139,92,246,0.07)'; e.currentTarget.style.color = '#7C3AED'; } }}
      onMouseLeave={(e) => { if (!activeCheck) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
    >
      <span style={{ display: 'flex', opacity: activeCheck ? 1 : 0.65, flexShrink: 0 }}>
        <NavIcon name={item.icon} size={16} strokeWidth={activeCheck ? 2.25 : 1.75} />
      </span>
      <span style={{ flex: 1, letterSpacing: '0.005em' }}>{item.label}</span>
      {activeCheck && <ChevronRight size={12} style={{ opacity: 0.55 }} />}
    </button>
  );
}

// ── Main Shell ─────────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen,      setSidebarOpen]     = useState(false);
  const [showProfileMenu,  setShowProfileMenu]  = useState(false);
  const [showRolePicker,   setShowRolePicker]   = useState(false);
  const [viewAsRole,       setViewAsRole]       = useState<string | null>(null);
  const [showNotifPanel,   setShowNotifPanel]   = useState(false);
  const [notifications,    setNotifications]    = useState<Notification[]>([]);
  const [unreadCount,      setUnreadCount]      = useState(0);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const rolePickerRef  = useRef<HTMLDivElement>(null);
  const notifRef       = useRef<HTMLDivElement>(null);

  useClickOutside(profileMenuRef, () => setShowProfileMenu(false));
  useClickOutside(rolePickerRef,  () => setShowRolePicker(false));
  useClickOutside(notifRef,       () => setShowNotifPanel(false));

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter((n) => !n.is_read).length);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  async function handleLogout() {
    try { await authApi.logout(); } catch (_) {}
    logout();
    router.replace('/login');
  }

  const effectiveRole = viewAsRole ?? user?.role ?? 'Admin';
  const config        = NAV_CONFIG[effectiveRole as UserProfile['role']] ?? { main: [], other: [] };
  const roleColor     = ROLE_COLOR[effectiveRole]  ?? '#7C3AED';
  const allItems      = [...config.main, ...config.other];
  const active        = allItems.find((i) => pathname === i.path || pathname.startsWith(i.path + '/'));
  const pageTitle     = active?.label ?? 'Dashboard';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, overflowY: 'auto', transition: 'transform 0.22s ease',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: ROLE_GRADIENT[user?.role ?? 'Admin'], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={17} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>SAMS</div>
              <div style={{ fontSize: '0.6rem', color: '#94A3B8', letterSpacing: '0.06em', marginTop: -1 }}>Sports Academy</div>
            </div>
          </div>

          {/* Role badge */}
          <div style={{ padding: '10px 14px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8, background: `${roleColor}0D`, border: `1px solid ${roleColor}22` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: roleColor }}>
                {viewAsRole ? `Viewing as ${viewAsRole}` : `${user?.role} Access`}
              </span>
            </div>
          </div>

          {/* Main nav */}
          <div style={{ padding: '6px 10px 0', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>Menu</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {config.main.map((item) => (
                <SidebarNavItem key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
          </div>

          {/* General nav */}
          <div style={{ padding: '0 10px 6px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>General</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {config.other.map((item) => (
                <SidebarNavItem key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
          </div>

          {/* Log out */}
          <div style={{ padding: '0 10px 8px' }}>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 9, color: '#94A3B8', cursor: 'pointer', fontSize: '0.855rem', fontWeight: 450, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; }}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              Log Out
            </button>
          </div>

          {/* User card */}
          <div style={{ padding: '8px 12px 14px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '8px 10px' }}>
              <UserAvatar user={user} size={34} />
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: 'var(--sidebar-width)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{ height: 62, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50, gap: 14 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{pageTitle}</div>
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div className="search-input" style={{ width: 200 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input placeholder="Search…" />
          </div>

          {/* Bell */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => setShowNotifPanel((p) => !p)}
              style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 99, background: '#EF4444', color: 'white', fontSize: '0.58rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--bg-surface)', lineHeight: 1 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserAvatar user={user} size={32} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.first_name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 'var(--density-py) var(--density-px)', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
