'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, scheduleApi, analyticsApi, feesApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { HealthEntry, ScheduleEvent, ParentAnalytics, FeeLedgerEntry } from '@sams/api';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
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
        <linearGradient id={`parsg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#parsg-${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOLID HERO CARD
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
      <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 18 }}>
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

/* ═══════════════════════════════════════════════════════════════
   PROGRESS CARD
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

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE STAT CARD
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

/* ═══════════════════════════════════════════════════════════════
   WEEK CALENDAR STRIP
═══════════════════════════════════════════════════════════════ */

function WeekCalendarStrip({ events }: { events: ScheduleEvent[] }) {
  const today = new Date();
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TYPE_COLORS: Record<string, string> = {
    Practice: '#8B5CF6', Match: '#EC4899', Game: '#EF4444', Training: '#3B82F6', Other: '#94A3B8',
  };
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 2 + i); return d;
  });
  const eventMap: Record<string, ScheduleEvent[]> = {};
  events.forEach(ev => {
    const key = new Date(ev.start_time).toDateString();
    if (!eventMap[key]) eventMap[key] = [];
    eventMap[key].push(ev);
  });
  const upcomingSessions = events.filter(ev => new Date(ev.start_time) >= today).slice(0, 3);
  return (
    <div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
        {week.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const hasEv   = !!eventMap[d.toDateString()];
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: isToday ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : hasEv ? 'rgba(124,58,237,0.07)' : 'var(--bg-elevated)', border: isToday ? 'none' : `1px solid ${hasEv ? '#DDD6FE' : 'var(--border-subtle)'}`, boxShadow: isToday ? '0 4px 12px rgba(124,58,237,0.3)' : 'none' }}>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{DAY_NAMES[d.getDay()]}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isToday ? '#fff' : hasEv ? '#7C3AED' : 'var(--text-primary)' }}>{d.getDate()}</div>
              {hasEv && !isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED', margin: '3px auto 0' }} />}
            </div>
          );
        })}
      </div>
      {upcomingSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>No upcoming sessions</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcomingSessions.map(ev => {
            const col = TYPE_COLORS[ev.type] ?? '#94A3B8';
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${col}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {new Date(ev.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${col}18`, color: col, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{ev.type}</span>
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

export function ParentDashboardScreen() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const today  = new Date();

  const [alerts,     setAlerts]     = useState<HealthEntry[]>([]);
  const [events,     setEvents]     = useState<ScheduleEvent[]>([]);
  const [parentData, setParentData] = useState<ParentAnalytics | null>(null);
  const [fees,       setFees]       = useState<FeeLedgerEntry[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts(),
      scheduleApi.getEvents(),
      analyticsApi.getParentAnalytics(),
      feesApi.getFees(),
    ])
      .then(([a, e, pa, f]) => {
        setAlerts(a ?? []);
        setEvents(e ?? []);
        setParentData(pa ?? null);
        setFees(f ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived stats ─────────────────────────────────────────── */
  // The parent-child link (same source the Schedule/Workouts/Health/Analytics
  // pages resolve server-side) — NOT the coach roster endpoint, which returns
  // no rows for a Parent-role caller.
  const child       = parentData?.linked ? parentData.child : null;
  const upcoming    = events.filter(ev => new Date(ev.start_time) >= today);
  const playerCount = child ? 1 : 0;
  const feeBalance  = fees.reduce((s, f) => s + ((f.amount_owed ?? 0) - (f.amount_paid ?? 0)), 0);
  const alertCount  = alerts.length;

  const avgHealth   = alertCount
    ? Math.round(alerts.reduce((s, a) => s + (a.overall_score ?? 0), 0) / alertCount)
    : 0;

  const fitCount = alerts.filter(a => (a.overall_score ?? 0) >= 70).length;
  const modCount = alerts.filter(a => { const s = a.overall_score ?? 0; return s >= 40 && s < 70; }).length;
  const lowCount = alerts.filter(a => (a.overall_score ?? 0) < 40).length;

  const sessionPct = Math.min(Math.round((events.length / 10) * 100), 100) || 5;
  const playerPct  = Math.min(Math.round((playerCount / 5) * 100), 100) || 10;
  const healthPct  = avgHealth || 5;
  const feeOwedPct = feeBalance > 0 ? Math.min(Math.round((feeBalance / 1000) * 100), 100) : 2;

  const hr       = today.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  /* ── Wellness history bar chart ────────────────────────────── */
  const sortedAlerts = [...alerts]
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .slice(-8);

  const wellnessBarData = sortedAlerts.map(a => ({
    date: new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: a.overall_score ?? 0,
  }));

  const healthDonut = [
    { name: 'Good',     value: fitCount, color: '#10B981' },
    { name: 'Moderate', value: modCount, color: '#F59E0B' },
    { name: 'Alert',    value: lowCount, color: '#EF4444' },
  ].filter(d => d.value > 0);

  /* ── Sparklines ────────────────────────────────────────────── */
  const wellnessSpark = sortedAlerts.length >= 2
    ? sortedAlerts.map(a => a.overall_score ?? 0)
    : [60, 65, 70, 68, 72, 65, 70, avgHealth || 70];
  const sessionsSpark = [events.length - 2, events.length, events.length + 1, events.length, upcoming.length + 1, upcoming.length, upcoming.length + 2, upcoming.length];
  const playerSpark   = Array.from({ length: 8 }, () => playerCount);
  const feeSpark      = [feeBalance + 200, feeBalance + 100, feeBalance + 50, feeBalance, feeBalance, feeBalance, feeBalance, feeBalance];

  const quickActions = [
    { label: "Child's Schedule", path: '/dashboard/parent/schedule', color: '#3B82F6', icon: '📅', desc: 'View upcoming sessions'    },
    { label: 'Health Reports',   path: '/dashboard/parent/health',   color: '#10B981', icon: '💚', desc: 'Wellness history & alerts' },
    { label: 'Fee Payments',     path: '/dashboard/parent/fees',     color: '#D97706', icon: '💳', desc: 'View outstanding balance'  },
    { label: 'Messages',         path: '/dashboard/parent/chat',     color: '#7C3AED', icon: '💬', desc: 'Chat with coach & academy' },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 45%, #DB2777 100%)',
        borderRadius: 22, padding: '28px 32px 24px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '40%', bottom: -70, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div className="sams-hero-inner" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', marginBottom: 8 }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>PARENT</span>
            </div>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.3rem,4vw,1.6rem)', color: '#fff', margin: '0 0 6px', letterSpacing: '-0.025em' }}>
              {greeting}, {user?.first_name}! 👨‍👩‍👧
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: `${loading ? '…' : playerCount} child${playerCount !== 1 ? 'ren' : ''}`, icon: '👧' },
                { label: `${upcoming.length} upcoming`, icon: '📅' },
                { label: `${alertCount} health flag${alertCount !== 1 ? 's' : ''}`, icon: '💚' },
              ].map(({ label, icon }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  <span>{icon}</span> {label}
                </span>
              ))}
            </div>
          </div>
          {feeBalance > 0 && (
            <div
              onClick={() => router.push('/dashboard/parent/fees')}
              style={{ flexShrink: 0, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer', textAlign: 'center', backdropFilter: 'blur(8px)' }}
            >
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Outstanding</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FEF2F2', letterSpacing: '-0.03em' }}>GHS {feeBalance.toFixed(0)}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(254,242,242,0.7)', marginTop: 2 }}>Tap to pay →</div>
            </div>
          )}
        </div>
      </div>

      <AnnouncementsBanner role="Parent" />

      {/* ── ROW 1 — Solid Hero Cards ─────────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 18 }}>
        <SolidCard
          gradient="linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
          shadowColor="#3B82F6" icon="📅"
          value={loading ? '…' : events.length}
          label="Total Sessions"
          sub={`${upcoming.length} upcoming`}
          onClick={() => router.push('/dashboard/parent/schedule')}
          delay={0}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)"
          shadowColor="#10B981" icon="💚"
          value={loading ? '…' : `${avgHealth}%`}
          label="Child's Wellness"
          sub="Average health score"
          onClick={() => router.push('/dashboard/parent/health')}
          delay={80}
        />
        <SolidCard
          gradient={`linear-gradient(135deg, ${feeBalance > 0 ? '#B45309' : '#047857'} 0%, ${feeBalance > 0 ? '#F59E0B' : '#10B981'} 100%)`}
          shadowColor={feeBalance > 0 ? '#F59E0B' : '#10B981'} icon="💳"
          value={loading ? '…' : `GHS ${feeBalance.toFixed(0)}`}
          label="Fee Balance"
          sub={feeBalance > 0 ? 'Outstanding fees' : 'No outstanding fees'}
          onClick={() => router.push('/dashboard/parent/fees')}
          delay={160}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #6D28D9 0%, #EC4899 100%)"
          shadowColor="#8B5CF6" icon="👧"
          value={loading ? '…' : playerCount}
          label="Children Enrolled"
          sub="Registered with your academy"
          delay={240}
        />
      </div>

      {/* ── ROW 2 — Progress Bar Cards ───────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 18 }}>
        <ProgressCard
          icon="📅" label="Session Activity"
          value={String(events.length)}
          desc="Total sessions this term"
          pct={sessionPct} color="#3B82F6"
          onClick={() => router.push('/dashboard/parent/schedule')}
          delay={80}
        />
        <ProgressCard
          icon="💚" label="Wellness Score"
          value={`${avgHealth}%`}
          desc="Average wellness level"
          pct={healthPct} color="#10B981"
          onClick={() => router.push('/dashboard/parent/health')}
          delay={160}
        />
        <ProgressCard
          icon="💳" label="Fee Status"
          value={`GHS ${feeBalance.toFixed(0)}`}
          desc="Outstanding balance owed"
          pct={feeOwedPct} color={feeBalance > 0 ? '#EF4444' : '#10B981'}
          onClick={() => router.push('/dashboard/parent/fees')}
          delay={240}
        />
        <ProgressCard
          icon="👧" label="Enrolled Players"
          value={String(playerCount)}
          desc="Children in the academy"
          pct={playerPct} color="#8B5CF6"
          delay={320}
        />
      </div>

      {/* ── ROW 3 — Sparkline Cards ──────────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 24 }}>
        <SparkCard
          icon="📅" label="Sessions" data={sessionsSpark} color="#3B82F6"
          value={loading ? '…' : String(events.length)} sub="This term"
          onClick={() => router.push('/dashboard/parent/schedule')} delay={80}
        />
        <SparkCard
          icon="💚" label="Wellness Trend" data={wellnessSpark} color="#10B981"
          value={loading ? '…' : `${avgHealth}%`} sub="Last 8 logs"
          onClick={() => router.push('/dashboard/parent/health')} delay={160}
        />
        <SparkCard
          icon="💳" label="Fee Balance" data={feeSpark} color={feeBalance > 0 ? '#EF4444' : '#10B981'}
          value={loading ? '…' : `GHS ${feeBalance.toFixed(0)}`} sub="Outstanding"
          onClick={() => router.push('/dashboard/parent/fees')} delay={240}
        />
        <SparkCard
          icon="👧" label="My Children" data={playerSpark} color="#8B5CF6"
          value={loading ? '…' : String(playerCount)} sub="Enrolled"
          delay={320}
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="parent-charts-row" style={{ display: 'grid', gap: 16, marginBottom: 18 }}>

        {/* Wellness History Bar Chart */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 200ms both' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Wellness History</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 18 }}>Child&apos;s recent health logs</div>
          {wellnessBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={wellnessBarData} barCategoryGap="30%">
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: '0.8rem' }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={38}>
                  {wellnessBarData.map((d, i) => (
                    <Cell key={i} fill={d.score >= 70 ? '#10B981' : d.score >= 40 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: '2rem' }}>💚</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No wellness data yet</div>
            </div>
          )}
        </div>

        {/* Wellness Donut */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 280ms both' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Health Status</div>
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
              { label: 'Good',     color: '#10B981', count: fitCount },
              { label: 'Moderate', color: '#F59E0B', count: modCount },
              { label: 'Alert',    color: '#EF4444', count: lowCount },
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

        {/* Calendar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 360ms both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Upcoming</div>
            <button onClick={() => router.push('/dashboard/parent/schedule')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>View all →</button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Child&apos;s sessions this week</div>
          <WeekCalendarStrip events={events} />
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────── */}
      <div className="parent-bottom-row" style={{ display: 'grid', gap: 16 }}>

        {/* Children List */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 380ms both' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #4338CA, #DB2777)' }} />
          <div style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>My Children</div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(109,40,217,0.1)', color: '#7C3AED' }}>{playerCount} enrolled</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Academy roster</div>
            {!child ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No children linked yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(() => {
                  const health      = parentData?.wellness?.latestScore;
                  const healthCol   = health == null ? '#94A3B8' : health >= 70 ? '#10B981' : health >= 40 ? '#F59E0B' : '#EF4444';
                  const healthLabel = health == null ? 'No log' : health >= 70 ? 'Fit' : health >= 40 ? 'Moderate' : 'Alert';
                  const nameParts   = child.name.split(' ');
                  const initials    = `${nameParts[0]?.[0] ?? ''}${nameParts[nameParts.length - 1]?.[0] ?? ''}`.toUpperCase();
                  return (
                    <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials || '👧'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.855rem', fontWeight: 700, color: 'var(--text-primary)' }}>{child.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{child.team}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: `${healthCol}14`, color: healthCol }}>{healthLabel}</div>
                        {health != null && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{health}/100</div>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 440ms both' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #4F46E5, #EC4899)' }} />
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Quick Actions</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Common tasks</div>
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

        {/* Health Flags */}
        {alertCount > 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 500ms both' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #EF4444, #F59E0B)' }} />
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Health Flags</div>
                <button onClick={() => router.push('/dashboard/parent/health')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#EF4444' }}>View all →</button>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#EF4444', marginBottom: 16 }}>{alertCount} recent log{alertCount !== 1 ? 's' : ''}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.slice(0, 4).map(a => {
                  const col = a.overall_score >= 70 ? '#10B981' : a.overall_score >= 40 ? '#F59E0B' : '#EF4444';
                  const lbl = a.overall_score >= 70 ? 'Good' : a.overall_score >= 40 ? 'Moderate' : 'Low';
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${col}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900, color: col, flexShrink: 0 }}>{a.overall_score}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Wellness check-in</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${col}14`, color: col }}>{lbl}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .parent-charts-row { grid-template-columns: 1.4fr 0.8fr 1fr; }
        .parent-bottom-row { grid-template-columns: ${alertCount > 0 ? '1fr 1fr 1fr' : '1fr 1fr'}; }
        @media (max-width: 900px) {
          .parent-charts-row { grid-template-columns: 1fr 1fr !important; }
          .parent-bottom-row { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .parent-charts-row { grid-template-columns: 1fr !important; }
          .parent-bottom-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
