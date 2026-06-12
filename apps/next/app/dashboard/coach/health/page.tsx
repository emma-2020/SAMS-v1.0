'use client';

import { useState, useEffect } from 'react';
import { coachApi, healthApi } from '@sams/api';

// ─── Types ──────────────────────────────────────────────────────────
interface PlayerHealth {
  id: string; first_name: string; last_name: string; email: string;
  teams: Array<{ id: string; name: string }>;
  latest_health?: {
    id?: string; energy?: number; sleep?: number; muscle_soreness?: number; stress?: number;
    overall_score?: number; submitted_at?: string; logged_at?: string;
    fatigue?: number; soreness?: number; sleep_quality?: number;
    is_flagged?: boolean; notes?: string;
  } | null;
}

interface HealthAlert {
  id: string; player_id: string; overall_score?: number;
  submitted_at?: string; notes?: string;
  users?: { first_name: string; last_name: string };
  energy?: number; sleep?: number; muscle_soreness?: number; stress?: number;
  fatigue?: number; soreness?: number; sleep_quality?: number; is_flagged?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────
function daysAgo(iso?: string): string | null {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}
function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function initials(fn?: string, ln?: string) { return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase(); }

function healthLevel(h: PlayerHealth['latest_health']) {
  if (!h) return 'unknown';
  if (h.is_flagged) return 'flagged';
  const score = h.overall_score ?? 0;
  if (score > 0) {
    if (score >= 70) return 'good';
    if (score >= 50) return 'moderate';
    return 'poor';
  }
  const energy  = h.energy  ?? h.fatigue       ?? 3;
  const sleep   = h.sleep   ?? h.sleep_quality ?? 3;
  const soreness = h.muscle_soreness ?? h.soreness ?? 3;
  const stress  = h.stress ?? 3;
  const avg = (energy + sleep + (6 - soreness) + (6 - stress)) / 4;
  if (avg >= 4) return 'good';
  if (avg >= 3) return 'moderate';
  return 'poor';
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  flagged:  { label: 'Flagged',    color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  poor:     { label: 'Needs Rest', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  moderate: { label: 'Moderate',   color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  good:     { label: 'Good',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  unknown:  { label: 'No Data',    color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
};

// ─── Player Avatar with status ring ─────────────────────────────────
function PlayerAvatar({ firstName, lastName, level, size = 40 }: { firstName?: string; lastName?: string; level: string; size?: number }) {
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.unknown;
  const ins = initials(firstName, lastName);
  const palette = ['#2563EB', '#7C3AED', '#0891B2', '#0D9488'];
  const ci = ((firstName?.charCodeAt(0) ?? 0) + (lastName?.charCodeAt(0) ?? 0)) % palette.length;
  return (
    <div style={{ width: size + 6, height: size + 6, borderRadius: '50%', flexShrink: 0, padding: 3, background: cfg.color, boxShadow: `0 0 0 2px ${cfg.color}30`, transition: 'box-shadow 0.2s' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `${palette[ci]}18`, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, color: palette[ci] }}>
        {ins}
      </div>
    </div>
  );
}

// ─── ScoreBar ─────────────────────────────────────────────────────
function ScoreBar({ value, lowIsBetter = true }: { value?: number | null; lowIsBetter?: boolean }) {
  if (value == null) return <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>—</span>;
  const fillPct    = (value / 5) * 100;
  const healthPct  = lowIsBetter ? (1 - (value - 1) / 4) * 100 : ((value - 1) / 4) * 100;
  const color      = healthPct >= 65 ? '#10B981' : healthPct >= 35 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
        {value}<span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.65 }}>/5</span>
      </span>
      <div style={{ width: 56, height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ width: `${fillPct}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}aa, ${color})`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

// ─── Alert Banner row ────────────────────────────────────────────────
function AlertBannerRow({ alert }: { alert: HealthAlert }) {
  const [hov, setHov] = useState(false);
  const name  = `${alert.users?.first_name ?? ''} ${alert.users?.last_name ?? ''}`.trim() || `Player #${alert.player_id.slice(0, 8)}`;
  const date  = alert.submitted_at;
  const metrics = [
    { label: 'Energy',   v: alert.energy   ?? alert.fatigue,       low: false },
    { label: 'Soreness', v: alert.muscle_soreness ?? alert.soreness, low: true  },
    { label: 'Sleep',    v: alert.sleep    ?? alert.sleep_quality, low: false },
  ].filter(s => s.v != null);

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 16px', borderRadius: 13, background: hov ? 'rgba(245,158,11,0.09)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(217,119,6,0.14)', borderLeft: '4px solid #F59E0B', transition: 'all 0.2s' }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, #EF444430 0%, #F9731640 100%)', border: '2px solid rgba(239,68,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, color: '#EF4444' }}>
        {initials(alert.users?.first_name, alert.users?.last_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#78350F' }}>{name}</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.18)' }}>ALERT</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#A16207', marginBottom: 8 }}>
          Low wellness score · {daysAgo(date)}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {metrics.map(s => {
            const hp = s.low ? (1 - ((s.v as number) - 1) / 4) * 100 : (((s.v as number) - 1) / 4) * 100;
            const c  = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#EF4444';
            return (
              <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, fontSize: '0.7rem', background: `${c}10`, border: `1px solid ${c}22` }}>
                <span style={{ color: '#64748B' }}>{s.label}</span>
                <span style={{ fontWeight: 800, color: c, fontFamily: 'var(--font-mono)' }}>{s.v}/5</span>
              </span>
            );
          })}
          {alert.notes && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: '0.7rem', fontStyle: 'italic', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.14)', color: '#4338CA', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{alert.notes}"
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>{fmtDate(date)}</div>
        <div style={{ fontSize: '0.65rem', color: '#A16207', marginTop: 2 }}>Score: {alert.overall_score ?? '?'}</div>
      </div>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────
function MetricCard({ label, count, total, color, icon, description, isActive, onClick }: {
  label: string; count: number; total: number | null; color: string; icon: string;
  description: string; isActive: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const pct = total && total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ textAlign: 'left', padding: '18px 18px 16px', borderRadius: 18, cursor: 'pointer', border: isActive ? `2px solid ${color}` : hov ? `1.5px solid ${color}50` : '1.5px solid #E2E8F0', background: isActive ? `linear-gradient(145deg, ${color}09, ${color}04)` : hov ? `${color}04` : '#FFFFFF', boxShadow: isActive ? `0 6px 28px ${color}1A` : hov ? `0 4px 16px ${color}10` : '0 1px 3px rgba(0,0,0,0.05)', transform: hov && !isActive ? 'translateY(-2px)' : 'none', transition: 'all 0.2s', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? `${color}18` : `${color}0E`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{icon}</div>
        {total != null && total > 0 && (
          <div style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 7, background: isActive ? `${color}12` : '#F8FAFC', border: `1px solid ${isActive ? `${color}22` : '#E2E8F0'}`, color: isActive ? color : '#94A3B8' }}>{pct}%</div>
        )}
      </div>
      <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.045em', marginBottom: 3, color: isActive ? color : (count > 0 ? color : '#CBD5E1') }}>{count}</div>
      <div style={{ fontSize: '0.77rem', fontWeight: 700, marginBottom: 10, color: isActive ? color : '#475569' }}>{label}</div>
      {total != null && total > 0 ? (
        <div style={{ height: 4, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', marginBottom: 9 }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, transition: 'width 0.9s' }} />
        </div>
      ) : <div style={{ height: 4, borderRadius: 99, background: '#F1F5F9', marginBottom: 9 }} />}
      <div style={{ fontSize: '0.67rem', color: '#94A3B8', lineHeight: 1.45 }}>{description}</div>
    </button>
  );
}

// ─── Player wellness table row ────────────────────────────────────
function PlayerRow({ player }: { player: PlayerHealth }) {
  const h     = player.latest_health;
  const level = healthLevel(h);
  const cfg   = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.unknown;
  const base  = h?.is_flagged ? 'rgba(239,68,68,0.018)' : 'transparent';
  const hover = h?.is_flagged ? 'rgba(239,68,68,0.05)' : 'rgba(99,102,241,0.022)';
  const date  = h?.logged_at ?? h?.submitted_at;

  const energyVal  = h?.energy  ?? h?.fatigue       ?? null;
  const sleepVal   = h?.sleep   ?? h?.sleep_quality ?? null;
  const sorenessVal = h?.muscle_soreness ?? h?.soreness ?? null;

  return (
    <tr style={{ background: base, transition: 'background 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = hover; }}
      onMouseLeave={e => { e.currentTarget.style.background = base; }}>
      <td style={{ padding: '13px 16px 13px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayerAvatar firstName={player.first_name} lastName={player.last_name} level={level} size={34} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{player.first_name} {player.last_name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{player.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(player.teams ?? []).length ? (player.teams ?? []).map(t => (
            <span key={t.id} style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>{t.name}</span>
          )) : <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>—</span>}
        </div>
      </td>
      <td style={{ padding: '13px 16px' }}>
        {h ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.1rem', color: '#94A3B8', flexShrink: 0 }}>🕐</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{daysAgo(date)}</span>
          </div>
        ) : <span style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>No data</span>}
      </td>
      <td style={{ padding: '13px 16px', textAlign: 'center' }}><ScoreBar value={energyVal}   lowIsBetter={false} /></td>
      <td style={{ padding: '13px 16px', textAlign: 'center' }}><ScoreBar value={sorenessVal} lowIsBetter={true}  /></td>
      <td style={{ padding: '13px 16px', textAlign: 'center' }}><ScoreBar value={sleepVal}    lowIsBetter={false} /></td>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cfg.color, boxShadow: `0 0 0 3px ${cfg.color}22` }} />
          <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function CoachHealthPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [alerts, setAlerts]     = useState<HealthAlert[]>([]);
  const [players, setPlayers]   = useState<PlayerHealth[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch(() => [] as HealthAlert[]),
      coachApi.getPlayers().catch(() => []),
    ]).then(([alts, pls]: [any, any]) => {
      setAlerts(Array.isArray(alts) ? alts : (alts?.alerts ?? []));
      const ps: PlayerHealth[] = Array.isArray(pls) ? pls : (pls?.players ?? []);
      setPlayers(ps);
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load')).finally(() => setLoading(false));
  }, []);

  const flaggedCount   = players.filter(p => p.latest_health?.is_flagged || (p.latest_health?.overall_score != null && p.latest_health.overall_score < 40)).length;
  const noDataCount    = players.filter(p => !p.latest_health).length;
  const goodCount      = players.filter(p => healthLevel(p.latest_health) === 'good').length;
  const attentionCount = players.filter(p => { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }).length;

  const filtered = players.filter(p => {
    if (statusFilter === 'all')             return true;
    if (statusFilter === 'flagged')         return p.latest_health?.is_flagged;
    if (statusFilter === 'no-data')         return !p.latest_health;
    if (statusFilter === 'good')            return healthLevel(p.latest_health) === 'good';
    if (statusFilter === 'needs-attention') { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }
    return true;
  });

  const metricCards = [
    { label: 'Total Players',   count: players.length, color: '#2563EB', icon: '👥', filter: 'all',             total: null,           description: 'Active roster members'     },
    { label: 'Flagged / Low',   count: flaggedCount,   color: '#EF4444', icon: '🚨', filter: 'flagged',         total: players.length, description: 'Low wellness score'         },
    { label: 'Needs Attention', count: attentionCount, color: '#D97706', icon: '⚡', filter: 'needs-attention', total: players.length, description: 'Moderate to high concern'   },
    { label: 'Good',            count: goodCount,      color: '#059669', icon: '✅', filter: 'good',            total: players.length, description: 'Healthy & ready to train'   },
    { label: 'No Data',         count: noDataCount,    color: '#94A3B8', icon: '📊', filter: 'no-data',         total: players.length, description: 'Awaiting check-in'          },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>Health Monitor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>Wellness intelligence across {players.length} player{players.length !== 1 ? 's' : ''}</p>
        </div>
        {flaggedCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', boxShadow: '0 2px 8px rgba(239,68,68,0.15)' }}>
            ⚠️ {flaggedCount} flagged
          </span>
        )}
      </div>

      {/* Health Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24, borderRadius: 18, background: 'rgba(255,251,235,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(217,119,6,0.14)', borderLeft: '4px solid #F59E0B', boxShadow: '0 4px 24px rgba(245,158,11,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', background: 'linear-gradient(90deg, rgba(245,158,11,0.09), transparent)', borderBottom: '1px solid rgba(217,119,6,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', fontSize: '0.9rem' }}>⚠️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#78350F' }}>Health Alerts</div>
                <div style={{ fontSize: '0.72rem', color: '#A16207', marginTop: 1 }}>{alerts.length} player{alerts.length !== 1 ? 's' : ''} require attention</div>
              </div>
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.09)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.14)' }}>
              {alerts.length} ALERT{alerts.length !== 1 ? 'S' : ''}
            </span>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {alerts.slice(0, 5).map(alert => <AlertBannerRow key={alert.id} alert={alert} />)}
            {alerts.length > 5 && <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#A16207', paddingTop: 4, fontWeight: 600 }}>+{alerts.length - 5} more alerts visible in the table below</div>}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {metricCards.map(c => (
          <MetricCard key={c.filter} label={c.label} count={c.count} total={c.total} color={c.color} icon={c.icon} description={c.description} isActive={statusFilter === c.filter} onClick={() => setStatusFilter(c.filter)} />
        ))}
      </div>

      {/* Player Wellness Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 16px rgba(15,23,42,0.05)', overflow: 'auto', marginBottom: 16 }}>
        <div style={{ padding: '15px 20px', background: 'linear-gradient(90deg, rgba(99,102,241,0.04), transparent)', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>Player Wellness</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>Latest check-in per player · {filtered.length} of {players.length} shown</div>
          </div>
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')}
              style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 58, borderRadius: 12 }} />)}
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ margin: 16 }}>{error}</div>
        ) : !filtered.length ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {statusFilter !== 'all' ? 'No players match this filter' : 'No players found'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {statusFilter !== 'all' ? 'Try clearing the filter.' : 'No players rostered on your teams yet.'}
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Player</th>
                <th>Teams</th>
                <th>Last Check-in</th>
                <th style={{ textAlign: 'center' }}>Energy</th>
                <th style={{ textAlign: 'center' }}>Soreness</th>
                <th style={{ textAlign: 'center' }}>Sleep</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => <PlayerRow key={p.id} player={p} />)}
            </tbody>
          </table>
        )}
      </div>

      {/* Score guide */}
      <div style={{ padding: '13px 18px', borderRadius: 14, background: 'rgba(248,250,252,0.8)', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>ℹ️</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', flex: 1 }}>
          <div><div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 1 }}>Energy &amp; Sleep</div><div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>1 = poor · 5 = excellent</div></div>
          <div style={{ width: 1, height: 28, background: '#E2E8F0' }} />
          <div><div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 1 }}>Soreness</div><div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>1 = none · 5 = very sore</div></div>
          <div style={{ width: 1, height: 28, background: '#E2E8F0' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {[{ color: '#10B981', label: 'Healthy' }, { color: '#F59E0B', label: 'Moderate concern' }, { color: '#EF4444', label: 'High risk' }].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 24, height: 5, borderRadius: 99, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
