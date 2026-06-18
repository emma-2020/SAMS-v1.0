'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Mail, CalendarDays, Shield, ArrowRight,
  CheckCircle2, Clock, UserPlus, TrendingUp,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { adminApi, teamsApi, scheduleApi } from '@sams/api';
import type { InvitationRecord, ScheduleEvent, Team, UserProfile } from '@sams/api';
import { useAuthStore } from '@sams/store';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function invStatus(inv: InvitationRecord): 'accepted' | 'expired' | 'pending' {
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

const STATUS_STYLE = {
  accepted: { color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  expired:  { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  pending:  { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
} as const;

const ROLE_BADGE_MAP: Record<string, { bg: string; color: string; border: string }> = {
  Admin:  { bg: '#F3EFFF', color: '#7C3AED', border: '#DDD6FE' },
  Coach:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  Player: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  Parent: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
};

const ROLE_COLORS_MAP: Record<string, string> = {
  Admin: '#7C3AED', Coach: '#2563EB', Player: '#059669', Parent: '#D97706',
};

// ─── sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_BADGE_MAP[role] ?? ROLE_BADGE_MAP.Player;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
      borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {role}
    </span>
  );
}

function InitialsAvatar({ name, role, size = 36 }: { name: string; role: string; size?: number }) {
  const color = ROLE_COLORS_MAP[role] ?? '#6366F1';
  const parts = (name || '').split(' ');
  const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}20`, border: `2px solid ${color}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 800, color,
    }}>
      {initials}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  gradient?: string;
  subtitle?: string;
  trend?: number | null;
  onClick?: () => void;
}

function KpiCard({ label, value, icon, color, gradient, subtitle, trend, onClick }: KpiCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered && onClick ? `${color}40` : '#F1F5F9'}`,
        borderRadius: 20,
        padding: '22px 22px 18px',
        boxShadow: hovered && onClick
          ? `0 12px 36px rgba(15,23,42,0.10), 0 4px 8px ${color}18`
          : '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
        textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', gap: 0,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
          {label}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: gradient ?? `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: gradient ? '#fff' : color,
          boxShadow: gradient ? `0 4px 12px ${color}30` : 'none',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {value}
        </span>
        {trend != null && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 5,
            fontSize: '0.8rem', fontWeight: 700,
            color: trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#94A3B8',
          }}>
            <TrendingUp size={13} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>{subtitle}</div>
      )}
    </button>
  );
}

function RegistrationDonut({ accepted, pending, expired, size = 130 }: {
  accepted: number; pending: number; expired: number; size?: number;
}) {
  const total = accepted + pending + expired;
  const rate  = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const segments = [
    { name: 'Accepted', value: Math.max(accepted, 0), color: '#10B981' },
    { name: 'Pending',  value: Math.max(pending,  0), color: '#F59E0B' },
    { name: 'Expired',  value: Math.max(expired,  0), color: '#E2E8F0' },
  ].filter(s => s.value > 0);
  const chartData = segments.length > 0 ? segments : [{ name: 'Empty', value: 1, color: '#F1F5F9' }];
  const cx = size / 2;
  const inner = Math.round(size * 0.30);
  const outer = Math.round(size * 0.44);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie data={chartData} cx={cx - 1} cy={cx - 1}
            innerRadius={inner} outerRadius={outer}
            startAngle={90} endAngle={-270} dataKey="value"
            strokeWidth={2} stroke="#fff">
            {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: Math.round(size * 0.20), fontWeight: 900, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {rate}%
          </span>
          <span style={{ fontSize: Math.round(size * 0.10), color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>
            accepted
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Accepted', color: '#10B981', count: accepted },
          { label: 'Pending',  color: '#F59E0B', count: pending  },
          { label: 'Expired',  color: '#E2E8F0', count: expired, textColor: '#94A3B8' },
        ].map(({ label, color, count, textColor }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: textColor ?? '#475569', fontWeight: 500 }}>
              {label} <strong style={{ color: textColor ?? '#0F172A' }}>{count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const OCEAN_PALETTE = [
  { from: '#0EA5E9', to: '#38BDF8' },
  { from: '#06B6D4', to: '#67E8F9' },
  { from: '#3B82F6', to: '#93C5FD' },
];

function OceanBarChart({ data, height = '100%' }: { data: { label: string; v: number }[]; height?: number | string }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="35%">
        <defs>
          {data.map((_, i) => {
            const p = OCEAN_PALETTE[i % OCEAN_PALETTE.length];
            return (
              <linearGradient key={i} id={`ocean-bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={p.from} stopOpacity={1} />
                <stop offset="100%" stopColor={p.to}   stopOpacity={0.65} />
              </linearGradient>
            );
          })}
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 10, boxShadow: '0 4px 16px rgba(15,23,42,0.08)', fontSize: '0.8rem' }}
          cursor={{ fill: 'rgba(14,165,233,0.05)', borderRadius: 6 } as React.CSSProperties}
          formatter={(v: number, n: string) => [`${v} member${v !== 1 ? 's' : ''}`, n]}
        />
        <Bar dataKey="v" radius={[7, 7, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => <Cell key={i} fill={`url(#ocean-bar-${i})`} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const CAL_DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function MiniCalendar({ events }: { events: ScheduleEvent[] }) {
  const [offset, setOffset] = useState(0);

  const base  = new Date();
  base.setMonth(base.getMonth() + offset, 1);
  const year  = base.getFullYear();
  const month = base.getMonth();
  const today = new Date();

  const eventMap: Record<number, string[]> = {};
  events.forEach(ev => {
    const d = new Date(ev.start_time);
    if (!isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
      const k = d.getDate();
      if (!eventMap[k]) eventMap[k] = [];
      const typeColors: Record<string, string> = {
        training: '#8B5CF6', match: '#EC4899', practice: '#0EA5E9',
        meeting: '#F59E0B', other: '#10B981',
      };
      eventMap[k].push(typeColors[ev.type] ?? '#8B5CF6');
    }
  });

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName   = base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number | null) =>
    d !== null && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setOffset(o => o - 1)}
          style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.01em' }}>
          {monthName}
        </span>
        <button
          onClick={() => setOffset(o => o + 1)}
          style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {CAL_DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: '#CBD5E1', padding: '2px 0', letterSpacing: '0.04em' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          const todayCell = isToday(day);
          const dots = day ? (eventMap[day] ?? []) : [];
          const hasDots = dots.length > 0;
          return (
            <div key={i} style={{
              textAlign: 'center', padding: '5px 2px 4px', borderRadius: 8, position: 'relative',
              background: todayCell
                ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)'
                : hasDots ? 'rgba(139,92,246,0.06)' : 'transparent',
              boxShadow: todayCell ? '0 2px 8px rgba(168,85,247,0.3)' : 'none',
            }}>
              {day !== null && (
                <>
                  <span style={{
                    display: 'block', fontSize: '0.72rem',
                    fontWeight: todayCell ? 700 : 400,
                    color: todayCell ? '#fff' : '#475569', lineHeight: 1.4,
                  }}>
                    {day}
                  </span>
                  {hasDots && !todayCell && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                      {dots.slice(0, 3).map((c, di) => (
                        <span key={di} style={{ width: 4, height: 4, borderRadius: '50%', background: c, display: 'inline-block' }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(eventMap).length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#8B5CF6', '#EC4899', '#0EA5E9'].map((c, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            {Object.values(eventMap).reduce((a, v) => a + v.length, 0)} event{Object.values(eventMap).reduce((a, v) => a + v.length, 0) !== 1 ? 's' : ''} this month
          </span>
        </div>
      )}
    </div>
  );
}

// ─── main dashboard ───────────────────────────────────────────────────────────

export function AdminDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();

  const today   = new Date();
  const hr      = today.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [members,     setMembers]     = useState<UserProfile[]>([]);
  const [teams,       setTeams]       = useState<Team[]>([]);
  const [events,      setEvents]      = useState<ScheduleEvent[]>([]);
  const [invLoading,  setInvLoading]  = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);

  useEffect(() => {
    adminApi.getInvitations()
      .then(setInvitations)
      .catch(() => {})
      .finally(() => setInvLoading(false));
    adminApi.getMembers()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setRosterLoading(false));
    teamsApi.getTeams().then(setTeams).catch(() => {});
    scheduleApi.getEvents().then(setEvents).catch(() => {});

    // Safety net: if the auth-refresh queue hangs (e.g. expired refresh token),
    // promises may never settle. Clear loading flags after 10 s so the dashboard
    // shows 0s instead of permanent dashes.
    const timeout = setTimeout(() => {
      setInvLoading(false);
      setRosterLoading(false);
    }, 10_000);
    return () => clearTimeout(timeout);
  }, []);

  const total      = invitations.length;
  const accepted   = invitations.filter(i => i.accepted_at).length;
  const pending    = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length;
  const expired    = total - accepted - pending;
  const recent     = invitations.slice(0, 6);

  const memberCount = members.length;
  const coachCount  = members.filter(m => m.role === 'Coach').length;
  const playerCount = members.filter(m => m.role === 'Player').length;
  const parentCount = members.filter(m => m.role === 'Parent').length;
  const teamCount   = teams.length;
  const eventCount  = events.length;

  const rosterBreakdown = [
    { label: 'Coaches',  v: coachCount  },
    { label: 'Players',  v: playerCount },
    { label: 'Parents',  v: parentCount },
  ].filter(r => r.v > 0);

  const quickActions = [
    { label: 'Invite Member',    path: '/dashboard/admin/invite',   icon: UserPlus,     color: '#EC4899', gradient: 'linear-gradient(135deg,#EC4899,#8B5CF6)', desc: 'Add coach, player or parent' },
    { label: 'View Roster',      path: '/dashboard/admin/roster',   icon: Users,        color: '#2563EB', gradient: undefined, desc: 'Browse all academy members' },
    { label: 'Manage Teams',     path: '/dashboard/admin/teams',    icon: Shield,       color: '#7C3AED', gradient: undefined, desc: 'Team assignments & rosters' },
    { label: 'Academy Schedule', path: '/dashboard/admin/schedule', icon: CalendarDays, color: '#059669', gradient: undefined, desc: 'Calendar & event planner' },
    { label: 'Academy Chat',     path: '/dashboard/admin/chat',     icon: Mail,         color: '#D97706', gradient: undefined, desc: 'Team communications' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40, animation: 'fadeIn 0.3s ease' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 45%, #EC4899 100%)',
        borderRadius: 22, padding: '28px 32px 26px',
        marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', left: '35%', bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: 120, top: 10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div className="sams-hero-inner" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.3rem,4vw,1.65rem)', color: '#fff', margin: '0 0 8px', letterSpacing: '-0.025em' }}>
              {greeting}, {user?.first_name}!
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: `${rosterLoading ? '—' : memberCount} members`, icon: '👥' },
                { label: `${teamCount} team${teamCount !== 1 ? 's' : ''}`, icon: '🏆' },
                { label: `${eventCount} upcoming`, icon: '📅' },
              ].map(({ label, icon }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  <span style={{ fontSize: '0.9rem' }}>{icon}</span> {label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin/invite')}
            className="sams-hero-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              padding: '12px 22px', borderRadius: 12,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              backdropFilter: 'blur(10px)', transition: 'all 0.15s', letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.26)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
          >
            <UserPlus size={16} /> Invite Member
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="kpi-grid-4" style={{ marginBottom: 24, gap: 16 }}>
        <KpiCard
          label="Total Members"
          value={rosterLoading ? '—' : memberCount}
          icon={<Users size={18} />}
          color="#6366F1"
          gradient="linear-gradient(135deg,#6366F1,#818CF8)"
          subtitle={`${coachCount} coaches · ${playerCount} players · ${parentCount} parents`}
          onClick={() => router.push('/dashboard/admin/roster')}
        />
        <KpiCard
          label="Active Teams"
          value={teamCount}
          icon={<Shield size={18} />}
          color="#7C3AED"
          gradient="linear-gradient(135deg,#7C3AED,#A78BFA)"
          subtitle="Registered team groups"
          onClick={() => router.push('/dashboard/admin/teams')}
        />
        <KpiCard
          label="Invites Accepted"
          value={invLoading ? '—' : accepted}
          icon={<CheckCircle2 size={18} />}
          color="#10B981"
          gradient="linear-gradient(135deg,#059669,#34D399)"
          trend={total > 0 ? Math.round((accepted / total) * 100) : null}
          subtitle="Registration rate"
          onClick={() => router.push('/dashboard/admin/invite')}
        />
        <KpiCard
          label="Pending Invites"
          value={invLoading ? '—' : pending}
          icon={<Clock size={18} />}
          color="#F59E0B"
          gradient="linear-gradient(135deg,#D97706,#FBBF24)"
          subtitle="Awaiting registration"
          onClick={() => router.push('/dashboard/admin/invite')}
        />
      </div>

      {/* ── Analytics + Calendar row ── */}
      <div className="admin-dash-2col" style={{ marginBottom: 20 }}>

        {/* Analytics card */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 24px',
          display: 'flex', flexDirection: 'column', minHeight: 300,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Registration Analytics</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>Invitation acceptance & member breakdown</div>
            </div>
            <button
              onClick={() => router.push('/dashboard/admin/invite')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#7C3AED', padding: '4px 8px', borderRadius: 7 }}
            >
              Manage <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'stretch', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CBD5E1', marginBottom: 8 }}>
                Acceptance Rate
              </div>
              <RegistrationDonut accepted={accepted} pending={pending} expired={expired} size={150} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CBD5E1', marginBottom: 10 }}>
                Member Distribution
              </div>
              <div style={{ flex: 1, minHeight: 130 }}>
                {rosterBreakdown.length > 0 ? (
                  <OceanBarChart data={rosterBreakdown} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.8rem' }}>
                    No roster data yet
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Coaches', v: coachCount, color: '#0EA5E9' },
                  { label: 'Players', v: playerCount, color: '#06B6D4' },
                  { label: 'Parents', v: parentCount, color: '#3B82F6' },
                ].map(({ label, v, color }) => (
                  <span
                    key={label}
                    onClick={() => router.push('/dashboard/admin/roster')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: `${color}0F`, border: `1px solid ${color}22`, cursor: 'pointer' }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>{label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar card */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 20px', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Academy Calendar</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>Upcoming sessions & events</div>
          </div>
          <MiniCalendar events={events} />
          {eventCount > 0 && (
            <button
              onClick={() => router.push('/dashboard/admin/schedule')}
              style={{
                marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                width: '100%', padding: '9px', borderRadius: 10,
                background: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
                border: 'none', cursor: 'pointer', color: '#fff',
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.01em',
                boxShadow: '0 4px 12px rgba(168,85,247,0.25)',
              }}
            >
              <CalendarDays size={14} /> View Full Schedule
            </button>
          )}
        </div>
      </div>

      {/* ── Invitations + Quick Actions row ── */}
      <div className="admin-dash-2col">

        {/* Recent Invitations */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg,#6366F1,#EC4899,#8B5CF6)', width: '100%' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Recent Invitations</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>Latest member invitations across all roles</div>
            </div>
            <button
              onClick={() => router.push('/dashboard/admin/invite')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#7C3AED', padding: '4px 8px', borderRadius: 7 }}
            >
              View all <ArrowRight size={13} />
            </button>
          </div>

          {recent.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', color: '#94A3B8', fontSize: '0.875rem', gap: 8 }}>
              <Mail size={22} />
              <span style={{ fontWeight: 700, color: '#0F172A' }}>No invitations yet</span>
              <span>Send your first invitation to get started.</span>
              <button
                onClick={() => router.push('/dashboard/admin/invite')}
                style={{ marginTop: 8, padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Send Invitation
              </button>
            </div>
          ) : (
            <div className="table-scroll-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  {['Member', 'Role', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 22px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(inv => {
                  const st  = invStatus(inv);
                  const sty = STATUS_STYLE[st];
                  const fullName = `${inv.first_name ?? ''} ${inv.last_name ?? ''}`.trim() || inv.email;
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '12px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <InitialsAvatar name={fullName} role={inv.role} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>{fullName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>{inv.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 22px' }}><RoleBadge role={inv.role} /></td>
                      <td style={{ padding: '12px 22px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: sty.bg, color: sty.color, border: `1px solid ${sty.border}`, textTransform: 'capitalize' }}>
                          {st}
                        </span>
                      </td>
                      <td style={{ padding: '12px 22px', color: '#94A3B8', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(inv.created_at ?? inv.expires_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 18px', overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg,#7C3AED,#A78BFA)', borderRadius: '3px 3px 0 0', margin: '-22px -18px 18px' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: 4 }}>Quick Actions</div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: 16 }}>Common admin tasks</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickActions.map(({ label, path, icon: Icon, color, gradient, desc }) => (
              <button
                key={path}
                onClick={() => router.push(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px',
                  background: '#FAFAFA', border: '1px solid #F1F5F9',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = `${color}35`;
                  el.style.background = `${color}06`;
                  el.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = '#F1F5F9';
                  el.style.background = '#FAFAFA';
                  el.style.transform = 'none';
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: gradient ?? `${color}14`,
                  border: gradient ? 'none' : `1px solid ${color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: gradient ? '#fff' : color,
                  boxShadow: gradient ? `0 3px 8px ${color}30` : 'none',
                }}>
                  <Icon size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.855rem', color: '#0F172A' }}>{label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>{desc}</div>
                </div>
                <ArrowRight size={13} style={{ color: '#CBD5E1', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
