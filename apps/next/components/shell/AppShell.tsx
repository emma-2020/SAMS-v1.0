'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Activity,
  Dumbbell, MessageSquare, Settings, LogOut, Menu, Bell,
  ChevronUp, ChevronRight, Sun, Moon,
  Shield, Trophy, Zap, UserCircle, BarChart2, Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@sams/store';
import { authApi, notificationsApi, registrationApi } from '@sams/api';
import { useTheme } from '@/lib/theme/provider';
import { NAV_CONFIG } from '@sams/app';
import type { NavItem } from '@sams/app';
import type { Notification, UserProfile } from '@sams/api';
import OfflineIndicator from './OfflineIndicator';

// ── Icon resolver ──────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Activity,
  Dumbbell, MessageSquare, Settings, LogOut, Shield, Trophy, Zap, UserCircle, BarChart2, Video,
};
function NavIcon({ name, size = 16, ...rest }: { name: string; size?: number; [k: string]: unknown }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon size={size} {...(rest as object)} />;
}

// ── Colours ────────────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  Admin: '#7C3AED', Coach: '#7C3AED', Player: '#7C3AED', Parent: '#7C3AED',
};
const ROLE_GRADIENT: Record<string, string> = {
  Admin:  'linear-gradient(135deg,#4F46E5,#EC4899)',
  Coach:  'linear-gradient(135deg,#4F46E5,#EC4899)',
  Player: 'linear-gradient(135deg,#4F46E5,#EC4899)',
  Parent: 'linear-gradient(135deg,#4F46E5,#EC4899)',
};
const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  Admin: Shield, Coach: Trophy, Player: Zap, Parent: UserCircle,
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

// ── Avatar — inline initials, no external API dependency ──────────────────────
function UserAvatar({ user, size = 34 }: { user: UserProfile | null; size?: number }) {
  const color = ROLE_COLOR[user?.role ?? ''] ?? '#7C3AED';

  if (user?.avatar_url) {
    const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    return (
      <img src={user.avatar_url} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}40` }} />
    );
  }

  const initials = (
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`
  ).toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
      border: `2px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.34), fontWeight: 800,
      color: 'white', letterSpacing: '-0.02em', userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// ── Notification Panel ─────────────────────────────────────────────────────────
interface NotifPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

function NotificationPanel({ notifications, unreadCount, onMarkRead, onMarkAllRead, onRemove, onClose, onNavigate }: NotifPanelProps) {
  return (
    <div className="notif-panel-popup" style={{
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
                onClick={() => { if (!n.is_read) onMarkRead(n.id); if (n.link) { onNavigate(n.link); onClose(); } }}
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
                  {n.body && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{n.body}</div>}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                <button
                  onClick={ev => { ev.stopPropagation(); onRemove(n.id); }}
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

// ── Profile menu item ──────────────────────────────────────────────────────────
function MenuItem({ icon, label, onClick, danger, badge }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  danger?: boolean; badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        background: 'transparent', border: 'none',
        cursor: 'pointer', fontSize: '0.85rem',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        transition: 'background 0.12s', textAlign: 'left',
      }}
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

// ── Sidebar nav item ───────────────────────────────────────────────────────────
function SidebarNavItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const depth    = item.path.split('/').length;
  const isExact  = depth <= 3;
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
      onMouseEnter={e => { if (!activeCheck) { e.currentTarget.style.background = 'rgba(139,92,246,0.07)'; e.currentTarget.style.color = '#7C3AED'; } }}
      onMouseLeave={e => { if (!activeCheck) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
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
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen,     setSidebarOpen]    = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRolePicker,  setShowRolePicker]  = useState(false);
  const [viewAsRole,      setViewAsRole]      = useState<string | null>(null);
  const [showNotifPanel,   setShowNotifPanel]   = useState(false);
  const [notifications,    setNotifications]    = useState<Notification[]>([]);
  const [unreadCount,      setUnreadCount]      = useState(0);
  const [playerRegStatus,  setPlayerRegStatus]  = useState<string | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const rolePickerRef  = useRef<HTMLDivElement>(null);
  const notifRef       = useRef<HTMLDivElement>(null);

  useClickOutside(profileMenuRef, () => setShowProfileMenu(false));
  useClickOutside(rolePickerRef,  () => setShowRolePicker(false));
  useClickOutside(notifRef,       () => setShowNotifPanel(false));

  const failCount = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      failCount.current = 0;
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter(n => !n.is_read).length);
    } catch (_) {
      failCount.current += 1;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    // Normal cadence: every 30s. After 3 consecutive failures (backend down),
    // back off to every 5 minutes to avoid console spam.
    const id = setInterval(() => {
      if (failCount.current >= 3) return;
      fetchNotifications();
    }, 30_000);
    // Slow retry when circuit is open — resets failCount on success via fetchNotifications
    const backoffId = setInterval(() => {
      if (failCount.current >= 3) fetchNotifications();
    }, 5 * 60_000);
    return () => { clearInterval(id); clearInterval(backoffId); };
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (user?.role !== 'Player') return;
    registrationApi.getMyRegistration()
      .then(reg => setPlayerRegStatus(reg?.status ?? 'none'))
      .catch(() => setPlayerRegStatus('none'));
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(p => Math.max(0, p - 1));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(p => p.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const handleRemoveNotif = async (id: string) => {
    try {
      await notificationsApi.remove(id);
      const removed = notifications.find(n => n.id === id);
      setNotifications(p => p.filter(n => n.id !== id));
      if (removed && !removed.is_read) setUnreadCount(p => Math.max(0, p - 1));
    } catch (_) {}
  };

  async function handleLogout() {
    try { await authApi.logout(); } catch (_) {}
    logout();
    router.replace('/login');
  }

  function handleSwitchRole(role: string) {
    setShowRolePicker(false);
    if (role === user?.role) {
      setViewAsRole(null);
      router.replace(`/dashboard/${user.role.toLowerCase()}`);
    } else {
      setViewAsRole(role);
      router.replace(`/dashboard/${role.toLowerCase()}`);
    }
  }

  const effectiveRole = viewAsRole ?? user?.role ?? 'Admin';
  const config        = NAV_CONFIG[effectiveRole as UserProfile['role']] ?? { main: [], other: [] };
  const roleColor     = ROLE_COLOR[effectiveRole]       ?? '#7C3AED';
  const trueRoleColor = ROLE_COLOR[user?.role ?? '']    ?? '#7C3AED';
  // Hide the Registration tab for players once their registration is approved
  const filterReg     = (items: typeof config.main) =>
    effectiveRole === 'Player' && playerRegStatus === 'approved'
      ? items.filter(i => i.path !== '/dashboard/player/registration')
      : items;
  const allItems      = [...filterReg(config.main), ...config.other];
  const active        = allItems.find(i => pathname === i.path || pathname.startsWith(i.path + '/'));
  const pageTitle     = active?.label ?? 'Dashboard';

  const BOTTOM_NAV_ICONS = ['LayoutDashboard', 'CalendarDays', 'MessageSquare', 'Settings'];
  const bottomNavItems = BOTTOM_NAV_ICONS
    .map(icon => allItems.find(i => i.icon === icon))
    .filter((item): item is NavItem => Boolean(item));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          onTouchStart={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sams-sidebar${sidebarOpen ? ' sams-sidebar--open' : ''}`} style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, overflowY: 'auto', transition: 'transform 0.22s ease',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 18px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                background: user?.logo_url ? 'transparent' : ROLE_GRADIENT[user?.role ?? 'Admin'],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: `0 4px 12px ${trueRoleColor}40`,
              }}>
                {user?.logo_url
                  ? <img src={user.logo_url} alt="Academy logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Trophy size={17} color="white" strokeWidth={2.5} />}
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '0.04em', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.academy_name ?? 'SAMS'}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94A3B8', letterSpacing: '0.06em', marginTop: -1 }}>Sports Academy</div>
              </div>
            </div>
          </div>

          {/* Role badge */}
          <div style={{ padding: '10px 14px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8, background: `${roleColor}0D`, border: `1px solid ${roleColor}22` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, flexShrink: 0, boxShadow: `0 0 5px ${roleColor}80` }} />
              <span style={{ flex: 1, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: roleColor }}>
                {viewAsRole ? `Viewing as ${viewAsRole}` : `${user?.role} Access`}
              </span>
              {viewAsRole && (
                <button
                  onClick={() => { setViewAsRole(null); router.replace(`/dashboard/${user?.role?.toLowerCase()}`); }}
                  style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}25`, borderRadius: 5, color: roleColor, cursor: 'pointer', fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', letterSpacing: '0.04em' }}
                >
                  ← Back
                </button>
              )}
            </div>
          </div>

          {/* Main nav */}
          <div style={{ padding: '6px 10px 0', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>Menu</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filterReg(config.main).map(item => (
                <SidebarNavItem key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
          </div>

          {/* General nav */}
          <div style={{ padding: '0 10px 6px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>General</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {config.other.map(item => (
                <SidebarNavItem key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
          </div>

          {/* Log out */}
          <div style={{ padding: '0 10px 8px' }}>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 9, color: '#94A3B8', cursor: 'pointer', fontSize: '0.855rem', fontWeight: 450, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; }}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              Log Out
            </button>
          </div>

          {/* User card + role picker */}
          <div style={{ padding: '8px 12px 14px', borderTop: '1px solid var(--border-subtle)', position: 'relative' }} ref={rolePickerRef}>

            {/* Role picker popup (Admin only) */}
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
                {(['Admin', 'Coach', 'Player', 'Parent'] as const).map(role => {
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
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
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
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
              {user?.role === 'Admin' && (
                <ChevronUp size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: showRolePicker ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="sams-main-content" style={{ marginLeft: 'var(--sidebar-width)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>

        {/* Topbar */}
        {/* Note: padding-top for the Android/iOS status bar safe area is applied via the
            `.sams-topbar-header` CSS rule below (not inline) so it survives the mobile
            `padding` override with !important — see <style> block at the end of this component. */}
        <header className="sams-topbar-header" style={{ height: 62, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50, gap: 14 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            onTouchStart={() => setSidebarOpen(true)}
            className="topbar-mobile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 10, borderRadius: 8, touchAction: 'manipulation' }}
          >
            <Menu size={20} />
          </button>

          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{pageTitle}</div>

          {viewAsRole && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: `${ROLE_COLOR[viewAsRole]}0D`, border: `1px solid ${ROLE_COLOR[viewAsRole]}22` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: ROLE_COLOR[viewAsRole] }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ROLE_COLOR[viewAsRole] }}>
                Preview: {viewAsRole}
              </span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          <OfflineIndicator />

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
                  padding: '0 3px', border: '2px solid var(--bg-surface)', lineHeight: 1,
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
                onNavigate={path => router.push(path)}
              />
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

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
              <div className="topbar-user-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.first_name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user?.role}</span>
              </div>
              <ChevronUp className="topbar-chevron" size={12} style={{ color: 'var(--text-muted)', transform: showProfileMenu ? 'none' : 'rotate(180deg)', transition: 'transform 0.15s' }} />
            </button>

            {showProfileMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 248,
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 14, boxShadow: 'var(--shadow-xl)',
                animation: 'fadeIn 0.15s ease', overflow: 'hidden', zIndex: 200,
              }}>
                <div style={{ padding: '14px 16px', background: `linear-gradient(135deg, ${trueRoleColor}0D, var(--bg-elevated))`, borderBottom: '1px solid var(--border-subtle)' }}>
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
                  <MenuItem icon={<Settings size={15} />} label="Profile Settings" onClick={() => { router.push('/dashboard/settings'); setShowProfileMenu(false); }} />
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
        <main className="sams-page-main" style={{ flex: 1, padding: 'var(--density-py) var(--density-px)', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ─────────────────────────────────────── */}
      <nav className="sams-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: 'rgba(8,12,22,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'none',
        alignItems: 'center', justifyContent: 'space-around',
        zIndex: 50, padding: '0 4px',
      }}>
        {bottomNavItems.map(item => {
          // Same depth-based exact-match logic as SidebarNavItem
          const depth    = item.path.split('/').length;
          const isExact  = depth <= 3;
          const isActive = isExact
            ? pathname === item.path
            : pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              onTouchStart={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.65';
              }}
              onTouchEnd={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                router.push(item.path);
              }}
              onTouchCancel={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 4px', minHeight: 52, position: 'relative',
                color: isActive ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                touchAction: 'manipulation',
                transition: 'color 0.15s, opacity 0.12s',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '25%', right: '25%',
                  height: 2, borderRadius: '0 0 3px 3px',
                  background: 'linear-gradient(90deg, #EC4899, #8B5CF6)',
                }} />
              )}
              <NavIcon name={item.icon} size={20} strokeWidth={isActive ? 2.25 : 1.75} />
              <span style={{
                fontSize: '0.58rem', fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <style>{`
        /* Push the topbar below the native status bar on Capacitor Android/iOS.
           The Android WebView (edge-to-edge on API 35+/targetSdk 36 here) draws
           behind the system status bar with no automatic inset padding, unlike a
           native view — env(safe-area-inset-top) reports 0px on plain web/desktop
           so this is a no-op there. !important is required because it must win
           over both the inline \`padding\` shorthand above and the mobile
           \`padding\` override below (a shorthand reset always wins over a
           non-important longhand set earlier, regardless of source order). */
        .sams-topbar-header {
          padding-top: env(safe-area-inset-top, 0px) !important;
        }
        @media (max-width: 767px) {
          .sams-sidebar {
            transform: translateX(-100%);
            box-shadow: none;
            width: 100vw !important;
            max-width: 320px !important;
          }
          .sams-sidebar--open {
            transform: translateX(0) !important;
            box-shadow: 4px 0 40px rgba(0,0,0,0.25);
          }
          .sams-main-content {
            margin-left: 0 !important;
          }
          .sams-page-main {
            padding-bottom: calc(var(--density-py) + 64px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .sams-bottom-nav {
            display: flex !important;
            /* safe area for iPhone home bar */
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
            height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
          }
          /* Tighter topbar padding on mobile */
          .sams-topbar-header {
            padding: 0 16px !important;
            padding-top: env(safe-area-inset-top, 0px) !important;
          }
        }
      `}</style>
    </div>
  );
}
