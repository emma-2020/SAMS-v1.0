// src/pages/coach/HealthPage.jsx — Health Monitor Premium v2
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { healthApi } from '../../services/health.api';
import { coachApi }  from '../../services/coach.api';
import { PageHeader, EmptyState, Avatar } from '../../components/shared/ui';
import {
  AlertTriangle, Activity, Users, CheckCircle2,
  Info, Clock, Filter, Zap,
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysAgo(iso) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}
function initials(fn, ln) { return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase(); }

function healthLevel(h) {
  if (!h) return 'unknown';
  if (h.is_flagged) return 'flagged';
  const avg = (h.fatigue + h.soreness + (6 - h.sleep_quality)) / 3;
  if (avg >= 4) return 'poor';
  if (avg >= 3) return 'moderate';
  return 'good';
}

const LEVEL_CONFIG = {
  flagged:  { label: 'Flagged',    color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  poor:     { label: 'Needs Rest', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  moderate: { label: 'Moderate',   color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  good:     { label: 'Good',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  unknown:  { label: 'No Data',    color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
};

// ─── PlayerAvatar with status ring ──────────────────────────────
function PlayerAvatar({ firstName, lastName, level, size = 40 }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.unknown;
  const ins = initials(firstName, lastName);
  const palette = ['#2563EB', '#7C3AED', '#0891B2', '#0D9488'];
  const ci = ((firstName?.charCodeAt(0) ?? 0) + (lastName?.charCodeAt(0) ?? 0)) % palette.length;
  const avatarColor = palette[ci];
  return (
    <div style={{
      width: size + 6, height: size + 6, borderRadius: '50%', flexShrink: 0,
      padding: 3, background: cfg.color,
      boxShadow: `0 0 0 2px ${cfg.color}30`,
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        background: `${avatarColor}18`, border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.72rem', fontWeight: 900, color: avatarColor,
      }}>
        {ins}
      </div>
    </div>
  );
}

// ─── ScoreBar — horizontal pill progress ─────────────────────────
function ScoreBar({ value, lowIsBetter = true }) {
  if (value == null) return <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>—</span>;
  const fillPct = (value / 5) * 100;
  const healthPct = lowIsBetter ? (1 - (value - 1) / 4) * 100 : ((value - 1) / 4) * 100;
  const color = healthPct >= 65 ? '#10B981' : healthPct >= 35 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{
        fontSize: '0.82rem', fontWeight: 800, color,
        fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
      }}>
        {value}<span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.65 }}>/5</span>
      </span>
      <div style={{
        width: 56, height: 6, borderRadius: 99,
        background: '#F1F5F9', overflow: 'hidden',
      }}>
        <div style={{
          width: `${fillPct}%`, height: '100%', borderRadius: 99,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

// ─── AlertBanner — premium amber notification row ────────────────
function AlertBanner({ log }) {
  const [hov, setHov] = useState(false);
  const name = `${log.users?.first_name ?? ''} ${log.users?.last_name ?? ''}`.trim();
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '13px 16px', borderRadius: 13,
        background: hov ? 'rgba(245,158,11,0.09)' : 'rgba(245,158,11,0.05)',
        border: '1px solid rgba(217,119,6,0.14)',
        borderLeft: '4px solid #F59E0B',
        boxShadow: hov ? '0 4px 20px rgba(245,158,11,0.10)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {/* Player photo-card avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: 'linear-gradient(135deg, #EF444430 0%, #F9731640 100%)',
        border: '2px solid rgba(239,68,68,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', fontWeight: 900, color: '#EF4444',
        boxShadow: '0 4px 14px rgba(239,68,68,0.18)',
        overflow: 'hidden',
      }}>
        <Avatar name={name} role="Player" size={52} />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#78350F' }}>{name}</span>
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
            background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.18)',
            letterSpacing: '0.04em',
          }}>
            FLAGGED
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#A16207', marginBottom: 8 }}>
          Self-flagged as struggling · {daysAgo(log.logged_at)}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {[
            { label: 'Fatigue',  v: log.fatigue,       low: true  },
            { label: 'Soreness', v: log.soreness,      low: true  },
            { label: 'Sleep',    v: log.sleep_quality, low: false },
          ].map(s => {
            if (s.v == null) return null;
            const hp = s.low ? (1 - (s.v - 1) / 4) * 100 : ((s.v - 1) / 4) * 100;
            const c = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#EF4444';
            return (
              <span key={s.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 99, fontSize: '0.7rem',
                background: `${c}10`, border: `1px solid ${c}22`,
              }}>
                <span style={{ color: '#64748B' }}>{s.label}</span>
                <span style={{ fontWeight: 800, color: c, fontFamily: 'var(--font-mono)' }}>{s.v}/5</span>
              </span>
            );
          })}
          {log.notes && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
              borderRadius: 99, fontSize: '0.7rem', fontStyle: 'italic',
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.14)',
              color: '#4338CA', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              "{log.notes}"
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>{fmtDate(log.logged_at)}</div>
        <div style={{ fontSize: '0.65rem', color: '#A16207', marginTop: 2 }}>Check-in</div>
      </div>
    </div>
  );
}

// ─── MetricCard — interactive filter card with progress ──────────
function MetricCard({ label, count, total, color, icon: Icon, description, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        textAlign: 'left', padding: '18px 18px 16px', borderRadius: 18, cursor: 'pointer',
        border: isActive ? `2px solid ${color}` : hov ? `1.5px solid ${color}50` : '1.5px solid #E2E8F0',
        background: isActive
          ? `linear-gradient(145deg, ${color}09, ${color}04)`
          : hov ? `${color}04` : '#FFFFFF',
        boxShadow: isActive
          ? `0 6px 28px ${color}1A, 0 1px 4px rgba(0,0,0,0.04)`
          : hov ? `0 4px 16px ${color}10, 0 1px 3px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hov && !isActive ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        width: '100%',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: isActive ? `${color}18` : `${color}0E`,
          border: `1px solid ${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
          transition: 'all 0.2s',
        }}>
          <Icon size={16} />
        </div>
        {total > 0 && (
          <div style={{
            fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 7,
            background: isActive ? `${color}12` : '#F8FAFC',
            border: `1px solid ${isActive ? `${color}22` : '#E2E8F0'}`,
            color: isActive ? color : '#94A3B8',
            letterSpacing: '0.02em', transition: 'all 0.2s',
          }}>
            {pct}%
          </div>
        )}
      </div>

      {/* Count */}
      <div style={{
        fontSize: '2.1rem', fontWeight: 900, lineHeight: 1,
        letterSpacing: '-0.045em', marginBottom: 3,
        color: isActive ? color : (count > 0 ? color : '#CBD5E1'),
        transition: 'color 0.2s',
      }}>
        {count}
      </div>

      {/* Label */}
      <div style={{
        fontSize: '0.77rem', fontWeight: 700, marginBottom: 10,
        color: isActive ? color : '#475569',
        transition: 'color 0.2s',
      }}>
        {label}
      </div>

      {/* Progress bar */}
      {total > 0 ? (
        <div style={{ height: 4, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', marginBottom: 9 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            minWidth: pct > 0 ? 4 : 0,
          }} />
        </div>
      ) : (
        <div style={{ height: 4, borderRadius: 99, background: '#F1F5F9', marginBottom: 9 }} />
      )}

      {/* Description */}
      <div style={{ fontSize: '0.67rem', color: '#94A3B8', lineHeight: 1.45 }}>{description}</div>
    </button>
  );
}

// ─── PlayerHealthRow — premium datatable row ──────────────────────
function PlayerHealthRow({ player }) {
  const h     = player.latest_health;
  const level = healthLevel(h);
  const cfg   = LEVEL_CONFIG[level];
  const base  = h?.is_flagged ? 'rgba(239,68,68,0.018)' : 'transparent';
  const hover = h?.is_flagged ? 'rgba(239,68,68,0.05)'  : 'rgba(99,102,241,0.022)';

  return (
    <tr
      style={{ background: base, transition: 'background 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = hover; }}
      onMouseLeave={e => { e.currentTarget.style.background = base; }}
    >
      {/* Player */}
      <td style={{ padding: '13px 16px 13px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayerAvatar firstName={player.first_name} lastName={player.last_name} level={level} size={34} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              {player.first_name} {player.last_name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{player.email}</div>
          </div>
        </div>
      </td>

      {/* Teams */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {player.teams.length ? player.teams.map(t => (
            <span key={t.id} style={{
              fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE',
            }}>
              {t.name}
            </span>
          )) : <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>—</span>}
        </div>
      </td>

      {/* Last check-in */}
      <td style={{ padding: '13px 16px' }}>
        {h ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {daysAgo(h.logged_at)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>No data</span>
        )}
      </td>

      {/* Fatigue */}
      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
        <ScoreBar value={h?.fatigue} lowIsBetter={true} />
      </td>

      {/* Soreness */}
      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
        <ScoreBar value={h?.soreness} lowIsBetter={true} />
      </td>

      {/* Sleep */}
      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
        <ScoreBar value={h?.sleep_quality} lowIsBetter={false} />
      </td>

      {/* Status */}
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: cfg.color,
            boxShadow: `0 0 0 3px ${cfg.color}22`,
          }} />
          <span style={{
            fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          }}>
            {cfg.label}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function CoachHealthPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: alerts, loading: alertsLoading } = useApi(
    () => healthApi.getAlerts(),
    [], { fallback: [] }
  );
  const { data: playersData, loading: playersLoading, error: playersError } = useApi(
    () => coachApi.getPlayers(),
    [], { fallback: { players: [] } }
  );

  const players        = playersData?.players ?? [];
  const flaggedCount   = players.filter(p => p.latest_health?.is_flagged).length;
  const noDataCount    = players.filter(p => !p.latest_health).length;
  const goodCount      = players.filter(p => p.latest_health && !p.latest_health.is_flagged && healthLevel(p.latest_health) === 'good').length;
  const attentionCount = players.filter(p => { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }).length;

  const filtered = players.filter(p => {
    if (statusFilter === 'all')           return true;
    if (statusFilter === 'flagged')       return p.latest_health?.is_flagged;
    if (statusFilter === 'no-data')       return !p.latest_health;
    if (statusFilter === 'good')          return p.latest_health && !p.latest_health.is_flagged && healthLevel(p.latest_health) === 'good';
    if (statusFilter === 'needs-attention') {
      const lv = healthLevel(p.latest_health);
      return lv === 'poor' || lv === 'moderate';
    }
    return true;
  });

  const loading = alertsLoading || playersLoading;

  const metricCards = [
    { label: 'Total Players',   count: players.length, color: '#2563EB', icon: Users,         filter: 'all',             total: null,           description: 'Active roster members'      },
    { label: 'Flagged',         count: flaggedCount,   color: '#EF4444', icon: AlertTriangle, filter: 'flagged',         total: players.length, description: 'Self-flagged as struggling'  },
    { label: 'Needs Attention', count: attentionCount, color: '#D97706', icon: Zap,           filter: 'needs-attention', total: players.length, description: 'Moderate to high fatigue'    },
    { label: 'Good',            count: goodCount,      color: '#059669', icon: CheckCircle2,  filter: 'good',            total: players.length, description: 'Healthy & ready to train'    },
    { label: 'No Data',         count: noDataCount,    color: '#94A3B8', icon: Activity,      filter: 'no-data',         total: players.length, description: 'Awaiting check-in today'     },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Health Monitor"
        subtitle={`Wellness intelligence across ${players.length} player${players.length !== 1 ? 's' : ''}`}
        badge={flaggedCount > 0 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700,
            padding: '4px 12px', borderRadius: 99,
            background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA',
            boxShadow: '0 2px 8px rgba(239,68,68,0.15)',
          }}>
            <AlertTriangle size={11} /> {flaggedCount} flagged
          </span>
        ) : null}
      />

      {/* ── Health Alerts Banner ──────────────────────────────────── */}
      {(alerts || []).length > 0 && (
        <div style={{
          marginBottom: 24, borderRadius: 18,
          background: 'rgba(255,251,235,0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(217,119,6,0.14)',
          borderLeft: '4px solid #F59E0B',
          boxShadow: '0 4px 24px rgba(245,158,11,0.07)',
          overflow: 'hidden',
        }}>
          {/* Banner header */}
          <div style={{
            padding: '13px 20px',
            background: 'linear-gradient(90deg, rgba(245,158,11,0.09), transparent)',
            borderBottom: '1px solid rgba(217,119,6,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706',
              }}>
                <AlertTriangle size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#78350F' }}>Health Alerts</div>
                <div style={{ fontSize: '0.72rem', color: '#A16207', marginTop: 1 }}>
                  {(alerts || []).length} player{(alerts || []).length !== 1 ? 's' : ''} require immediate attention
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.04em',
              background: 'rgba(239,68,68,0.09)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.14)',
            }}>
              {(alerts || []).length} ALERT{(alerts || []).length !== 1 ? 'S' : ''}
            </span>
          </div>

          {/* Alert rows */}
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {(alerts || []).slice(0, 5).map(log => (
              <AlertBanner key={log.id} log={log} />
            ))}
            {(alerts || []).length > 5 && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#A16207', paddingTop: 4, fontWeight: 600 }}>
                +{(alerts || []).length - 5} more alerts — visible in the table below
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Metric Cards ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        {metricCards.map(c => (
          <MetricCard
            key={c.filter}
            label={c.label}
            count={c.count}
            total={c.total}
            color={c.color}
            icon={c.icon}
            description={c.description}
            isActive={statusFilter === c.filter}
            onClick={() => setStatusFilter(c.filter)}
          />
        ))}
      </div>

      {/* ── Player Wellness Table ─────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF', borderRadius: 20,
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
        overflow: 'hidden', marginBottom: 16,
      }}>
        {/* Table toolbar */}
        <div style={{
          padding: '15px 20px',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.04), transparent)',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Player Wellness
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Latest health check-in per player · {filtered.length} of {players.length} shown
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 99,
                  background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
              >
                Clear filter
              </button>
            )}
            <Filter size={14} style={{ color: '#94A3B8' }} />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 58, borderRadius: 12 }} />)}
          </div>
        ) : playersError ? (
          <div className="alert alert-error" style={{ margin: 16 }}>{playersError}</div>
        ) : !filtered.length ? (
          <EmptyState
            icon={<Activity size={24} />}
            title="No players match"
            subtitle={statusFilter !== 'all' ? 'Try clearing the filter to see all players.' : 'No players rostered on your teams yet.'}
            action={statusFilter !== 'all' ? (
              <button onClick={() => setStatusFilter('all')} className="btn btn-ghost btn-sm">Clear filter</button>
            ) : null}
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Player</th>
                <th>Teams</th>
                <th>Last Check-in</th>
                <th style={{ textAlign: 'center' }}>Fatigue</th>
                <th style={{ textAlign: 'center' }}>Soreness</th>
                <th style={{ textAlign: 'center' }}>Sleep</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => <PlayerHealthRow key={p.id} player={p} />)}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Score Guide Footer ────────────────────────────────────── */}
      <div style={{
        padding: '13px 18px', borderRadius: 14,
        background: 'rgba(248,250,252,0.8)',
        border: '1px solid #E2E8F0',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1',
        }}>
          <Info size={14} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', flex: 1 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 1 }}>
              Fatigue &amp; Soreness
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>1 = great · 5 = very tired/sore</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#E2E8F0', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 1 }}>
              Sleep Quality
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>1 = poor · 5 = excellent</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#E2E8F0', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.7rem', color: '#DC2626', marginBottom: 1 }}>
              Flagged Status
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Player self-reported as struggling</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#E2E8F0', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { color: '#10B981', label: 'Healthy range' },
              { color: '#F59E0B', label: 'Moderate concern' },
              { color: '#EF4444', label: 'High risk' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 24, height: 5, borderRadius: 99,
                  background: `linear-gradient(90deg, ${color}88, ${color})`,
                }} />
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
