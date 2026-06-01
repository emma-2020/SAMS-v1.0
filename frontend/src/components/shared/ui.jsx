// src/components/shared/ui.jsx
import React from 'react';

// ─────────────────────────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────────────────────────

export function SkeletonLine({ width = '100%', height = 16, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />;
}

export function SkeletonCard({ rows = 3, style = {} }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <SkeletonLine width="55%" height={18} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? '70%' : '100%'} height={13} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ cols = 2, cards = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} rows={3} />)}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16, padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width="60%" height={12} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16, padding: '14px 20px',
          borderBottom: r < rows - 1 ? '1px solid var(--border-subtle)' : 'none',
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? '80%' : '50%'} height={13} />
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontSize: '0.875rem' }}>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: 'none', border: '1px solid rgba(239,68,68,0.4)',
          color: '#FCA5A5', padding: '4px 12px', borderRadius: 6,
          cursor: 'pointer', fontSize: '0.78rem',
          fontFamily: 'var(--font-display)', fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          flexShrink: 0, whiteSpace: 'nowrap',
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
      justifyContent: 'center', padding: '52px 24px', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))',
        border: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', marginBottom: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: '1.05rem', color: 'var(--text-primary)',
      }}>
        {title}
      </div>
      {subtitle && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 280 }}>
          {subtitle}
        </p>
      )}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────

export function PageHeader({ eyebrow, title, subtitle, action, roleColor = 'var(--accent)' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', marginBottom: 32, gap: 16,
      paddingBottom: 24,
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div>
        {eyebrow && (
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: roleColor, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              display: 'inline-block', width: 18, height: 2,
              background: roleColor, borderRadius: 2, flexShrink: 0,
            }} />
            {eyebrow}
          </div>
        )}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-0.01em', lineHeight: 1.05,
          marginBottom: subtitle ? 8 : 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, action, children, style = {}, accent, accentColor }) {
  const topColor = accentColor || (accent ? 'var(--accent)' : null);

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      {/* Gradient accent line at top */}
      {topColor && (
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${topColor}, transparent)`,
        }} />
      )}

      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 20px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>

      {/* Card body */}
      <div style={{ padding: '20px', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STAT CARD — quick metric display
// ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon, color = 'var(--accent)', trend }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      transition: 'border-color var(--transition-fast)',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = `${color}40`}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
        background: `${color}15`,
        border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.6rem',
          fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '0.76rem', color: 'var(--text-muted)',
          fontFamily: 'var(--font-display)', fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2,
        }}>
          {label}
        </div>
      </div>
      {trend !== undefined && (
        <div style={{
          fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
          color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
          flexShrink: 0,
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Present: { bg: 'var(--success-subtle)', color: 'var(--success)',     border: 'rgba(16,185,129,0.3)'  },
  Absent:  { bg: 'var(--danger-subtle)',  color: 'var(--danger)',      border: 'rgba(239,68,68,0.3)'   },
  Injured: { bg: 'var(--warning-subtle)', color: 'var(--warning)',     border: 'rgba(245,158,11,0.3)'  },
  Pending: { bg: 'var(--bg-overlay)',     color: 'var(--text-muted)',  border: 'var(--border-default)' },
};

export function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
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
  const isBad = low ? value >= 4 : value <= 2;
  const color = isBad ? 'var(--danger)' : value >= 4 ? 'var(--success)' : 'var(--text-secondary)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 500,
      color, padding: '1px 8px',
      background: isBad ? 'var(--danger-subtle)' : 'var(--bg-overlay)',
      borderRadius: 4,
      border: `1px solid ${isBad ? 'rgba(239,68,68,0.25)' : 'var(--border-subtle)'}`,
    }}>
      {value}/5
    </span>
  );
}
