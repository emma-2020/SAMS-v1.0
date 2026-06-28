'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Mail, CalendarDays, Shield, ArrowRight,
  CheckCircle2, Clock, UserPlus,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { adminApi, teamsApi, scheduleApi, analyticsApi } from '@sams/api';
import type { InvitationRecord, ScheduleEvent, Team, UserProfile, AnalyticsSummary } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';

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

// ─── Cliniva card components ──────────────────────────────────────────────────

function InlineSpark({ data, color, height = 48 }: {
  data: number[]; color: string; height?: number;
}) {
  if (data.length < 2) return <div style={{ height }} />;
  const W = 200, H = height, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W - pad},${H} L${pad},${H} Z`;
  const uid  = color.replace(/[^a-z0-9]/gi, '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`adsg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#adsg-${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminSolidCard({ gradient, shadowColor, icon, value, label, sub, onClick, delay = 0 }: {
  gradient: string; shadowColor: string; icon: React.ReactNode;
  value: string | number; label: string; sub?: string;
  onClick?: () => void; delay?: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: gradient, borderRadius: 20, padding: '24px 22px 20px',
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov ? `0 22px 44px ${shadowColor}55` : `0 8px 28px ${shadowColor}30`,
        transform: hov ? 'translateY(-5px)' : 'none',
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `fadeIn 0.5s ease ${delay}ms both`,
      }}
    >
      <div style={{ position: 'absolute', right: -20, top: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 55, bottom: -45, width: 95, height: 95, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 18, color: '#fff' }}>
        {icon}
      </div>
      <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{label}</div>
      {sub && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.22)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontWeight: 700 }}>↑</span> {sub}
        </div>
      )}
    </div>
  );
}

function AdminProgressCard({ icon, label, value, desc, pct, color, onClick, delay = 0 }: {
  icon: string; label: string; value: string; desc: string;
  pct: number; color: string; onClick?: () => void; delay?: number;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay + 350);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      onClick={onClick}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: '20px', cursor: onClick ? 'pointer' : 'default', boxShadow: 'var(--shadow-sm)', animation: `fadeIn 0.5s ease ${delay}ms both`, transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}22`; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
        <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14 }}>{desc}</div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: animated ? `${Math.min(Math.max(pct, 3), 100)}%` : '0%', background: `linear-gradient(90deg, ${color}, ${color}99)`, transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ fontSize: '0.68rem', color, fontWeight: 700, marginTop: 5 }}>Change {pct}%</div>
    </div>
  );
}

function AdminSparkCard({ icon, label, value, sub, data, color, onClick, delay = 0 }: {
  icon: string; label: string; value: string; sub?: string;
  data: number[]; color: string; onClick?: () => void; delay?: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: 'var(--bg-surface)', border: `1px solid ${hov ? color + '44' : color + '22'}`, borderRadius: 18, padding: '18px 20px 0', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', boxShadow: hov ? `0 8px 24px ${color}20` : 'var(--shadow-sm)', transition: 'all 0.2s ease', animation: `fadeIn 0.5s ease ${delay}ms both` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: `${color}16`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.45rem', flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</div>
          {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      <InlineSpark data={data} color={color} height={48} />
    </div>
  );
}

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
    <ResponsiveContainer width="100%" height={height as number}>
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
          cursor={{ fill: 'rgba(14,165,233,0.05)', borderRadius: 6 } as any}
          formatter={(v: any, n: any) => [`${v} member${v !== 1 ? 's' : ''}`, n]}
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
  const [summary,     setSummary]     = useState<AnalyticsSummary | null>(null);
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
    analyticsApi.getAnalyticsSummary().then(setSummary).catch(() => {});

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
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20, animation: 'fadeIn 0.3s ease' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 45%, #EC4899 100%)',
        borderRadius: 22, padding: '28px 32px 26px',
        marginBottom: 20, position: 'relative', overflow: 'hidden',
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

      {/* ── Announcements ── */}
      <AnnouncementsBanner role="Admin" />

      {/* ── ROW 1 — Solid KPI Cards ── */}
      <div className="kpi-grid-4" style={{ marginBottom: 16, gap: 16 }}>
        <AdminSolidCard
          gradient="linear-gradient(135deg, #4338CA 0%, #6366F1 100%)"
          shadowColor="#6366F1" icon={<Users size={22} />}
          value={rosterLoading ? '—' : memberCount}
          label="Total Members"
          sub={`${coachCount} coaches · ${playerCount} players · ${parentCount} parents`}
          onClick={() => router.push('/dashboard/admin/roster')}
          delay={0}
        />
        <AdminSolidCard
          gradient="linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)"
          shadowColor="#7C3AED" icon={<Shield size={22} />}
          value={teamCount}
          label="Active Teams"
          sub="Registered team groups"
          onClick={() => router.push('/dashboard/admin/teams')}
          delay={80}
        />
        <AdminSolidCard
          gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)"
          shadowColor="#10B981" icon={<CheckCircle2 size={22} />}
          value={invLoading ? '—' : accepted}
          label="Invites Accepted"
          sub={total > 0 ? `${Math.round((accepted / total) * 100)}% acceptance rate` : 'Registration rate'}
          onClick={() => router.push('/dashboard/admin/invite')}
          delay={160}
        />
        <AdminSolidCard
          gradient="linear-gradient(135deg, #B45309 0%, #F59E0B 100%)"
          shadowColor="#F59E0B" icon={<Clock size={22} />}
          value={invLoading ? '—' : pending}
          label="Pending Invites"
          sub="Awaiting registration"
          onClick={() => router.push('/dashboard/admin/invite')}
          delay={240}
        />
      </div>

      {/* ── ROW 2 — Analytics Pulse Progress Cards ── */}
      {summary && (
        <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 16 }}>
          <AdminProgressCard
            icon="💰" label="Outstanding Fees"
            value={`GHS ${summary.outstandingFees.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            desc={`${summary.collectionRate}% collected`}
            pct={Math.max(100 - summary.collectionRate, 3)} color={summary.outstandingFees > 0 ? '#EF4444' : '#10B981'}
            onClick={() => router.push('/dashboard/admin/analytics')}
            delay={80}
          />
          <AdminProgressCard
            icon={summary.wellnessFlags > 0 ? '⚠️' : '✅'} label="Wellness Flags"
            value={String(summary.wellnessFlags)}
            desc={`${summary.flaggedPlayers} player${summary.flaggedPlayers !== 1 ? 's' : ''} · last 30 days`}
            pct={Math.max(Math.min(Math.round((summary.wellnessFlags / Math.max(summary.totalPlayers, 1)) * 100), 100), 3)}
            color={summary.wellnessFlags > 0 ? '#F59E0B' : '#10B981'}
            onClick={() => router.push('/dashboard/coach/analytics')}
            delay={160}
          />
          <AdminProgressCard
            icon="⚽" label="Active Players"
            value={String(summary.totalPlayers)}
            desc="Registered players"
            pct={Math.max(Math.min(Math.round((summary.totalPlayers / Math.max(memberCount, 1)) * 100), 100), 10)}
            color="#7C3AED"
            onClick={() => router.push('/dashboard/admin/roster')}
            delay={240}
          />
          <AdminProgressCard
            icon="📅" label="Events (30d)"
            value={String(summary.recentEvents)}
            desc="Sessions in last 30 days"
            pct={Math.max(Math.min(Math.round((summary.recentEvents / 20) * 100), 100), 5)}
            color="#0EA5E9"
            onClick={() => router.push('/dashboard/admin/schedule')}
            delay={320}
          />
        </div>
      )}

      {/* ── ROW 3 — Sparkline Cards ── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 16 }}>
        <AdminSparkCard
          icon="👥" label="Members" color="#6366F1"
          data={[memberCount - 3, memberCount - 1, memberCount - 2, memberCount, memberCount + 1, memberCount, memberCount + 2, memberCount]}
          value={rosterLoading ? '—' : String(memberCount)} sub="Total in academy"
          onClick={() => router.push('/dashboard/admin/roster')} delay={80}
        />
        <AdminSparkCard
          icon="🏆" label="Teams" color="#7C3AED"
          data={[teamCount, teamCount, teamCount + 1, teamCount, teamCount, teamCount + 1, teamCount, teamCount]}
          value={String(teamCount)} sub="Active teams"
          onClick={() => router.push('/dashboard/admin/teams')} delay={160}
        />
        <AdminSparkCard
          icon="✉️" label="Invites Sent" color="#10B981"
          data={[total - 3, total - 1, accepted, accepted + 1, accepted, total, accepted + 2, total]}
          value={invLoading ? '—' : String(total)} sub={`${accepted} accepted`}
          onClick={() => router.push('/dashboard/admin/invite')} delay={240}
        />
        <AdminSparkCard
          icon="📅" label="Events" color="#0EA5E9"
          data={[eventCount - 2, eventCount, eventCount + 1, eventCount - 1, eventCount, eventCount + 2, eventCount, eventCount + 1]}
          value={String(eventCount)} sub="This month"
          onClick={() => router.push('/dashboard/admin/schedule')} delay={320}
        />
      </div>

      {/* ── Analytics + Calendar row ── */}
      <div className="admin-dash-2col" style={{ marginBottom: 14 }}>

        {/* Analytics card */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.03)',
          padding: '22px 24px',
          display: 'flex', flexDirection: 'column',
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
