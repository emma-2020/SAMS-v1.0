// src/components/shared/ui.jsx
import React from 'react';

// ─────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────

export function SkeletonLine({ width = '100%', height = 16, style = {} }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />
  );
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 16,
    }}>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} rows={3} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width="60%" height={12} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          padding: '14px 20px',
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
      justifyContent: 'space-between',
      alignItems: 'center',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.75" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontSize: '0.875rem' }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'none', border: '1px solid rgba(239,68,68,0.4)',
            color: '#FCA5A5', padding: '4px 12px', borderRadius: 6,
            cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-display)',
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
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
      justifyContent: 'center', padding: '48px 24px', gap: 12,
      textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', marginBottom: 4,
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
    }}>
      <div>
        {eyebrow && (
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: roleColor, marginBottom: 8,
          }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
          fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-0.01em', lineHeight: 1.1,
          marginBottom: subtitle ? 8 : 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION CARD (titled widget wrapper)
// ─────────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, action, children, style = {}, accent }) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      ...(accent ? { borderColor: 'var(--border-accent)' } : {}),
      ...style,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        marginBottom: 20,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1.05rem', color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATUS PILL (Present / Absent / Injured)
// ─────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Present:  { bg: 'var(--success-subtle)', color: 'var(--success)',  border: 'rgba(16,185,129,0.3)' },
  Absent:   { bg: 'var(--danger-subtle)',  color: 'var(--danger)',   border: 'rgba(239,68,68,0.3)'   },
  Injured:  { bg: 'var(--warning-subtle)', color: 'var(--warning)',  border: 'rgba(245,158,11,0.3)'  },
  Pending:  { bg: 'var(--bg-overlay)',     color: 'var(--text-muted)', border: 'var(--border-default)' },
};

export function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: s.color,
      }} />
      {status || 'Pending'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCORE CHIP (health metric 1–5)
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
