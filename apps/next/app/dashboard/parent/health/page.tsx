'use client';

import { useState, useEffect } from 'react';
import { healthApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';

// ─── Types ──────────────────────────────────────────────────────────
interface HealthLog {
  id: string; player_id: string; overall_score?: number;
  energy?: number; sleep?: number; muscle_soreness?: number; stress?: number;
  fatigue?: number; soreness?: number; sleep_quality?: number;
  is_flagged?: boolean; notes?: string;
  submitted_at?: string; logged_at?: string;
  users?: { first_name: string; last_name: string };
}

// ─── Helpers ────────────────────────────────────────────────────────
function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function daysAgo(iso?: string): string | null {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

// ─── Score Donut ─────────────────────────────────────────────────────
function ScoreDonut({ score }: { score: number }) {
  const sz = 96, r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ - (score / 100) * circ;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const bg    = score >= 70 ? '#ECFDF5' : score >= 40 ? '#FFFBEB' : '#FEF2F2';
  return (
    <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
      <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={8} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.52rem', fontWeight: 700, color: `${color}90`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>score</span>
      </div>
    </div>
  );
}

// ─── Metric Bar ──────────────────────────────────────────────────────
function MetricBar({ label, value, max = 5, lowIsBetter = false, color = '#6366F1' }: {
  label: string; value: number | null | undefined; max?: number; lowIsBetter?: boolean; color?: string;
}) {
  if (value == null) return null;
  const pct = (value / max) * 100;
  const healthPct = lowIsBetter ? (1 - (value - 1) / (max - 1)) * 100 : ((value - 1) / (max - 1)) * 100;
  const barColor = healthPct >= 65 ? '#10B981' : healthPct >= 35 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: barColor, fontFamily: 'var(--font-mono)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: barColor, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
}

// ─── Health Log Card ─────────────────────────────────────────────────
function HealthLogCard({ log }: { log: HealthLog }) {
  const date    = log.logged_at ?? log.submitted_at;
  const score   = log.overall_score ?? 0;
  const flagged = log.is_flagged || score < 40;
  const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const scoreLabel = score >= 70 ? 'Good' : score >= 40 ? 'Moderate' : 'Low';
  const scoreBg    = score >= 70 ? '#ECFDF5' : score >= 40 ? '#FFFBEB' : '#FEF2F2';

  const energyVal  = log.energy  ?? log.fatigue       ?? null;
  const sleepVal   = log.sleep   ?? log.sleep_quality ?? null;
  const sorenessVal = log.muscle_soreness ?? log.soreness ?? null;
  const stressVal  = log.stress ?? null;

  return (
    <div style={{ background: flagged ? 'linear-gradient(135deg, #FFF5F5 0%, #FFFBF5 100%)' : 'var(--bg-elevated)', border: `1px solid ${flagged ? '#FECACA' : 'var(--border-subtle)'}`, borderRadius: 16, overflow: 'hidden', borderLeft: `4px solid ${flagged ? '#EF4444' : (score >= 70 ? '#10B981' : '#F59E0B')}` }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{fmtDate(date)}</div>
          {date && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Logged at {fmtTime(date)} · {daysAgo(date)}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {score > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: 99, background: scoreBg, color: scoreColor, border: `1px solid ${scoreColor}30` }}>
              {scoreLabel} ({score})
            </span>
          )}
          {flagged && (
            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>⚠️ ALERT</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: '14px 16px' }}>
        <MetricBar label="Energy"     value={energyVal}   lowIsBetter={false} />
        <MetricBar label="Sleep"      value={sleepVal}    lowIsBetter={false} />
        <MetricBar label="Soreness"   value={sorenessVal} lowIsBetter={true}  />
        {stressVal != null && <MetricBar label="Stress" value={stressVal} lowIsBetter={true} />}
        {log.notes && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.1)', fontSize: '0.76rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{log.notes}"
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function ParentHealthPage() {
  const user    = useAuthStore(s => s.user);
  const [logs,  setLogs]  = useState<HealthLog[]>([]);
  const [alerts, setAlerts] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch(() => [] as HealthLog[]),
      (healthApi as any).getMyHealth?.()?.catch?.(() => []) ?? Promise.resolve([]),
    ]).then(([alts, myLogs]: [any, any]) => {
      setAlerts(Array.isArray(alts) ? alts : []);
      setLogs(Array.isArray(myLogs) ? myLogs : []);
    }).finally(() => setLoading(false));
  }, []);

  const latestLog = alerts[0] ?? logs[0];
  const latestScore = latestLog?.overall_score ?? 0;
  const latestDate  = latestLog?.logged_at ?? latestLog?.submitted_at;
  const allLogs = alerts.length > 0 ? alerts : logs;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>
          Child's Wellness
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
          Health check-in history and wellness alerts
        </p>
      </div>

      {/* Current wellness snapshot */}
      {!loading && latestLog && (
        <div style={{ marginBottom: 24, borderRadius: 20, padding: '20px 24px', background: 'linear-gradient(135deg, #FFFBEB 0%, #FFF 60%)', border: '1.5px solid #FDE68A', boxShadow: '0 4px 20px rgba(217,119,6,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ScoreDonut score={latestScore} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Latest Wellness Check-in</div>
              {latestDate && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  {daysAgo(latestDate)} · {fmtDate(latestDate)}
                </div>
              )}
              {(latestScore < 40) && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', fontWeight: 700 }}>
                  ⚠️ Your child's wellness score is low — consider checking in with their coach
                </div>
              )}
              {(latestScore >= 70) && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>
                  ✓ Your child is feeling well today
                </div>
              )}
              {(latestScore >= 40 && latestScore < 70) && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706', fontSize: '0.8rem', fontWeight: 700 }}>
                  ℹ️ Your child's wellness is moderate — monitor closely
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI summary row */}
      {!loading && allLogs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Wellness Score', value: latestScore > 0 ? `${latestScore}%` : '—', icon: '💚', color: latestScore >= 70 ? '#10B981' : latestScore >= 40 ? '#F59E0B' : '#EF4444' },
            { label: 'Total Check-ins', value: allLogs.length,   icon: '📊', color: ROLE_COLOR.Parent },
            { label: 'Last Check-in', value: daysAgo(latestDate) ?? '—', icon: '🕐', color: '#6366F1' },
          ].map(kpi => (
            <div key={kpi.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{kpi.icon}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: kpi.color, letterSpacing: '-0.03em' }}>{kpi.value}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Health log list */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Wellness History</h2>
          {allLogs.length > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{allLogs.length} entries</span>}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
          </div>
        ) : !allLogs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFBEB 100%)', borderRadius: 20, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>❤️</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 8 }}>No wellness check-ins yet</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 300, margin: 0, lineHeight: 1.6 }}>
              Once your child completes a wellness check-in, you'll see their health data here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allLogs.map((log: HealthLog) => <HealthLogCard key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(248,250,252,0.8)', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Wellness scores are submitted by your child before training. Scores below 40 trigger an alert. Contact the coach if you have concerns about your child's welfare.
        </p>
      </div>
    </div>
  );
}
