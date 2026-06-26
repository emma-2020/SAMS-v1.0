'use client';

/**
 * Shared analytics UI primitives — Power BI-inspired.
 * All animations use recharts built-in + CSS transitions only (no framer-motion dep).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────────

export const BRAND   = '#7C3AED';
export const SUCCESS = '#10B981';
export const WARNING = '#F59E0B';
export const DANGER  = '#EF4444';
export const ACCENT  = '#6366F1';
export const INFO    = '#0EA5E9';

// ─── Count-Up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900, format?: (n: number) => string) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return format ? format(val) : val;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div style={{
      height,
      borderRadius: 16,
      background: 'linear-gradient(90deg, var(--bg-elevated,#F1F5F9) 25%, var(--bg-hover,#E2E8F0) 50%, var(--bg-elevated,#F1F5F9) 75%)',
      backgroundSize: '400% 100%',
      animation: 'skeleton-shimmer 1.4s ease infinite',
    }} />
  );
}

// ─── Period Toggle ────────────────────────────────────────────────────────────

export function PeriodToggle({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 9, padding: 3, border: '1px solid var(--border-subtle,#E2E8F0)' }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
            background: value === o.value ? BRAND : 'transparent',
            color:      value === o.value ? '#fff'  : 'var(--text-muted,#64748B)',
            boxShadow:  value === o.value ? `0 2px 8px ${BRAND}40` : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:     string;
  value:     number;
  format?:   (n: number) => string;
  delta?:    number | null;
  color?:    string;
  sparkline?: { v: number }[];
  subtitle?: string;
  icon?:     React.ReactNode;
}

export function StatCard({ label, value, format, delta, color = BRAND, sparkline, subtitle, icon }: StatCardProps) {
  const displayed = useCountUp(value, 900, format);

  return (
    <div style={{
      background:   'var(--bg-surface,#fff)',
      border:       '1px solid var(--border-subtle,#F1F5F9)',
      borderRadius: 16,
      padding:      '18px 20px 14px',
      boxShadow:    '0 4px 24px rgba(15,23,42,0.05)',
      display:      'flex', flexDirection: 'column', gap: 0,
      animation:    'card-in 0.35s ease both',
      overflow:     'hidden',
      position:     'relative',
    }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}80)`, borderRadius: '16px 16px 0 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted,#94A3B8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
        {icon && (
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary,#0F172A)', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {displayed}
        </span>
        {delta != null && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, paddingBottom: 3,
            color: delta > 0 ? SUCCESS : delta < 0 ? DANGER : 'var(--text-muted,#94A3B8)',
          }}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '–'} {Math.abs(delta)}%
          </span>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted,#94A3B8)', marginBottom: 10 }}>{subtitle}</div>
      )}

      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: 8, height: 36, marginLeft: -20, marginRight: -20 }}>
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sc-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Area
                type="monotone" dataKey="v" stroke={color} strokeWidth={2}
                fill={`url(#sc-grad-${color.replace('#', '')})`}
                dot={false} isAnimationActive animationDuration={1000} animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Animated Bar Chart ───────────────────────────────────────────────────────

interface AnimatedBarChartProps {
  data:        Record<string, string | number>[];
  dataKeys:    { key: string; color: string; label?: string }[];
  xAxisKey:    string;
  height?:     number;
  showLegend?: boolean;
}

export function AnimatedBarChart({ data, dataKeys, xAxisKey, height = 220, showLegend = false }: AnimatedBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <defs>
          {dataKeys.map(dk => (
            <linearGradient key={dk.key} id={`bar-grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={dk.color} stopOpacity={1}    />
              <stop offset="100%" stopColor={dk.color} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 11, fill: 'var(--text-muted,#94A3B8)', fontWeight: 500 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted,#94A3B8)' }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background:   'var(--bg-surface,#fff)',
            border:       '1px solid var(--border-subtle,#F1F5F9)',
            borderRadius: 10,
            boxShadow:    '0 8px 24px rgba(15,23,42,0.10)',
            fontSize:     '0.78rem',
          }}
          cursor={{ fill: 'rgba(99,102,241,0.05)', borderRadius: 6 } as any}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />}
        {dataKeys.map(dk => (
          <Bar
            key={dk.key}
            dataKey={dk.key}
            name={dk.label ?? dk.key}
            radius={[5, 5, 0, 0]}
            maxBarSize={44}
            fill={`url(#bar-grad-${dk.key})`}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Trend Area Chart ─────────────────────────────────────────────────────────

interface TrendAreaChartProps {
  data:     Record<string, string | number>[];
  dataKeys: { key: string; color: string; label?: string }[];
  xAxisKey: string;
  height?:  number;
}

export function TrendAreaChart({ data, dataKeys, xAxisKey, height = 200 }: TrendAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <defs>
          {dataKeys.map(dk => (
            <linearGradient key={dk.key} id={`area-grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={dk.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={dk.color} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 11, fill: 'var(--text-muted,#94A3B8)', fontWeight: 500 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted,#94A3B8)' }}
          axisLine={false} tickLine={false}
          domain={[0, 'auto']}
        />
        <Tooltip
          contentStyle={{
            background:   'var(--bg-surface,#fff)',
            border:       '1px solid var(--border-subtle,#F1F5F9)',
            borderRadius: 10,
            boxShadow:    '0 8px 24px rgba(15,23,42,0.10)',
            fontSize:     '0.78rem',
          }}
          cursor={{ stroke: 'var(--border-subtle,#E2E8F0)', strokeWidth: 1 }}
        />
        {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />}
        {dataKeys.map(dk => (
          <Area
            key={dk.key}
            type="monotone" dataKey={dk.key} name={dk.label ?? dk.key}
            stroke={dk.color} strokeWidth={2.5}
            fill={`url(#area-grad-${dk.key})`}
            dot={false}
            isAnimationActive animationDuration={1000} animationEasing="ease-out"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Donut Breakdown ──────────────────────────────────────────────────────────

interface DonutBreakdownProps {
  data:       { name: string; value: number; color: string }[];
  centerLabel?: string;
  centerSub?:   string;
  size?:        number;
}

export function DonutBreakdown({ data, centerLabel, centerSub, size = 160 }: DonutBreakdownProps) {
  const [active, setActive] = useState<number | null>(null);
  const cx      = size / 2;
  const inner   = Math.round(size * 0.30);
  const outer   = Math.round(size * 0.46);
  const total   = data.reduce((s, d) => s + d.value, 0);
  const display = active !== null ? data[active] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data.length ? data : [{ name: 'empty', value: 1, color: '#E2E8F0' }]}
            cx={cx - 1} cy={cx - 1}
            innerRadius={inner} outerRadius={outer}
            startAngle={90} endAngle={-270}
            dataKey="value"
            strokeWidth={2} stroke="var(--bg-surface,#fff)"
            isAnimationActive animationDuration={800} animationEasing="ease-out"
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((d, i) => (
              <Cell
                key={i} fill={d.color}
                opacity={active === null || active === i ? 1 : 0.35}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              />
            ))}
          </Pie>
        </PieChart>

        {/* Centre label */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: Math.round(size * 0.175), fontWeight: 900, color: display?.color ?? 'var(--text-primary,#0F172A)', lineHeight: 1, letterSpacing: '-0.02em', transition: 'color 0.2s' }}>
            {display ? display.value : (centerLabel ?? total)}
          </span>
          <span style={{ fontSize: Math.round(size * 0.09), color: 'var(--text-muted,#94A3B8)', fontWeight: 600, marginTop: 2, textAlign: 'center' }}>
            {display ? display.name : (centerSub ?? 'total')}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 120 }}>
        {data.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', opacity: active === null || active === i ? 1 : 0.45, transition: 'opacity 0.2s' }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary,#475569)', flex: 1 }}>{d.name}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary,#0F172A)' }}>{d.value}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted,#94A3B8)', minWidth: 32, textAlign: 'right' }}>
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButton({ onClick, label = 'Export CSV' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--border-default,#CBD5E1)',
        background: 'var(--bg-surface,#fff)', color: 'var(--text-secondary,#475569)',
        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7C3AED'; (e.currentTarget as HTMLElement).style.color = '#7C3AED'; }}
      onMouseOut={e  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default,#CBD5E1)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary,#475569)'; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      {label}
    </button>
  );
}

// ─── Horizontal Player Bar ────────────────────────────────────────────────────

export interface HBarRow {
  id?:   string;
  name:  string;
  value: number;
  max?:  number;
  color: string;
  badge?: string;
}

export function HorizontalPlayerBar({
  rows,
  max = 100,
  unit = '%',
  onRowClick,
}: {
  rows:         HBarRow[];
  max?:         number;
  unit?:        string;
  onRowClick?:  (id: string, name: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => {
        const pct       = Math.min((row.value / (row.max ?? max)) * 100, 100);
        const clickable = !!onRowClick && !!row.id;
        return (
          <div
            key={i}
            onClick={clickable ? () => onRowClick!(row.id!, row.name) : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: clickable ? 'pointer' : 'default', borderRadius: 8, padding: '2px 4px', transition: 'background 0.15s' }}
            onMouseOver={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated,#F8FAFC)'; }}
            onMouseOut={e  => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{
              fontSize: '0.78rem', fontWeight: 500, color: clickable ? BRAND : 'var(--text-secondary,#475569)',
              width: 120, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textDecoration: clickable ? 'underline dotted' : 'none',
            }}>
              {row.name}
            </span>
            <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 99,
                background: row.color,
                transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow:  `0 0 6px ${row.color}60`,
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: row.color, width: 40, textAlign: 'right', flexShrink: 0 }}>
              {row.value}{unit}
            </span>
            {row.badge && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: row.color + '18', color: row.color, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {row.badge}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Radar Chart (Player Skills) ──────────────────────────────────────────────

interface RadarChartProps {
  data:  { subject: string; value: number; fullMark?: number }[];
  color?: string;
  size?:  number;
}

export function SkillRadarChart({ data, color = BRAND, size = 220 }: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="var(--border-subtle,#E2E8F0)" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-secondary,#475569)', fontWeight: 500 }} />
        <Radar
          dataKey="value" stroke={color} strokeWidth={2}
          fill={color} fillOpacity={0.2}
          isAnimationActive animationDuration={900} animationEasing="ease-out"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Gauge / Speedometer ──────────────────────────────────────────────────────

interface GaugeProps {
  value:       number;
  max?:        number;
  size?:       number;
  label?:      string;
  sublabel?:   string;
}

export function WellnessGauge({ value, max = 100, size = 200, label, sublabel }: GaugeProps) {
  const color = value >= 70 ? SUCCESS : value >= 45 ? WARNING : DANGER;
  const cx    = size / 2;
  const r     = size * 0.38;
  const strokeW = size * 0.07;

  // Arc from 210° to 330° (240° sweep)
  const startAngle = 210;
  const sweepAngle = 240;
  const endAngle   = startAngle + (value / max) * sweepAngle;

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cx + radius * Math.sin(rad) };
  }

  function describeArc(start: number, end: number) {
    const s   = polarToXY(start, r);
    const e   = polarToXY(end,   r);
    const lg  = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${lg} 1 ${e.x} ${e.y}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={describeArc(startAngle, startAngle + sweepAngle)} fill="none" stroke="var(--bg-elevated,#F1F5F9)" strokeWidth={strokeW} strokeLinecap="round" />
        {/* Value arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.4s ease' }}
        />
        {/* Centre text */}
        <text x={cx} y={cx + 8} textAnchor="middle" fill="var(--text-primary,#0F172A)" fontSize={size * 0.18} fontWeight={900} letterSpacing="-0.02em">
          {value}
        </text>
        <text x={cx} y={cx + 8 + size * 0.1} textAnchor="middle" fill="var(--text-muted,#94A3B8)" fontSize={size * 0.075} fontWeight={600}>
          {sublabel ?? '/ 100'}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color, marginTop: -size * 0.1 }}>{label}</span>
      )}
    </div>
  );
}

// ─── Analytics Section Card ────────────────────────────────────────────────────

interface SectionCardProps {
  title:    string;
  subtitle?: string;
  action?:  React.ReactNode;
  children: React.ReactNode;
  accent?:  string;
  style?:   React.CSSProperties;
}

export function SectionCard({ title, subtitle, action, children, accent, style }: SectionCardProps) {
  return (
    <div style={{
      background:   'var(--bg-surface,#fff)',
      border:       '1px solid var(--border-subtle,#F1F5F9)',
      borderRadius: 18,
      boxShadow:    '0 4px 24px rgba(15,23,42,0.05)',
      overflow:     'hidden',
      animation:    'card-in 0.35s ease both',
      ...style,
    }}>
      {accent && <div style={{ height: 3, background: accent, width: '100%' }} />}
      <div style={{ padding: '18px 22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary,#0F172A)', letterSpacing: '-0.01em' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted,#94A3B8)', marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const BADGE_CFG: Record<string, { bg: string; color: string; border: string }> = {
  paid:      { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  partial:   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  overdue:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  present:   { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  absent:    { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  late:      { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  eligible:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  'at risk': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  MoMo:      { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  Cash:      { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  Bank:      { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = BADGE_CFG[status.toLowerCase()] ?? { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
  return (
    <span style={{
      display:      'inline-flex', alignItems: 'center',
      padding:      '3px 10px', borderRadius: 99,
      fontSize:     '0.68rem', fontWeight: 700,
      background:   s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace:   'nowrap', textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

// ─── Global CSS for animations ────────────────────────────────────────────────

export const ANALYTICS_CSS = `
  @keyframes card-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes skeleton-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .analytics-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }
  .analytics-kpi-grid > *:nth-child(1) { animation-delay: 0ms;   }
  .analytics-kpi-grid > *:nth-child(2) { animation-delay: 70ms;  }
  .analytics-kpi-grid > *:nth-child(3) { animation-delay: 140ms; }
  .analytics-kpi-grid > *:nth-child(4) { animation-delay: 210ms; }
  .analytics-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  .analytics-3col {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  @media (max-width: 900px) {
    .analytics-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .analytics-2col, .analytics-3col { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .analytics-kpi-grid { grid-template-columns: 1fr 1fr; }
  }
`;
