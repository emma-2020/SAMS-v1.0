'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { coachApi, healthApi, scheduleApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { Player, HealthEntry, ScheduleEvent } from '@sams/api';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════════
   INLINE SPARKLINE
═══════════════════════════════════════════════════════════════ */

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
        <linearGradient id={`csg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#csg-${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOLID HERO CARD  (Cliniva top-row style — full gradient bg)
═══════════════════════════════════════════════════════════════ */

function SolidCard({ gradient, shadowColor, icon, value, label, sub, onClick, delay = 0 }: {
  gradient: string; shadowColor: string; icon: string;
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
        background: gradient,
        borderRadius: 20,
        padding: '24px 22px 20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov ? `0 22px 44px ${shadowColor}55` : `0 8px 28px ${shadowColor}30`,
        transform: hov ? 'translateY(-5px)' : 'none',
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `fadeIn 0.5s ease ${delay}ms both`,
      }}
    >
      {/* Decorative orbs */}
      <div style={{ position: 'absolute', right: -20, top: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 55, bottom: -45, width: 95, height: 95, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

      {/* Icon */}
      <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 18 }}>
        {icon}
      </div>

      {/* Value */}
      <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>
        {label}
      </div>

      {sub && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.22)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontWeight: 700 }}>↑</span> {sub}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROGRESS CARD  (Cliniva second-row style — white + progress bar)
═══════════════════════════════════════════════════════════════ */

function ProgressCard({ icon, label, value, desc, pct, color, onClick, delay = 0 }: {
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
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-sm)',
        animation: `fadeIn 0.5s ease ${delay}ms both`,
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
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
        <div style={{
          height: '100%', borderRadius: 99,
          width: animated ? `${Math.min(Math.max(pct, 3), 100)}%` : '0%',
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <div style={{ fontSize: '0.68rem', color, fontWeight: 700, marginTop: 5 }}>Change {pct}%</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE STAT CARD  (Cliniva third-row style — tinted bg + wave)
═══════════════════════════════════════════════════════════════ */

function SparkCard({ icon, label, value, sub, data, color, onClick, delay = 0 }: {
  icon: string; label: string; value: string; sub?: string;
  data: number[]; color: string; onClick?: () => void; delay?: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${hov ? color + '44' : color + '22'}`,
        borderRadius: 18,
        padding: '18px 20px 0',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov ? `0 8px 24px ${color}20` : 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
        animation: `fadeIn 0.5s ease ${delay}ms both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: `${color}16`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.45rem', flexShrink: 0 }}>
          {icon}
        </div>
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

/* ═══════════════════════════════════════════════════════════════
   WEEK CALENDAR STRIP  (Cliniva appointment widget)
═══════════════════════════════════════════════════════════════ */

function WeekCalendarStrip({ events }: { events: ScheduleEvent[] }) {
  const today = new Date();
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TYPE_COLORS: Record<string, string> = {
    Practice: '#8B5CF6', Match: '#EC4899', Game: '#EF4444', Training: '#3B82F6', Other: '#94A3B8',
  };

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 2 + i);
    return d;
  });

  const eventMap: Record<string, ScheduleEvent[]> = {};
  events.forEach(ev => {
    const key = new Date(ev.start_time).toDateString();
    if (!eventMap[key]) eventMap[key] = [];
    eventMap[key].push(ev);
  });

  const todaySessions   = eventMap[today.toDateString()] ?? [];
  const upcomingSessions = events
    .filter(ev => new Date(ev.start_time) >= today)
    .slice(0, 4);

  return (
    <div>
      {/* 7-day strip */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {week.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const hasEv   = !!eventMap[d.toDateString()];
          return (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '10px 2px', borderRadius: 12,
              background: isToday
                ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
                : hasEv ? 'rgba(124,58,237,0.07)' : 'var(--bg-elevated)',
              border: isToday ? 'none' : `1px solid ${hasEv ? '#DDD6FE' : 'var(--border-subtle)'}`,
              boxShadow: isToday ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: '0.56rem', fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 5 }}>
                {DAY_NAMES[d.getDay()]}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isToday ? '#fff' : hasEv ? '#7C3AED' : 'var(--text-primary)' }}>
                {d.getDate()}
              </div>
              {hasEv && !isToday && (
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED', margin: '4px auto 0' }} />
              )}
            </div>
          );
        })}
      </div>

      {todaySessions.length > 0 && (
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7C3AED', marginBottom: 12 }}>
          {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} today
        </div>
      )}

      {upcomingSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No upcoming sessions scheduled
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {upcomingSessions.map(ev => {
            const col = TYPE_COLORS[ev.type] ?? '#94A3B8';
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${col}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.855rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(ev.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${col}18`, color: col, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                  {ev.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════ */

export function CoachDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();

  const [players,  setPlayers]  = useState<Player[]>([]);
  const [alerts,   setAlerts]   = useState<HealthEntry[]>([]);
  const [events,   setEvents]   = useState<ScheduleEvent[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      coachApi.getPlayers(),
      healthApi.getHealthAlerts(),
      scheduleApi.getEvents(),
    ])
      .then(([p, a, e]) => {
        setPlayers(p ?? []);
        setAlerts(a ?? []);
        setEvents(e ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived stats ─────────────────────────────────────────── */
  const playerCount   = players.length;
  const avgHealth     = playerCount
    ? Math.round(players.reduce((s, p) => s + (p.latest_health?.overall_score ?? 0), 0) / playerCount)
    : 0;
  const alertCount    = alerts.length;
  const upcomingCount = events.filter(e => new Date(e.start_time) >= new Date()).length;

  const fitCount     = players.filter(p => (p.latest_health?.overall_score ?? -1) >= 70).length;
  const modCount     = players.filter(p => { const s = p.latest_health?.overall_score ?? -1; return s >= 40 && s < 70; }).length;
  const alertPlayers = players.filter(p => { const s = p.latest_health?.overall_score ?? -1; return s >= 0 && s < 40; }).length;
  const noDataCount  = players.filter(p => p.latest_health?.overall_score == null).length;

  const fitPct      = playerCount ? Math.round((fitCount / playerCount) * 100)           : 0;
  const covPct      = playerCount ? Math.round(((playerCount - noDataCount) / playerCount) * 100) : 0;
  const alertRatePct = playerCount ? Math.round((alertPlayers / playerCount) * 100)       : 0;
  const sessionLoad  = Math.min(Math.round((upcomingCount / 10) * 100), 100);

  /* ── Chart data ────────────────────────────────────────────── */
  const healthDonut = [
    { name: 'Fit',      value: fitCount,     color: '#10B981' },
    { name: 'Moderate', value: modCount,      color: '#F59E0B' },
    { name: 'Alert',    value: alertPlayers,  color: '#EF4444' },
    { name: 'No Data',  value: noDataCount,   color: '#CBD5E1' },
  ].filter(d => d.value > 0);

  const typeMap: Record<string, number> = {};
  events.forEach(ev => { const t = ev.type ?? 'Other'; typeMap[t] = (typeMap[t] || 0) + 1; });
  const sessionTypeData = Object.entries(typeMap).map(([name, v]) => ({ name, v }));

  const TYPE_COLORS: Record<string, string> = {
    Practice: '#8B5CF6', Match: '#EC4899', Game: '#EF4444', Training: '#3B82F6', Other: '#94A3B8',
  };

  /* ── Sparkline data ────────────────────────────────────────── */
  const sortedAlerts = [...alerts].sort((a, b) =>
    new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );
  const wellnessSpark = sortedAlerts.length >= 2
    ? sortedAlerts.slice(-8).map(a => a.overall_score)
    : [55, 62, 58, 70, 65, 72, 68, Math.max(avgHealth, 50)];

  const playersSpark  = [playerCount, playerCount, playerCount + 1, playerCount, playerCount, playerCount + 1, playerCount, playerCount];
  const sessionsSpark = [2, 3, 1, 4, 2, upcomingCount, 3, upcomingCount];
  const alertsSpark   = [1, alertCount + 2, alertCount, alertCount + 1, alertCount, alertCount + 1, alertCount, alertCount];

  /* ── Misc ──────────────────────────────────────────────────── */
  const today    = new Date();
  const hr       = today.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  const quickActions = [
    { label: 'Player Management', icon: '👥', path: '/dashboard/coach/players',    desc: 'View profiles & stats',       color: '#7C3AED' },
    { label: 'Training Plans',    icon: '🏋️', path: '/dashboard/coach/workouts',   desc: 'Create & assign workouts',    color: '#D97706' },
    { label: 'Mark Attendance',   icon: '✅', path: '/dashboard/coach/attendance', desc: 'Log present/absent/injured',  color: '#10B981' },
    { label: 'Health Monitor',    icon: '❤️', path: '/dashboard/coach/health',     desc: 'Player wellness overview',    color: '#EF4444' },
    { label: 'Team Chat',         icon: '💬', path: '/dashboard/coach/chat',       desc: 'Message your team',           color: '#3B82F6' },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 45%, #EC4899 100%)',
        borderRadius: 22, padding: '28px 32px 26px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '35%', bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div className="sams-hero-inner" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.3rem,4vw,1.65rem)', color: '#fff', margin: '0 0 8px', letterSpacing: '-0.025em' }}>
              {greeting}, Coach {user?.first_name}! 🏆
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: `${loading ? '…' : playerCount} players`, icon: '👥' },
                { label: `${upcomingCount} upcoming`, icon: '📅' },
                { label: `${alertCount} alert${alertCount !== 1 ? 's' : ''}`, icon: '⚠️' },
              ].map(({ label, icon }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  <span>{icon}</span> {label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/coach/players')}
            className="sams-hero-btn"
            style={{
              flexShrink: 0, padding: '11px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              color: '#fff', fontWeight: 700, fontSize: '0.855rem', cursor: 'pointer',
              backdropFilter: 'blur(8px)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.26)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            👥 Manage Players
          </button>
        </div>
      </div>

      <AnnouncementsBanner role="Coach" />

      {/* ── ROW 1 — Solid Hero Cards ─────────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 18 }}>
        <SolidCard
          gradient="linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
          shadowColor="#3B82F6" icon="👥"
          value={loading ? '…' : playerCount}
          label="My Players"
          sub="Registered in your academy"
          onClick={() => router.push('/dashboard/coach/players')}
          delay={0}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)"
          shadowColor="#10B981" icon="💚"
          value={loading ? '…' : `${avgHealth}%`}
          label="Avg Wellness"
          sub="Team health average"
          onClick={() => router.push('/dashboard/coach/health')}
          delay={80}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #B45309 0%, #F59E0B 100%)"
          shadowColor="#F59E0B" icon="🚨"
          value={loading ? '…' : alertCount}
          label="Health Alerts"
          sub="Flagged for attention"
          onClick={() => router.push('/dashboard/coach/health')}
          delay={160}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #6D28D9 0%, #EC4899 100%)"
          shadowColor="#8B5CF6" icon="📅"
          value={loading ? '…' : upcomingCount}
          label="Upcoming (14d)"
          sub="Scheduled sessions"
          onClick={() => router.push('/dashboard/coach/schedule')}
          delay={240}
        />
      </div>

      {/* ── ROW 2 — Progress Bar Cards ───────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 18 }}>
        <ProgressCard
          icon="💪" label="Player Fitness"
          value={`${fitCount}`}
          desc="Players with wellness ≥ 70"
          pct={fitPct} color="#10B981"
          onClick={() => router.push('/dashboard/coach/health')}
          delay={80}
        />
        <ProgressCard
          icon="📊" label="Health Coverage"
          value={`${playerCount - noDataCount}`}
          desc="Players with wellness logged"
          pct={covPct} color="#3B82F6"
          onClick={() => router.push('/dashboard/coach/health')}
          delay={160}
        />
        <ProgressCard
          icon="⚠️" label="Alert Rate"
          value={`${alertPlayers}`}
          desc="Players needing attention"
          pct={alertRatePct || 2} color="#EF4444"
          onClick={() => router.push('/dashboard/coach/health')}
          delay={240}
        />
        <ProgressCard
          icon="🗓️" label="Session Load"
          value={`${upcomingCount}`}
          desc="Sessions in next 14 days"
          pct={sessionLoad || 8} color="#8B5CF6"
          onClick={() => router.push('/dashboard/coach/schedule')}
          delay={320}
        />
      </div>

      {/* ── ROW 3 — Sparkline Cards ──────────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 24 }}>
        <SparkCard
          icon="👥" label="Players" data={playersSpark} color="#3B82F6"
          value={loading ? '…' : String(playerCount)} sub="Total registered"
          onClick={() => router.push('/dashboard/coach/players')} delay={80}
        />
        <SparkCard
          icon="💚" label="Wellness Trend" data={wellnessSpark} color="#10B981"
          value={loading ? '…' : `${avgHealth}%`} sub="Avg across team"
          onClick={() => router.push('/dashboard/coach/health')} delay={160}
        />
        <SparkCard
          icon="📅" label="Sessions" data={sessionsSpark} color="#8B5CF6"
          value={loading ? '…' : String(upcomingCount)} sub="Upcoming sessions"
          onClick={() => router.push('/dashboard/coach/schedule')} delay={240}
        />
        <SparkCard
          icon="🚨" label="Alerts" data={alertsSpark} color="#EF4444"
          value={loading ? '…' : String(alertCount)} sub="Active health flags"
          onClick={() => router.push('/dashboard/coach/health')} delay={320}
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="coach-charts-row" style={{ display: 'grid', gap: 16, marginBottom: 18 }}>

        {/* Session Types Bar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 200ms both' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Session Types</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 18 }}>Breakdown by category</div>
          {sessionTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sessionTypeData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: '0.8rem' }}
                  cursor={{ fill: 'rgba(139,92,246,0.06)' }}
                />
                <Bar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={44}>
                  {sessionTypeData.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.name] ?? '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No sessions yet
            </div>
          )}
        </div>

        {/* Health Distribution Donut */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 280ms both' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Player Health</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14 }}>Wellness distribution</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={150} height={150}>
              <Pie
                data={healthDonut.length > 0 ? healthDonut : [{ name: 'No Data', value: 1, color: '#E2E8F0' }]}
                cx={73} cy={73} innerRadius={46} outerRadius={66}
                startAngle={90} endAngle={-270} dataKey="value"
                strokeWidth={2} stroke="var(--bg-surface)"
              >
                {(healthDonut.length > 0 ? healthDonut : [{ color: '#E2E8F0' }]).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 }}>
            {[
              { label: 'Fit',      color: '#10B981', count: fitCount     },
              { label: 'Moderate', color: '#F59E0B', count: modCount     },
              { label: 'Alert',    color: '#EF4444', count: alertPlayers  },
              { label: 'No Data',  color: '#94A3B8', count: noDataCount   },
            ].map(({ label, color, count }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {label} <strong style={{ color: 'var(--text-primary)' }}>{count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions Calendar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 360ms both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Sessions</div>
            <button onClick={() => router.push('/dashboard/coach/schedule')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>View all →</button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>This week &amp; upcoming</div>
          <WeekCalendarStrip events={events} />
        </div>
      </div>

      {/* ── Bottom Row: Quick Actions + Health Alerts ────────────── */}
      <div className="coach-bottom-row" style={{ display: 'grid', gap: 16 }}>

        {/* Quick Actions */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 400ms both' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #4F46E5, #EC4899)' }} />
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Quick Actions</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Common coaching tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quickActions.map(a => (
                <button
                  key={a.path}
                  onClick={() => router.push(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${a.color}40`; el.style.background = `${a.color}06`; el.style.transform = 'translateX(3px)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-subtle)'; el.style.background = 'var(--bg-elevated)'; el.style.transform = 'none'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}14`, border: `1px solid ${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.855rem', color: 'var(--text-primary)' }}>{a.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{a.desc}</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Health Alerts */}
        {alerts.length > 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 480ms both' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #EF4444, #F59E0B)' }} />
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Health Alerts</div>
                <button onClick={() => router.push('/dashboard/coach/health')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#EF4444' }}>View all →</button>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#EF4444', marginBottom: 16 }}>{alerts.length} player{alerts.length !== 1 ? 's' : ''} needing attention</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.slice(0, 5).map(a => {
                  const score     = a.overall_score;
                  const col       = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
                  const lbl       = score >= 70 ? 'Good' : score >= 40 ? 'Moderate' : 'Low';
                  const firstName = a.users?.first_name ?? '';
                  const lastName  = a.users?.last_name ?? '';
                  const name      = `${firstName} ${lastName}`.trim() || `Player #${(a.player_id ?? a.id ?? '------').slice(0, 6)}`;
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${col}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${col}15`, border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, color: col, flexShrink: 0 }}>{score}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: `${col}15`, color: col, flexShrink: 0 }}>{lbl}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .coach-charts-row { grid-template-columns: 1fr 1fr 1.2fr; }
        .coach-bottom-row { grid-template-columns: ${alerts.length > 0 ? '1fr 1fr' : '1fr'}; }
        @media (max-width: 900px) {
          .coach-charts-row { grid-template-columns: 1fr 1fr !important; }
          .coach-bottom-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .coach-charts-row { grid-template-columns: 1fr !important; }
          .coach-bottom-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
