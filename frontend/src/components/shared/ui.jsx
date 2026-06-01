// src/components/shared/ui.jsx
import React from 'react';

// ─────────────────────────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────────────────────────

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6, ...style }} />;
}

export function SkeletonCard({ rows = 3, style = {} }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <SkeletonLine width="45%" height={16} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? '65%' : '100%'} height={12} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container">
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16, padding: '12px 16px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-elevated)',
      }}>
        {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width="55%" height={11} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16, padding: '13px 16px',
          borderBottom: r < rows - 1 ? '1px solid var(--border-subtle)' : 'none',
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? '75%' : '45%'} height={13} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ERROR BANNER
// ─────────────────────────────────────────────────────────────────

export function ErrorBanner({ message, onRetry, style = {} }) {
  return (
    <div className="alert alert-error" style={{
      justifyContent: 'space-between', alignItems: 'center', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: 'none', border: '1px solid currentColor',
          borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
          fontSize: '0.75rem', fontWeight: 600, color: 'inherit',
          opacity: 0.8, flexShrink: 0,
        }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '56px 24px', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'var(--accent-subtle)',
        border: '1px solid var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)', marginBottom: 4,
      }}>
        {icon}
      </div>
      <div style={{
        fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)',
      }}>
        {title}
      </div>
      {subtitle && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 300, margin: 0 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAGE HEADER  — GymFlow style
// ─────────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24, gap: 16,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.02em',
          }}>
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p style={{
            color: 'var(--text-muted)', fontSize: '0.875rem',
            marginTop: 3, margin: 0,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION CARD — GymFlow widget style
// ─────────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, action, children, style = {}, noPad }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            {title && (
              <div style={{
                fontWeight: 700, fontSize: '0.95rem',
                color: 'var(--text-primary)', letterSpacing: '-0.01em',
              }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={noPad ? {} : { padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// KPI STAT CARD — GymFlow style (white card, big number, trend)
// ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, subtitle, icon, color = 'var(--accent)', trend, onViewReport }) {
  const trendPos = trend > 0;
  const trendNeg = trend < 0;
  const trendColor = trendPos ? 'var(--success)' : trendNeg ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div style={{
          fontSize: '2rem', fontWeight: 800,
          color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em',
        }}>
          {value}
        </div>
        {trend !== undefined && trend !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: '0.8rem', fontWeight: 600,
            color: trendColor, paddingBottom: 3,
          }}>
            <span>{trendPos ? '↑' : trendNeg ? '↓' : '—'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{subtitle}</div>
      )}

      {onViewReport && (
        <>
          <div style={{ height: 1, background: 'var(--border-subtle)', marginTop: 'auto' }} />
          <button
            onClick={onViewReport}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)',
              padding: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            View report →
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  Present:  { bg: 'var(--success-subtle)', color: 'var(--success)',  border: 'var(--success-border)' },
  Absent:   { bg: 'var(--danger-subtle)',  color: 'var(--danger)',   border: 'var(--danger-border)'  },
  Injured:  { bg: 'var(--warning-subtle)', color: 'var(--warning)',  border: 'var(--warning-border)' },
  Pending:  { bg: 'var(--bg-elevated)',    color: 'var(--text-muted)', border: 'var(--border-default)' },
  Active:   { bg: 'var(--success-subtle)', color: 'var(--success)',  border: 'var(--success-border)' },
  Inactive: { bg: 'var(--bg-elevated)',    color: 'var(--text-muted)', border: 'var(--border-default)' },
};

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem',
      fontWeight: 600, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
      {status || 'Pending'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCORE CHIP
// ─────────────────────────────────────────────────────────────────

export function ScoreChip({ value, low = false }) {
  const isBad  = low ? value >= 4 : value <= 2;
  const isGood = low ? value <= 2 : value >= 4;
  const color  = isBad ? 'var(--danger)' : isGood ? 'var(--success)' : 'var(--text-muted)';
  const bg     = isBad ? 'var(--danger-subtle)' : isGood ? 'var(--success-subtle)' : 'var(--bg-elevated)';
  const border = isBad ? 'var(--danger-border)' : isGood ? 'var(--success-border)' : 'var(--border-default)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600,
      color, padding: '2px 8px', background: bg,
      borderRadius: 6, border: `1px solid ${border}`,
    }}>
      {value}/5
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROLE BADGE
// ─────────────────────────────────────────────────────────────────

const ROLE_BADGE_MAP = {
  Admin:  { bg: '#F3EFFF', color: '#7C3AED', border: '#DDD6FE' },
  Coach:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  Player: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  Parent: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
};

export function RoleBadge({ role }) {
  const s = ROLE_BADGE_MAP[role] || ROLE_BADGE_MAP.Player;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 99,
      fontSize: '0.72rem', fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {role}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  Admin:  '#7C3AED', Coach: '#2563EB', Player: '#059669', Parent: '#D97706',
};

export function Avatar({ name, role, size = 36 }) {
  const color = ROLE_COLORS[role] || '#6366F1';
  const parts  = (name || '').split(' ');
  const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}15`,
      border: `1.5px solid ${color}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color,
    }}>
      {initials}
    </div>
  );
}
