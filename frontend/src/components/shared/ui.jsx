// src/components/shared/ui.jsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────────────────────────

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6, ...style }} />;
}

export function SkeletonCard({ rows = 3, style = {} }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <SkeletonLine width="40%" height={16} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? '60%' : '100%'} height={12} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
        {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width="55%" height={11} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '13px 16px', borderBottom: r < rows - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          {Array.from({ length: cols }).map((_, c) => <SkeletonLine key={c} width={c === 0 ? '75%' : '45%'} height={13} />)}
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
    <div className="alert alert-error" style={{ justifyContent: 'space-between', alignItems: 'center', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertCircle size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{ background: 'none', border: '1px solid currentColor', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'inherit', opacity: 0.8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Retry
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12, textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--accent-subtle)', border: '1px solid var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)', marginBottom: 4,
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 300, margin: 0 }}>{subtitle}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: '4px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, action, children, style = {}, noPad, accentColor }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      ...style,
    }}>
      {accentColor && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
      )}
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: accentColor ? '18px 20px 14px' : '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            {title && <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</div>}
            {subtitle && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={noPad ? {} : { padding: '20px' }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// KPI STAT CARD — with optional sparkline chart
// ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, subtitle, icon, color = 'var(--accent)', trend, onViewReport, sparkData, accentClass }) {
  const trendPos   = trend > 0;
  const trendNeg   = trend < 0;
  const trendColor = trendPos ? 'var(--success)' : trendNeg ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div
      className={`card card-accent-bar ${accentClass || ''}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 0, padding: 0,
        cursor: onViewReport ? 'default' : 'default',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
    >
      <div style={{ padding: '18px 20px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{label}</div>
          {icon && (
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, border: `1px solid ${color}20` }}>
              {icon}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</div>
          {trend !== undefined && trend !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.82rem', fontWeight: 700, color: trendColor, paddingBottom: 3 }}>
              {trendPos ? <TrendingUp size={14} /> : trendNeg ? <TrendingDown size={14} /> : <Minus size={14} />}
              {trend !== 0 && <span>{Math.abs(trend)}%</span>}
            </div>
          )}
        </div>

        {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>{subtitle}</div>}
      </div>

      {/* Sparkline area */}
      {sparkData && sparkData.length > 1 && (
        <div style={{ height: 52, marginTop: -8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {onViewReport && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onViewReport}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color, padding: '10px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}08`}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            View report →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  Present:  { bg: 'var(--success-subtle)', color: 'var(--success)', border: 'var(--success-border)' },
  Absent:   { bg: 'var(--danger-subtle)',  color: 'var(--danger)',  border: 'var(--danger-border)'  },
  Injured:  { bg: 'var(--warning-subtle)', color: 'var(--warning)', border: 'var(--warning-border)' },
  Pending:  { bg: 'var(--bg-elevated)',    color: 'var(--text-muted)', border: 'var(--border-default)' },
  Active:   { bg: 'var(--success-subtle)', color: 'var(--success)', border: 'var(--success-border)' },
  Inactive: { bg: 'var(--bg-elevated)',    color: 'var(--text-muted)', border: 'var(--border-default)' },
};

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem',
      fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
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
  const color  = isBad ? 'var(--danger)'  : isGood ? 'var(--success)' : 'var(--text-muted)';
  const bg     = isBad ? 'var(--danger-subtle)' : isGood ? 'var(--success-subtle)' : 'var(--bg-elevated)';
  const border = isBad ? 'var(--danger-border)' : isGood ? 'var(--success-border)' : 'var(--border-default)';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color, padding: '2px 8px', background: bg, borderRadius: 6, border: `1px solid ${border}` }}>
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
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {role}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// AVATAR — DiceBear-powered
// ─────────────────────────────────────────────────────────────────

const ROLE_COLORS_MAP = { Admin: '#7C3AED', Coach: '#2563EB', Player: '#059669', Parent: '#D97706' };

export function Avatar({ name, role, size = 36, src }) {
  const color  = ROLE_COLORS_MAP[role] || '#6366F1';
  const seed   = encodeURIComponent(name || 'user');
  const apiSrc = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e3a5f&fontFamily=Inter&fontSize=38&fontWeight=700&textColor=ffffff&size=64`;

  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}35`, flexShrink: 0 }} />;
  }

  return (
    <img
      src={apiSrc}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${color}30`, background: '#1e3a5f', flexShrink: 0 }}
      onError={e => {
        const parts = (name || '').split(' ');
        const init  = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
        e.currentTarget.outerHTML = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}20;border:2px solid ${color}35;display:flex;align-items:center;justify-content:center;font-size:${size*0.3}px;font-weight:800;color:${color};flex-shrink:0">${init}</div>`;
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// MINI AREA CHART — inline sparkline
// ─────────────────────────────────────────────────────────────────

export function MiniAreaChart({ data, color = 'var(--accent)', height = 60 }) {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="miniArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#miniArea)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────
// MINI BAR CHART — inline attendance/count bars
// ─────────────────────────────────────────────────────────────────

export function MiniBarChart({ data, color = 'var(--accent)', height = 60 }) {
  if (!data || data.length < 1) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="25%">
        <Bar dataKey="v" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────
// TREND LINE CHART — health / sessions over time
// ─────────────────────────────────────────────────────────────────

export function TrendLineChart({ data, lines = [], height = 200, xKey = 'label' }) {
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
          labelStyle={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: 4 }}
        />
        {lines.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────
// GROUPED BAR CHART — attendance breakdown
// ─────────────────────────────────────────────────────────────────

export function GroupedBarChart({ data, bars = [], height = 200, xKey = 'label' }) {
  const COLORS = { Present: '#10B981', Absent: '#EF4444', Injured: '#F59E0B', pending: '#94A3B8' };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }} barCategoryGap="30%">
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
        />
        {bars.map(key => (
          <Bar key={key} dataKey={key} fill={COLORS[key] || '#6366F1'} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROGRESS RING — circular progress indicator
// ─────────────────────────────────────────────────────────────────

export function ProgressRing({ value = 0, max = 100, size = 72, color = 'var(--accent)', label, sublabel }) {
  const pct    = Math.min(100, Math.max(0, (value / max) * 100));
  const r      = (size - 6) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={5} />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {label !== undefined && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: size * 0.22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{label}</span>
            {sublabel && <span style={{ fontSize: size * 0.13, color: 'var(--text-muted)', fontWeight: 600 }}>{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HEALTH SCORE METER
// ─────────────────────────────────────────────────────────────────

export function HealthMeter({ fatigue, soreness, sleep }) {
  const score = Math.round(((5 - fatigue) + (5 - soreness) + sleep) / 3 * 20);
  const color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <ProgressRing value={score} max={100} size={68} color={color} label={`${score}`} sublabel="/ 100" />
  );
}

// ─────────────────────────────────────────────────────────────────
// REGISTRATION DONUT — multi-color pie for invite acceptance rate
// ─────────────────────────────────────────────────────────────────

export function RegistrationDonut({ accepted = 0, pending = 0, expired = 0, size = 130 }) {
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
          <Pie
            data={chartData}
            cx={cx - 1} cy={cx - 1}
            innerRadius={inner} outerRadius={outer}
            startAngle={90} endAngle={-270}
            dataKey="value"
            strokeWidth={2}
            stroke="#fff"
          >
            {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
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

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Accepted', color: '#10B981', count: accepted },
          { label: 'Pending',  color: '#F59E0B', count: pending  },
          { label: 'Expired',  color: '#E2E8F0', count: expired, textColor: '#94A3B8' },
        ].map(({ label, color, count, textColor }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: textColor || '#475569', fontWeight: 500 }}>
              {label} <strong style={{ color: textColor || '#0F172A' }}>{count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// OCEAN BAR CHART — ocean-blue gradient bar chart for distributions
// ─────────────────────────────────────────────────────────────────

const OCEAN_PALETTE = [
  { from: '#0EA5E9', to: '#38BDF8' },
  { from: '#06B6D4', to: '#67E8F9' },
  { from: '#3B82F6', to: '#93C5FD' },
];

export function OceanBarChart({ data = [], height = 130 }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="35%">
        <defs>
          {data.map((_, i) => {
            const p = OCEAN_PALETTE[i % OCEAN_PALETTE.length];
            return (
              <linearGradient key={i} id={`ocean-bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={p.from} stopOpacity={1}   />
                <stop offset="100%" stopColor={p.to}   stopOpacity={0.65} />
              </linearGradient>
            );
          })}
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
          axisLine={false} tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: '#fff', border: '1px solid #F1F5F9',
            borderRadius: 10, boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
            fontSize: '0.8rem',
          }}
          cursor={{ fill: 'rgba(14,165,233,0.05)', borderRadius: 6 }}
          formatter={(v, n) => [`${v} member${v !== 1 ? 's' : ''}`, n]}
        />
        <Bar dataKey="v" radius={[7, 7, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#ocean-bar-${i})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────
// MINI CALENDAR — current-month grid with colored event dots
// ─────────────────────────────────────────────────────────────────

const CAL_DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function MiniCalendar({ events = [] }) {
  const [offset, setOffset] = React.useState(0);

  const base   = new Date();
  base.setMonth(base.getMonth() + offset, 1);
  const year   = base.getFullYear();
  const month  = base.getMonth();
  const today  = new Date();

  // Map dates with events → array of colors
  const eventMap = {};
  events.forEach(ev => {
    const d = new Date(ev.start_time || ev.date || ev.created_at);
    if (!isNaN(d) && d.getMonth() === month && d.getFullYear() === year) {
      const k = d.getDate();
      if (!eventMap[k]) eventMap[k] = [];
      const typeColors = {
        training: '#8B5CF6', match: '#EC4899', practice: '#0EA5E9',
        meeting: '#F59E0B', other: '#10B981',
      };
      eventMap[k].push(typeColors[ev.type] || '#8B5CF6');
    }
  });

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName   = base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d) =>
    d !== null &&
    d === today.getDate() &&
    month === today.getMonth() &&
    year  === today.getFullYear();

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setOffset(o => o - 1)}
          style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.01em' }}>
          {monthName}
        </span>
        <button
          onClick={() => setOffset(o => o + 1)}
          style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {CAL_DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: '#CBD5E1', padding: '2px 0', letterSpacing: '0.04em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          const today_   = isToday(day);
          const dots     = day ? (eventMap[day] || []) : [];
          const hasDots  = dots.length > 0;

          return (
            <div
              key={i}
              style={{
                textAlign: 'center', padding: '5px 2px 4px',
                borderRadius: 8, position: 'relative',
                background: today_
                  ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)'
                  : hasDots ? 'rgba(139,92,246,0.06)' : 'transparent',
                boxShadow: today_ ? '0 2px 8px rgba(168,85,247,0.3)' : 'none',
                transition: 'background 0.12s',
              }}
            >
              {day !== null && (
                <>
                  <span style={{
                    display: 'block',
                    fontSize: '0.72rem', fontWeight: today_ ? 700 : 400,
                    color: today_ ? '#fff' : '#475569',
                    lineHeight: 1.4,
                  }}>
                    {day}
                  </span>
                  {hasDots && !today_ && (
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

      {/* Event count footer */}
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
