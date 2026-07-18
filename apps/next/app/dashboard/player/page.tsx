'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { healthApi, scheduleApi, workoutApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { HealthEntry, ScheduleEvent, WorkoutPlan, Exercise } from '@sams/api';
import { AnnouncementsBanner } from '@sams/app';
import {
  PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   The `/workouts` endpoint actually returns each assignment's
   exercises under `workout_exercises` (with a per-player
   `is_completed` flag) — see backend/src/services/workout.service.js.
   `WorkoutPlan.exercises` in @sams/api does not reflect this; fall
   back to it defensively but prefer the real field, same as the
   dedicated Workouts page (apps/next/app/dashboard/player/workouts/page.tsx).
═══════════════════════════════════════════════════════════════ */

interface PlayerWorkoutExercise {
  id?: string;
  is_completed?: boolean;
}

interface PlayerWorkoutPlan extends WorkoutPlan {
  workout_exercises?: PlayerWorkoutExercise[];
}

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
        <linearGradient id={`psg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#psg-${uid})`} />
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
        background: gradient,
        borderRadius: 20, padding: '24px 22px 20px',
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

  const todaySessions    = eventMap[today.toDateString()] ?? [];
  const upcomingSessions = events.filter(ev => new Date(ev.start_time) >= today).slice(0, 4);

  return (
    <div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {week.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const hasEv   = !!eventMap[d.toDateString()];
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 2px', borderRadius: 12, background: isToday ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : hasEv ? 'rgba(124,58,237,0.07)' : 'var(--bg-elevated)', border: isToday ? 'none' : `1px solid ${hasEv ? '#DDD6FE' : 'var(--border-subtle)'}`, boxShadow: isToday ? '0 4px 12px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '0.56rem', fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 5 }}>{DAY_NAMES[d.getDay()]}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isToday ? '#fff' : hasEv ? '#7C3AED' : 'var(--text-primary)' }}>{d.getDate()}</div>
              {hasEv && !isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED', margin: '4px auto 0' }} />}
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
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No upcoming sessions scheduled</div>
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
                    {' · '}{new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${col}18`, color: col, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{ev.type}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */

export default function PlayerDashboardPage() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const today  = new Date();

  const [events,     setEvents]     = useState<ScheduleEvent[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthEntry[]>([]);
  const [workouts,   setWorkouts]   = useState<PlayerWorkoutPlan[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      scheduleApi.getEvents(),
      healthApi.getMyHealth(),
      workoutApi.getWorkouts(),
    ])
      .then(([evts, hl, wk]) => {
        setEvents(evts ?? []);
        setHealthLogs(hl ?? []);
        setWorkouts((wk ?? []) as PlayerWorkoutPlan[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived stats ─────────────────────────────────────────── */
  const upcoming      = events.filter(ev => new Date(ev.start_time) >= today);
  const todayEvents   = events.filter(ev => new Date(ev.start_time).toDateString() === today.toDateString());
  const latestLog     = healthLogs[0] ?? null;
  const todayLogged   = latestLog ? new Date(latestLog.submitted_at).toDateString() === today.toDateString() : false;
  const allExercises  = workouts.flatMap<PlayerWorkoutExercise | Exercise>(w => w.workout_exercises ?? w.exercises ?? []);
  const totalExercises = allExercises.length;
  const completedExercises = workouts.reduce(
    (s, w) => s + (w.workout_exercises ?? []).filter(ex => ex.is_completed).length,
    0
  );
  const fitnessScore  = latestLog ? latestLog.overall_score : null;
  const fitnessLabel  = fitnessScore === null ? 'Log Today' : fitnessScore >= 70 ? 'Fully Fit' : fitnessScore >= 45 ? 'Moderate' : 'Needs Rest';
  const fitnessColor  = fitnessScore === null ? '#7C3AED' : fitnessScore >= 70 ? '#10B981' : fitnessScore >= 45 ? '#F59E0B' : '#EF4444';

  const hr       = today.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const greetEmoji = hr < 12 ? '🌅' : hr < 17 ? '☀️' : '🌙';

  /* ── Chart data ────────────────────────────────────────────── */
  const sortedLogs = [...healthLogs]
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .slice(-8);

  const wellnessAreaData = sortedLogs.map(l => ({
    date: new Date(l.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: l.overall_score,
  }));

  const remainingExercises = totalExercises - completedExercises;
  const workoutDonut = totalExercises > 0
    ? [
        { name: 'Completed', value: completedExercises, color: '#10B981' },
        { name: 'Remaining', value: remainingExercises,  color: '#E2E8F0' },
      ]
    : [{ name: 'Remaining', value: 1, color: '#E2E8F0' }];

  /* ── Sparklines ────────────────────────────────────────────── */
  const sessionsSpark  = [events.length, events.length - 1, events.length + 1, events.length, upcoming.length + 1, upcoming.length, upcoming.length + 2, upcoming.length];
  const wellnessSpark  = sortedLogs.length >= 2 ? sortedLogs.map(l => l.overall_score) : [60, 65, 70, 68, 72, 75, 70, fitnessScore ?? 70];
  const workoutsSpark  = [1, 2, totalExercises - 1, totalExercises, totalExercises + 1, totalExercises, totalExercises + 2, totalExercises];
  const fitnessSpark   = wellnessSpark;

  /* ── Progress pcts ─────────────────────────────────────────── */
  const sessionPct = Math.min(Math.round((events.length / 10) * 100), 100) || 5;
  const todayPct   = todayEvents.length > 0 ? 100 : 10;
  const workoutPct = totalExercises > 0 ? Math.min(Math.round((totalExercises / 15) * 100), 100) : 5;
  const fitnessPct = fitnessScore ?? 50;

  const quickActions = [
    { label: 'Health Dashboard', path: '/dashboard/player/health',   color: '#10B981', icon: '💊', desc: 'View & log wellness'     },
    { label: 'My Workouts',      path: '/dashboard/player/workouts', color: '#D97706', icon: '🏋️', desc: 'Training assignments'    },
    { label: 'Full Schedule',    path: '/dashboard/player/schedule', color: '#7C3AED', icon: '📅', desc: 'All sessions & matches'  },
    { label: 'Team Chat',        path: '/dashboard/player/chat',     color: '#3B82F6', icon: '💬', desc: 'Message teammates & coach'},
  ];

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 45%, #EC4899 100%)',
        borderRadius: 22, padding: '28px 32px 24px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(236,72,153,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', pointerEvents: 'none' }} />

        <div className="sams-hero-inner" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.3rem,4vw,1.6rem)', color: 'white', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
              {greeting}, {user?.first_name}! {greetEmoji}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 16px', fontSize: '0.875rem' }}>
              {todayEvents.length > 0 ? `You have ${todayEvents.length} session${todayEvents.length > 1 ? 's' : ''} today.` : upcoming.length > 0 ? `Next session: ${upcoming[0]?.title}` : 'No sessions scheduled. Stay active!'}
            </p>
            {!todayLogged && (
              <button
                onClick={() => router.push('/dashboard/player/health')}
                className="sams-hero-btn"
                style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#A5B4FC', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                💊 Log today&apos;s wellness check-in
              </button>
            )}
          </div>

          {/* Fitness ring */}
          <div style={{ flexShrink: 0, textAlign: 'center', padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              {fitnessScore !== null && (
                <circle cx="40" cy="40" r="32" fill="none" stroke={fitnessColor} strokeWidth="7"
                  strokeDasharray={`${(fitnessScore / 100) * 201} 201`} strokeLinecap="round" transform="rotate(-90 40 40)" />
              )}
              <text x="40" y="36" textAnchor="middle" fontSize="13" fontWeight="900" fill="white">{fitnessScore !== null ? fitnessScore : '—'}</text>
              {fitnessScore !== null && <text x="40" y="49" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)">%</text>}
            </svg>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: fitnessColor, marginTop: 4, letterSpacing: '0.04em' }}>{fitnessLabel}</div>
          </div>
        </div>
      </div>

      <AnnouncementsBanner role="Player" />

      {/* ── ROW 1 — Solid Hero Cards ─────────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 18 }}>
        <SolidCard
          gradient="linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
          shadowColor="#3B82F6" icon="📅"
          value={loading ? '…' : events.length}
          label="Sessions This Month"
          sub="Total scheduled sessions"
          onClick={() => router.push('/dashboard/player/schedule')}
          delay={0}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)"
          shadowColor="#10B981" icon="⚽"
          value={loading ? '…' : todayEvents.length}
          label="Today's Sessions"
          sub={todayEvents[0]?.title ?? 'None today'}
          delay={80}
        />
        <SolidCard
          gradient="linear-gradient(135deg, #B45309 0%, #F59E0B 100%)"
          shadowColor="#F59E0B" icon="🏋️"
          value={loading ? '…' : totalExercises ? `${completedExercises}/${totalExercises}` : '—'}
          label="Workouts Progress"
          sub="Exercises completed"
          onClick={() => router.push('/dashboard/player/workouts')}
          delay={160}
        />
        <SolidCard
          gradient={`linear-gradient(135deg, ${fitnessScore !== null ? (fitnessScore >= 70 ? '#047857' : fitnessScore >= 45 ? '#B45309' : '#991B1B') : '#6D28D9'} 0%, ${fitnessColor} 100%)`}
          shadowColor={fitnessColor} icon="💚"
          value={loading ? '…' : fitnessLabel}
          label="Wellness Status"
          sub={fitnessScore !== null ? `Score: ${fitnessScore}/100` : 'No log yet today'}
          onClick={() => router.push('/dashboard/player/health')}
          delay={240}
        />
      </div>

      {/* ── ROW 2 — Progress Bar Cards ───────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 18 }}>
        <ProgressCard
          icon="📅" label="Session Load"
          value={String(events.length)}
          desc="Sessions scheduled this month"
          pct={sessionPct} color="#3B82F6"
          onClick={() => router.push('/dashboard/player/schedule')}
          delay={80}
        />
        <ProgressCard
          icon="⚽" label="Today"
          value={String(todayEvents.length)}
          desc={todayEvents.length > 0 ? todayEvents[0]?.title ?? 'Session today' : 'No sessions today'}
          pct={todayPct} color="#10B981"
          delay={160}
        />
        <ProgressCard
          icon="🏋️" label="Workout Progress"
          value={totalExercises ? `${totalExercises}` : '0'}
          desc="Total exercises assigned"
          pct={workoutPct} color="#D97706"
          onClick={() => router.push('/dashboard/player/workouts')}
          delay={240}
        />
        <ProgressCard
          icon="💚" label="Fitness Score"
          value={fitnessScore !== null ? String(fitnessScore) : '—'}
          desc={fitnessLabel}
          pct={fitnessPct} color={fitnessColor}
          onClick={() => router.push('/dashboard/player/health')}
          delay={320}
        />
      </div>

      {/* ── ROW 3 — Sparkline Cards ──────────────────────────────── */}
      <div className="kpi-grid-4" style={{ gap: 16, marginBottom: 24 }}>
        <SparkCard
          icon="📅" label="Sessions" data={sessionsSpark} color="#3B82F6"
          value={loading ? '…' : String(events.length)} sub="This month"
          onClick={() => router.push('/dashboard/player/schedule')} delay={80}
        />
        <SparkCard
          icon="💚" label="Wellness Trend" data={wellnessSpark} color="#10B981"
          value={loading ? '…' : fitnessScore !== null ? `${fitnessScore}` : '—'} sub="Last 8 check-ins"
          onClick={() => router.push('/dashboard/player/health')} delay={160}
        />
        <SparkCard
          icon="🏋️" label="Workouts" data={workoutsSpark} color="#D97706"
          value={loading ? '…' : String(workouts.length)} sub="Plans assigned"
          onClick={() => router.push('/dashboard/player/workouts')} delay={240}
        />
        <SparkCard
          icon="🔥" label="Fitness" data={fitnessSpark} color={fitnessColor}
          value={loading ? '…' : fitnessScore !== null ? `${fitnessScore}%` : '—'} sub="Current score"
          onClick={() => router.push('/dashboard/player/health')} delay={320}
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="player-charts-row" style={{ display: 'grid', gap: 16, marginBottom: 18 }}>

        {/* Wellness History Area Chart */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 200ms both' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Wellness History</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 18 }}>Your last 8 check-ins</div>
          {wellnessAreaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={wellnessAreaData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2.5} fill="url(#wellnessGrad)" dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: '2rem' }}>💚</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No wellness logs yet</div>
              <button onClick={() => router.push('/dashboard/player/health')} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Log check-in →</button>
            </div>
          )}
        </div>

        {/* Workout Completion Donut */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 280ms both' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Workout Plans</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14 }}>Training assignments</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={150} height={150}>
              <Pie
                data={workoutDonut}
                cx={73} cy={73} innerRadius={46} outerRadius={66}
                startAngle={90} endAngle={-270} dataKey="value"
                strokeWidth={2} stroke="var(--bg-surface)"
              >
                {workoutDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#7C3AED', letterSpacing: '-0.03em' }}>{workouts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active workout plans</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{totalExercises} total exercises</div>
          </div>
        </div>

        {/* Session Calendar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '22px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 360ms both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Upcoming Sessions</div>
            <button onClick={() => router.push('/dashboard/player/schedule')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>View all →</button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Your training &amp; matches</div>
          <WeekCalendarStrip events={events} />
        </div>
      </div>

      {/* ── Quick Actions + Wellness Log ─────────────────────────── */}
      <div className="player-bottom-row" style={{ display: 'grid', gap: 16 }}>

        {/* Quick Actions */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 400ms both' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #4F46E5, #EC4899)' }} />
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Quick Actions</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Jump to key features</div>
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

        {/* Last Wellness Log */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.5s ease 480ms both' }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${fitnessColor}, ${fitnessColor}88)` }} />
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>Last Wellness Log</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>Your most recent check-in</div>
            {latestLog ? (
              <>
                {[
                  { label: 'Stress',   value: latestLog.stress,          max: 5, color: '#EF4444' },
                  { label: 'Soreness', value: latestLog.muscle_soreness, max: 5, color: '#F59E0B' },
                  { label: 'Sleep',    value: latestLog.sleep,           max: 5, color: '#6366F1' },
                ].map(({ label, value, max, color }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}/{max}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${(value / max) * 100}%`, background: color, transition: 'width 1.2s ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {new Date(latestLog.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}<button onClick={() => router.push('/dashboard/player/health')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 'inherit', padding: 0 }}>View health →</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>💚</div>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>No wellness log yet</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0 0 12px' }}>Log your daily check-in to track fitness.</p>
                <button onClick={() => router.push('/dashboard/player/health')} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#7C3AED', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Log check-in →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .player-charts-row { grid-template-columns: 1.4fr 0.8fr 1fr; }
        .player-bottom-row { grid-template-columns: 1fr 1fr; }
        @media (max-width: 900px) {
          .player-charts-row { grid-template-columns: 1fr 1fr !important; }
          .player-bottom-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .player-charts-row { grid-template-columns: 1fr !important; }
          .player-bottom-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
