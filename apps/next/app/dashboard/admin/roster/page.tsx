'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, chatApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { UserProfile, MemberDetail, HealthLogEntry } from '@sams/api';

// ─── Design tokens ────────────────────────────────────────────────────
const C = {
  indigo:     '#6366F1',
  indigoDk:   '#4338CA',
  violet:     '#8B5CF6',
  green:      '#10B981',
  greenBg:    '#ECFDF5',
  greenBdr:   '#A7F3D0',
  amber:      '#F59E0B',
  amberBg:    '#FFFBEB',
  amberBdr:   '#FDE68A',
  red:        '#EF4444',
  redBg:      '#FEF2F2',
  redBdr:     '#FECACA',
  blue:       '#3B82F6',
  slate50:    '#F8FAFC',
  slate100:   '#F1F5F9',
  slate200:   '#E2E8F0',
  slate300:   '#CBD5E1',
  slate400:   '#94A3B8',
  slate500:   '#64748B',
  slate600:   '#475569',
  slate700:   '#334155',
  slate900:   '#0F172A',
};

const ROLE_META: Record<string, { color: string; bg: string; border: string; gradient: string; tint: string }> = {
  Admin:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', gradient: 'linear-gradient(135deg,#7C3AED,#6D28D9)', tint: 'rgba(124,58,237,0.06)' },
  Coach:  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)', tint: 'rgba(37,99,235,0.06)' },
  Player: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', gradient: 'linear-gradient(135deg,#059669,#047857)', tint: 'rgba(5,150,105,0.06)' },
  Parent: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', gradient: 'linear-gradient(135deg,#D97706,#B45309)', tint: 'rgba(217,119,6,0.06)' },
};

const ROLE_FILTERS = ['All', 'Admin', 'Coach', 'Player', 'Parent'];

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtRelative(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return fmtDate(iso);
}
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function wellnessAvg(logs: HealthLogEntry[]) {
  if (!logs.length) return null;
  return Math.round(logs.reduce((a, l) => a + (l.fatigue + l.soreness + l.sleep_quality) / 3, 0) / logs.length * 10) / 10;
}
function wellnessColor(avg: number | null) {
  if (avg === null) return C.slate400;
  if (avg >= 3.5)   return C.green;
  if (avg >= 2.5)   return C.amber;
  return C.red;
}
function profileCompletion(detail: MemberDetail): number {
  let score = 40; // base: name + email always present
  if ((detail.teams ?? []).length > 0) score += 20;
  if (detail.role === 'Player' && detail.parent) score += 20;
  if (detail.role === 'Player' && (detail.health_logs ?? []).length > 0) score += 20;
  if (detail.role === 'Parent' && (detail.children ?? []).length > 0) score += 20;
  if (detail.role === 'Coach' && (detail.teams ?? []).length > 0) score += 20;
  if (detail.role === 'Admin') score = 100;
  return Math.min(score, 100);
}

// ─── Icons ────────────────────────────────────────────────────────────
const Ico = {
  X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Chevron: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Mail: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Calendar: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Shield: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Users: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Heart: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Activity: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Clock: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MessageSquare: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Pencil: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  UserCheck: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  Dots: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
};

// ─── Sparkline SVG ────────────────────────────────────────────────────
function Sparkline({ logs, width = 100, height = 32 }: { logs: HealthLogEntry[]; width?: number; height?: number }) {
  if (logs.length < 2) return null;
  const W = width, H = height, PAD = 3;
  const pts = [...logs].reverse().map(l => (l.fatigue + l.soreness + l.sleep_quality) / 3);
  const toX = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + ((5 - v) / 4) * (H - PAD * 2);
  const last = pts[pts.length - 1];
  const col  = wellnessColor(last);
  const d    = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p).toFixed(1)}`).join(' ');
  const fill = `${d} L ${toX(pts.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${W}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={col} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${W})`}/>
      <path d={d} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={toX(pts.length - 1)} cy={toY(last)} r="3" fill={col}/>
    </svg>
  );
}

// ─── Profile Completion Ring ──────────────────────────────────────────
function CompletionRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const R = (size - 6) / 2;
  const C2PI = 2 * Math.PI * R;
  const offset = C2PI - (pct / 100) * C2PI;
  const color = pct >= 80 ? C.green : pct >= 60 ? C.amber : C.indigo;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={C.slate100} strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={C2PI} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="51%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size === 44 ? 10 : 8} fontWeight={800} fill={C.slate900}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 36, url, borderRadius = '50%' }: { name: string; role: string; size?: number; url?: string | null; borderRadius?: string | number }) {
  const [imgErr, setImgErr] = useState(false);
  const m = ROLE_META[role] ?? ROLE_META.Admin;
  if (url && !imgErr) {
    return (
      <div style={{ width: size, height: size, borderRadius, flexShrink: 0, overflow: 'hidden', border: `2px solid ${m.border}` }}>
        <img src={url} alt={name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius, flexShrink: 0, background: m.bg, border: `2px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, fontSize: Math.round(size * 0.3), fontWeight: 800 }}>
      {initials(name)}
    </div>
  );
}

function RoleBadge({ role, size = 'md' }: { role: string; size?: 'sm' | 'md' }) {
  const m = ROLE_META[role] ?? ROLE_META.Admin;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: size === 'sm' ? '2px 8px' : '3px 10px', borderRadius: 99, background: m.bg, border: `1px solid ${m.border}`, fontSize: size === 'sm' ? '0.68rem' : '0.72rem', fontWeight: 700, color: m.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {role}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: active ? C.greenBg : C.slate50, border: `1px solid ${active ? C.greenBdr : C.slate200}`, fontSize: '0.7rem', fontWeight: 700, color: active ? C.green : C.slate400, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? C.green : C.slate400, flexShrink: 0 }}/>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const AVAIL_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Available:  { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '✓' },
  Injured:    { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '🤕' },
  Suspended:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: '⛔' },
  Resting:    { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '😴' },
};

function AvailBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const cfg = AVAIL_META[status];
  if (!cfg) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: '0.7rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>
      <span>{cfg.icon}</span> {status}
    </span>
  );
}

function KPICard({ label, value, sub, color, icon, trend }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode; trend?: 'up' | 'down' | null;
}) {
  const col = color ?? C.indigo;
  return (
    <div style={{ flex: 1, minWidth: 0, background: '#FFF', border: `1.5px solid ${C.slate100}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)', transition: 'box-shadow 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        {icon && <span style={{ color: col, opacity: 0.9 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: col, lineHeight: 1, marginBottom: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.63rem', color: C.slate400, fontWeight: 500, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 24 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{children}</span>
      {count !== undefined && (
        <span style={{ fontSize: '0.63rem', fontWeight: 700, color: C.indigo, background: '#EEF2FF', borderRadius: 99, padding: '1px 8px', border: '1px solid #C7D2FE' }}>{count}</span>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: `1px solid ${C.slate100}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.indigo, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</div>
      </div>
    </div>
  );
}

// ─── MiniTeamCard — 2-col grid in Overview ────────────────────────────
function MiniTeamCard({ name, sport, isActive }: { name: string; sport?: string | null; isActive: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#FFF', border: `1.5px solid ${C.slate200}`, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: '0.63rem', color: C.slate400 }}>{sport ?? 'No sport'}</div>
      </div>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? C.green : C.slate300, flexShrink: 0 }}/>
    </div>
  );
}

// ─── TeamCard — full detail, Teams tab ───────────────────────────────
function TeamCard({ name, sport, division, isActive, playerCount }: {
  name: string; sport?: string | null; division?: string | null; isActive?: boolean; playerCount?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: '#FFF', border: `1.5px solid ${C.slate200}`, marginBottom: 8, boxShadow: '0 1px 4px rgba(15,23,42,0.05)', transition: 'box-shadow 0.15s' }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.78rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.slate900, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: '0.72rem', color: C.slate400 }}>{[sport, division].filter(Boolean).join(' · ') || 'No sport / division'}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <StatusDot active={isActive ?? true}/>
        {playerCount !== undefined && (
          <span style={{ fontSize: '0.65rem', color: C.indigo, fontWeight: 700 }}>{playerCount} players</span>
        )}
      </div>
    </div>
  );
}

function WellnessBar({ label, value }: { label: string; value: number }) {
  const pct   = ((value - 1) / 4) * 100;
  const color = value <= 2 ? C.red : value <= 3 ? C.amber : C.green;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', color: C.slate500, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}/5</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: C.slate100, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }}/>
      </div>
    </div>
  );
}

// ─── ActionBar ────────────────────────────────────────────────────────
function ActionBar({
  onMessage, onEdit, onCopyEmail, onResetLink, msgLoading, isSelf,
}: {
  onMessage: () => void; onEdit: () => void;
  onCopyEmail: () => void; onResetLink: () => void;
  msgLoading: boolean; isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 32, padding: '0 14px', borderRadius: 9,
    border: `1.5px solid ${C.slate200}`, background: '#FFF',
    color: C.slate700, fontSize: '0.75rem', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  };

  const menuItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 14px', border: 'none', background: 'none',
    color: C.slate700, fontSize: '0.8rem', fontWeight: 500,
    cursor: 'pointer', textAlign: 'left', borderRadius: 8,
  };

  return (
    <div style={{ display: 'flex', gap: 7, paddingTop: 14 }}>
      {!isSelf && (
        <button style={{ ...btn, opacity: msgLoading ? 0.6 : 1, cursor: msgLoading ? 'wait' : 'pointer' }} onClick={onMessage} disabled={msgLoading}>
          <Ico.MessageSquare /> {msgLoading ? 'Opening…' : 'Message'}
        </button>
      )}
      <button style={btn} onClick={onEdit}>
        <Ico.Pencil /> Edit
      </button>
      {/* ⋯ More dropdown */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button style={{ ...btn, padding: '0 10px', color: open ? C.indigo : C.slate400, borderColor: open ? '#C7D2FE' : C.slate200, background: open ? '#EEF2FF' : '#FFF' }}
          onClick={() => setOpen(p => !p)}>
          <Ico.Dots />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#FFF', border: `1px solid ${C.slate200}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 100, minWidth: 200, overflow: 'hidden', padding: '4px' }}>
            <button style={menuItem} onClick={() => { onCopyEmail(); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = C.slate50}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ color: C.indigo }}><Ico.Mail /></span>
              Copy email address
            </button>
            {!isSelf && (
              <button style={menuItem} onClick={() => { onResetLink(); setOpen(false); }}
                onMouseEnter={e => e.currentTarget.style.background = C.slate50}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ color: C.amber }}><Ico.Shield /></span>
                Copy password reset link
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────
function ActivityTimeline({ items }: { items: { emoji: string; label: string; sub?: string; date: string; color: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < items.length - 1 ? 0 : 0 }}>
          {/* Left: icon + connector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F8FAFC', border: `1.5px solid ${C.slate200}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', zIndex: 1, flexShrink: 0 }}>
              {item.emoji}
            </div>
            {i < items.length - 1 && (
              <div style={{ width: 1.5, flex: 1, minHeight: 24, background: `linear-gradient(to bottom, ${C.slate200}, transparent)`, margin: '4px 0' }}/>
            )}
          </div>
          {/* Right: text */}
          <div style={{ flex: 1, paddingTop: 5, paddingBottom: i < items.length - 1 ? 16 : 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.slate900, lineHeight: 1.3 }}>{item.label}</div>
            {item.sub && <div style={{ fontSize: '0.72rem', color: C.slate500, marginTop: 1 }}>{item.sub}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span style={{ color: C.slate400 }}><Ico.Clock /></span>
              <span style={{ fontSize: '0.67rem', color: C.slate400, fontWeight: 500 }}>{fmtRelative(item.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Registration Bio section ─────────────────────────────────────────
function RegistrationBio({ reg }: { reg: NonNullable<MemberDetail['registration']> }) {
  const dob = reg.date_of_birth ? new Date(reg.date_of_birth) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
  const statusColor = reg.status === 'approved' ? C.green : reg.status === 'submitted' ? C.blue : C.amber;
  const statusBg    = reg.status === 'approved' ? C.greenBg : reg.status === 'submitted' ? '#EFF6FF' : C.amberBg;
  const statusBdr   = reg.status === 'approved' ? C.greenBdr : reg.status === 'submitted' ? '#BFDBFE' : C.amberBdr;
  const rows: { label: string; value: string }[] = [];
  if (dob && age !== null) rows.push({ label: 'Date of Birth', value: `${dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · Age ${age}` });
  if (reg.sport)       rows.push({ label: 'Sport',       value: reg.sport });
  if (reg.position)    rows.push({ label: 'Position',    value: reg.position });
  if (reg.nationality) rows.push({ label: 'Nationality', value: reg.nationality });
  if (reg.phone)       rows.push({ label: 'Phone',       value: reg.phone });
  if (reg.blood_group) rows.push({ label: 'Blood Group', value: reg.blood_group });
  if (rows.length === 0) return null;
  return (
    <>
      <SectionLabel>Registration Bio</SectionLabel>
      <div style={{ background: '#FFF', border: `1px solid ${C.slate100}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: statusBg, borderBottom: `1px solid ${statusBdr}` }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor, textTransform: 'capitalize' }}>Registration {reg.status}</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < rows.length - 1 ? `1px solid ${C.slate100}` : 'none' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.label}</span>
            <span style={{ fontSize: '0.83rem', fontWeight: 600, color: C.slate900 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Tab content components ───────────────────────────────────────────
function OverviewTab({ detail, onEditReg }: { detail: MemberDetail; onEditReg: () => void }) {
  const teams    = detail.teams ?? [];
  const avg      = wellnessAvg(detail.health_logs ?? []);
  const sports   = Array.from(new Set(teams.map(t => t.sport).filter(Boolean)));
  const lastLog  = detail.health_logs?.[0];

  const activities: Parameters<typeof ActivityTimeline>[0]['items'] = [];
  if (lastLog) {
    activities.push({
      emoji: '💚', color: C.green,
      label: 'Wellness log submitted',
      sub: `Avg score ${((lastLog.fatigue + lastLog.soreness + lastLog.sleep_quality) / 3).toFixed(1)} / 5${lastLog.is_flagged ? ' · ⚠ Flagged' : ''}`,
      date: lastLog.logged_at,
    });
  }
  if (teams.length > 0) {
    activities.push({
      emoji: '🏆', color: C.indigo,
      label: `Enrolled in ${teams[0].name}`,
      sub: teams.length > 1 ? `+${teams.length - 1} more team${teams.length > 2 ? 's' : ''}` : undefined,
      date: detail.created_at ?? '',
    });
  }
  activities.push({
    emoji: '🎓', color: C.indigo,
    label: 'Joined the academy',
    sub: undefined,
    date: detail.created_at ?? '',
  });

  return (
    <div>
      {/* Contact card */}
      <SectionLabel>Contact & Account</SectionLabel>
      <div style={{ background: '#FFF', border: `1px solid ${C.slate100}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
        <InfoRow icon={<Ico.Mail />}     label="Email"   value={detail.email} mono />
        <InfoRow icon={<Ico.Calendar />} label="Joined"  value={fmtDate(detail.created_at)} />
        {detail.role === 'Player' && detail.parent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0, fontSize: '0.85rem' }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>Parent / Guardian</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.slate900 }}>{detail.parent.first_name} {detail.parent.last_name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Team membership — 2-col mini grid */}
      {teams.length > 0 && (
        <>
          <SectionLabel count={teams.length}>Team Membership</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {teams.map(t => (
              <MiniTeamCard key={t.id} name={t.name} sport={t.sport} isActive={t.is_active} />
            ))}
          </div>
        </>
      )}

      {/* Wellness snapshot (players only, when data exists) */}
      {detail.role === 'Player' && avg !== null && (detail.health_logs ?? []).length >= 2 && (
        <>
          <SectionLabel>Wellness Snapshot</SectionLabel>
          <div style={{ background: '#FFF', border: `1px solid ${C.slate100}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>7-day avg</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: wellnessColor(avg), lineHeight: 1 }}>{avg.toFixed(1)}</div>
              <div style={{ fontSize: '0.65rem', color: C.slate400, marginTop: 2 }}>out of 5.0</div>
            </div>
            <div style={{ flex: 2, minWidth: 0 }}>
              <Sparkline logs={detail.health_logs ?? []} width={160} height={40} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.6rem', color: C.slate400 }}>{fmtShortDate((detail.health_logs ?? [])[(detail.health_logs ?? []).length - 1]?.log_date)}</span>
                <span style={{ fontSize: '0.6rem', color: C.slate400 }}>{fmtShortDate((detail.health_logs ?? [])[0]?.log_date)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Registration bio (players only) */}
      {detail.role === 'Player' && detail.registration && (
        <RegistrationBio reg={detail.registration} />
      )}

      {/* Activity timeline */}
      {activities.length > 0 && (
        <>
          <SectionLabel>Recent Activity</SectionLabel>
          <div style={{ background: '#FFF', border: `1px solid ${C.slate100}`, borderRadius: 14, padding: '16px 16px 12px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
            <ActivityTimeline items={activities} />
          </div>
        </>
      )}
    </div>
  );
}

function TeamsTab({ detail }: { detail: MemberDetail }) {
  const teams       = detail.teams ?? [];
  const activeCount = teams.filter(t => t.is_active).length;
  if (teams.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🏟️</div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: C.slate700 }}>No teams assigned</div>
        <div style={{ fontSize: '0.78rem' }}>{detail.role === 'Player' ? 'This player is not on any team yet.' : 'No teams coached yet.'}</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 20 }}>
        <div style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: C.green, lineHeight: 1 }}>{activeCount}</div>
          <div style={{ fontSize: '0.62rem', color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Active</div>
        </div>
        <div style={{ flex: 1, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: C.indigo, lineHeight: 1 }}>{teams.length}</div>
          <div style={{ fontSize: '0.62rem', color: C.indigo, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Total</div>
        </div>
        {detail.role === 'Coach' && (
          <div style={{ flex: 1, background: C.slate50, border: `1px solid ${C.slate200}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: C.slate700, lineHeight: 1 }}>
              {teams.reduce((s, t) => s + (t.player_count ?? 0), 0)}
            </div>
            <div style={{ fontSize: '0.62rem', color: C.slate400, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Players</div>
          </div>
        )}
      </div>
      {teams.map(t => <TeamCard key={t.id} name={t.name} sport={t.sport} division={t.division} isActive={t.is_active} playerCount={t.player_count} />)}
    </div>
  );
}

function WellnessTab({ detail }: { detail: MemberDetail }) {
  const logs     = detail.health_logs ?? [];
  const avg      = wellnessAvg(logs);
  const flagged  = logs.filter(l => l.is_flagged);
  if (logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💤</div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: C.slate700 }}>No wellness data</div>
        <div style={{ fontSize: '0.78rem' }}>This player hasn't submitted any wellness logs yet.</div>
      </div>
    );
  }
  return (
    <div>
      {flagged.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: C.redBg, border: `1.5px solid ${C.redBdr}`, marginBottom: 18 }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: C.red }}>Wellness Alert</div>
            <div style={{ fontSize: '0.72rem', color: '#B91C1C', marginTop: 1 }}>{flagged.length} log{flagged.length > 1 ? 's' : ''} flagged — review recommended</div>
          </div>
        </div>
      )}
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <KPICard label="Avg Score" value={avg !== null ? avg.toFixed(1) : '—'} sub="out of 5.0" color={wellnessColor(avg)} icon={<Ico.Heart />} />
        <KPICard label="Entries"   value={logs.length}   sub="last 5 logs"   icon={<Ico.Activity />} />
        <KPICard label="Flagged"   value={flagged.length} sub="need review"  color={flagged.length > 0 ? C.red : C.slate400} />
      </div>
      {/* Trend chart */}
      {logs.length >= 2 && (
        <div style={{ background: '#FFF', border: `1px solid ${C.slate100}`, borderRadius: 14, padding: '14px 16px', marginBottom: 18, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.slate500 }}>Wellness Trend</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[{ l: 'Good', c: C.green }, { l: 'OK', c: C.amber }, { l: 'Low', c: C.red }].map(s => (
                <span key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.63rem', color: C.slate400 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.c }}/>
                  {s.l}
                </span>
              ))}
            </div>
          </div>
          <Sparkline logs={logs} width={580} height={48} />
        </div>
      )}
      {/* Log entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {logs.map(log => (
          <div key={log.id} style={{ background: log.is_flagged ? C.redBg : '#FFF', border: `1.5px solid ${log.is_flagged ? C.redBdr : C.slate200}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: C.slate900 }}>{fmtShortDate(log.log_date)}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {log.is_flagged && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.red, background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 99, padding: '2px 8px' }}>⚠ Flagged</span>}
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: wellnessColor((log.fatigue + log.soreness + log.sleep_quality) / 3) }}>
                  {((log.fatigue + log.soreness + log.sleep_quality) / 3).toFixed(1)}
                </span>
              </div>
            </div>
            <WellnessBar label="Fatigue"  value={log.fatigue} />
            <WellnessBar label="Soreness" value={log.soreness} />
            <WellnessBar label="Sleep"    value={log.sleep_quality} />
            {log.notes && (
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: C.slate500, fontStyle: 'italic', background: C.slate50, borderRadius: 8, padding: '8px 12px', borderLeft: `3px solid ${C.indigo}` }}>
                "{log.notes}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FamilyTab({ detail }: { detail: MemberDetail }) {
  if (detail.role === 'Player') {
    if (!detail.parent) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👨‍👩‍👦</div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: C.slate700 }}>No guardian linked</div>
          <div style={{ fontSize: '0.78rem' }}>No parent or guardian has been assigned to this player.</div>
        </div>
      );
    }
    const p = detail.parent;
    return (
      <div>
        <SectionLabel>Parent / Guardian</SectionLabel>
        <div style={{ background: '#FFF', border: `1.5px solid ${C.amberBdr}`, borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 12px rgba(217,119,6,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar name={`${p.first_name} ${p.last_name}`} role="Parent" size={56} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: C.slate900 }}>{p.first_name} {p.last_name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <RoleBadge role="Parent" /><StatusDot active={p.is_active !== false} />
              </div>
            </div>
          </div>
          <div style={{ background: C.slate50, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.slate100}` }}>
            <InfoRow icon={<Ico.Mail />} label="Email" value={p.email} mono />
          </div>
        </div>
      </div>
    );
  }
  const children = detail.children ?? [];
  if (children.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👦</div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: C.slate700 }}>No players linked</div>
        <div style={{ fontSize: '0.78rem' }}>No players have been assigned to this guardian.</div>
      </div>
    );
  }
  return (
    <div>
      <SectionLabel count={children.length}>Children</SectionLabel>
      {children.map((c, i) => (
        <div key={c.player.id || i} style={{ background: '#FFF', border: `1.5px solid ${C.greenBdr}`, borderRadius: 14, padding: '16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(16,185,129,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: c.teams.length > 0 ? 12 : 0 }}>
            <Avatar name={`${c.player.first_name} ${c.player.last_name}`} role="Player" size={46} url={c.player.avatar_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: C.slate900 }}>{c.player.first_name} {c.player.last_name}</div>
              <div style={{ fontSize: '0.72rem', color: C.slate400, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.player.email}</div>
            </div>
            <StatusDot active={c.player.is_active !== false} />
          </div>
          {c.teams.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {c.teams.map(t => (
                <span key={t.id} style={{ fontSize: '0.65rem', fontWeight: 700, color: C.indigo, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 99, padding: '2px 9px' }}>
                  {t.name}{t.sport ? ` · ${t.sport}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Member Detail Panel ──────────────────────────────────────────────
type TabId = 'overview' | 'teams' | 'wellness' | 'family';

function MemberDetailPanel({ memberId, onClose, onToggleStatus, onMemberUpdated, currentUserId }: {
  memberId: string;
  onClose: () => void;
  onToggleStatus: (m: UserProfile) => void;
  onMemberUpdated: (m: UserProfile) => void;
  currentUserId?: string;
}) {
  const router = useRouter();

  const [detail,     setDetail]     = useState<MemberDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState<TabId>('overview');
  const [confirming, setConfirming] = useState(false);
  const [actLoad,    setActLoad]    = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast,  setEditLast]  = useState('');
  const [saveLoad,  setSaveLoad]  = useState(false);
  const [saveErr,   setSaveErr]   = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Message loading
  const [msgLoad, setMsgLoad] = useState(false);

  // Avatar fallback (if img fails to load)
  const [avatarErr, setAvatarErr] = useState(false);

  // Availability
  const [availLoad, setAvailLoad] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoad,    setDeleteLoad]    = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true); setError(''); setIsEditing(false); setAvatarErr(false);
    try { setDetail(await adminApi.getMemberDetail(memberId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load member.'); }
    finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => { load(); setTab('overview'); setConfirming(false); }, [load]);

  // ── Action handlers ──────────────────────────────────────────────────

  async function handleMessage() {
    if (!detail) return;
    setMsgLoad(true);
    try {
      const channel = await chatApi.getOrCreateDirect(detail.id);
      router.push(`/dashboard/admin/chat?open=${channel.id}`);
    } catch {
      router.push('/dashboard/admin/chat');
    } finally { setMsgLoad(false); }
  }

  function startEdit() {
    if (!detail) return;
    setEditFirst(detail.first_name);
    setEditLast(detail.last_name);
    setSaveErr('');
    setIsEditing(true);
  }

  async function handleSave() {
    if (!detail) return;
    setSaveLoad(true); setSaveErr('');
    try {
      const updated = await adminApi.updateMember(detail.id, { first_name: editFirst.trim(), last_name: editLast.trim() });
      setDetail(d => d ? { ...d, first_name: updated.first_name, last_name: updated.last_name } : d);
      onMemberUpdated(updated);
      setIsEditing(false);
      showToast('Profile updated successfully.');
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaveLoad(false); }
  }

  async function handleCopyEmail() {
    if (!detail) return;
    try { await navigator.clipboard.writeText(detail.email); showToast('Email copied to clipboard.'); }
    catch { showToast('Copy failed — please copy manually: ' + detail.email); }
  }

  async function handleResetLink() {
    if (!detail) return;
    try {
      const { reset_link, email } = await adminApi.getMemberResetLink(detail.id);
      await navigator.clipboard.writeText(reset_link);
      showToast(`Reset link copied — share with ${email}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to generate reset link.');
    }
  }

  async function handleToggle() {
    if (!detail) return;
    setActLoad(true); setConfirming(false);
    try {
      const updated = await adminApi.setMemberStatus(detail.id, !detail.is_active);
      setDetail(d => d ? { ...d, is_active: updated.is_active } : d);
      onToggleStatus(updated);
    } catch { /* silent */ }
    finally { setActLoad(false); }
  }

  async function handleDelete() {
    if (!detail) return;
    setDeleteLoad(true);
    try {
      await adminApi.deleteMember(detail.id);
      onMemberUpdated({ ...detail, id: detail.id } as typeof detail);
      onClose();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to delete member.');
    } finally { setDeleteLoad(false); setConfirmDelete(false); }
  }

  async function handleAvailability(status: 'Available' | 'Injured' | 'Suspended' | 'Resting') {
    if (!detail) return;
    setAvailLoad(true);
    try {
      const updated = await adminApi.updateAvailability(detail.id, status);
      setDetail(d => d ? { ...d, availability_status: updated.availability_status } : d);
      onMemberUpdated(updated);
      showToast(`Availability set to ${status}.`);
    } catch { showToast('Failed to update availability.'); }
    finally { setAvailLoad(false); }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...((detail?.role === 'Player' || detail?.role === 'Coach') ? [{ id: 'teams' as TabId, label: 'Teams' }] : []),
    ...(detail?.role === 'Player' ? [{ id: 'wellness' as TabId, label: 'Wellness' }] : []),
    ...(detail?.role === 'Player' || detail?.role === 'Parent' ? [{ id: 'family' as TabId, label: 'Family' }] : []),
  ];

  const isSelf    = detail?.id === currentUserId;
  const isActive  = detail?.is_active !== false;
  const meta      = ROLE_META[detail?.role ?? 'Admin'] ?? ROLE_META.Admin;
  const fullName  = detail ? `${detail.first_name} ${detail.last_name}` : '';
  const pct       = detail ? profileCompletion(detail) : 0;
  const teamCount = (detail?.teams ?? []).length;
  const avg       = wellnessAvg(detail?.health_logs ?? []);
  const flagged   = (detail?.health_logs ?? []).filter(l => l.is_flagged).length;
  const lastLog   = detail?.health_logs?.[0];
  const sports    = detail ? Array.from(new Set((detail.teams ?? []).map(t => t.sport).filter(Boolean))) : [];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: C.slate50, width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', height: '100vh', boxShadow: '-16px 0 64px rgba(15,23,42,0.18)', animation: 'panelIn 0.28s cubic-bezier(0.22,1,0.36,1)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header bar ── */}
        <div style={{ background: '#FFF', borderBottom: `1px solid ${C.slate100}`, padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Member Profile</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.slate200}`, background: C.slate50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.slate500 }}>
            <Ico.X />
          </button>
        </div>

        {/* ── Hero band (role-tinted) ── */}
        <div style={{ height: 5, background: loading ? C.slate100 : meta.gradient, flexShrink: 0 }}/>

        {/* ── Hero body ── */}
        <div style={{ background: `linear-gradient(180deg, ${loading ? '#FFF' : meta.tint} 0%, #FFF 100%)`, padding: '24px 24px 20px', borderBottom: `1px solid ${C.slate100}`, flexShrink: 0 }}>

          {/* Toast notification */}
          {toast && (
            <div style={{ marginBottom: 14, padding: '9px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.78rem', fontWeight: 600, color: '#15803D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✓</span> {toast}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 22, flexShrink: 0 }}/>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 22, borderRadius: 6, width: '50%' }}/>
                <div className="skeleton" style={{ height: 16, borderRadius: 6, width: '35%' }}/>
                <div className="skeleton" style={{ height: 30, borderRadius: 8, width: '55%', marginTop: 4 }}/>
              </div>
            </div>
          ) : detail ? (
            isEditing ? (
              /* ── Edit mode ── */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  {detail.avatar_url && !avatarErr ? (
                    <div style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', flexShrink: 0, border: `2px solid ${meta.border}` }}>
                      <img src={detail.avatar_url} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', fontWeight: 800, flexShrink: 0 }}>
                      {initials(`${editFirst} ${editLast}`) || initials(fullName)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.slate400, marginBottom: 2 }}>Editing profile</div>
                    <div style={{ fontSize: '0.82rem', color: C.slate500 }}>Changes saved to academy roster</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: saveErr ? 10 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>First name</label>
                    <input
                      value={editFirst} onChange={e => setEditFirst(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.slate200}`, borderRadius: 10, fontSize: '0.88rem', fontWeight: 600, color: C.slate900, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = C.indigo}
                      onBlur={e => e.target.style.borderColor = C.slate200}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Last name</label>
                    <input
                      value={editLast} onChange={e => setEditLast(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.slate200}`, borderRadius: 10, fontSize: '0.88rem', fontWeight: 600, color: C.slate900, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = C.indigo}
                      onBlur={e => e.target.style.borderColor = C.slate200}
                    />
                  </div>
                </div>
                {saveErr && <div style={{ fontSize: '0.75rem', color: C.red, marginBottom: 10 }}>⚠ {saveErr}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '9px', border: `1.5px solid ${C.slate200}`, borderRadius: 9, background: 'none', color: C.slate500, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saveLoad || !editFirst.trim() || !editLast.trim()}
                    style={{ flex: 2, padding: '9px', border: 'none', borderRadius: 9, background: C.indigo, color: '#FFF', fontWeight: 700, fontSize: '0.8rem', cursor: (saveLoad || !editFirst.trim() || !editLast.trim()) ? 'not-allowed' : 'pointer', opacity: (saveLoad || !editFirst.trim() || !editLast.trim()) ? 0.65 : 1 }}>
                    {saveLoad ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Normal view ── */
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                {/* Avatar with glow ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {detail.avatar_url && !avatarErr ? (
                    <div style={{ width: 80, height: 80, borderRadius: 22, overflow: 'hidden', flexShrink: 0, boxShadow: `0 8px 28px ${meta.color}55, 0 0 0 3px #FFF, 0 0 0 5px ${meta.border}` }}>
                      <img src={detail.avatar_url} alt={fullName} onError={() => setAvatarErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: 22,
                      background: meta.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '1.6rem', fontWeight: 800,
                      boxShadow: `0 8px 28px ${meta.color}55, 0 0 0 3px #FFF, 0 0 0 5px ${meta.border}`,
                    }}>
                      {initials(fullName)}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: isActive ? C.green : C.slate300, border: '2.5px solid #FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}/>
                </div>

                {/* Name + meta + action bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: C.slate900, lineHeight: 1.2, marginBottom: 7, letterSpacing: '-0.02em' }}>
                    {fullName}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <RoleBadge role={detail.role} />
                    <StatusDot active={isActive} />
                    {detail.role === 'Player' && <AvailBadge status={detail.availability_status} />}
                    {teamCount > 0 && (
                      <span style={{ fontSize: '0.72rem', color: C.slate400, fontWeight: 500 }}>
                        · {teamCount} team{teamCount !== 1 ? 's' : ''}{sports.length > 0 ? ` in ${sports[0]}` : ''}
                      </span>
                    )}
                  </div>
                  {detail.role === 'Player' && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Availability:</span>
                      {(['Available', 'Injured', 'Suspended', 'Resting'] as const).map(s => {
                        const cfg = AVAIL_META[s];
                        const active = detail.availability_status === s;
                        return (
                          <button key={s} onClick={() => handleAvailability(s)} disabled={availLoad}
                            style={{ padding: '3px 10px', borderRadius: 99, border: `1.5px solid ${active ? cfg.border : C.slate200}`, background: active ? cfg.bg : 'transparent', color: active ? cfg.color : C.slate400, fontSize: '0.68rem', fontWeight: active ? 800 : 500, cursor: availLoad ? 'not-allowed' : 'pointer', transition: 'all 0.12s' }}>
                            {cfg.icon} {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <ActionBar
                    onMessage={handleMessage}
                    onEdit={startEdit}
                    onCopyEmail={handleCopyEmail}
                    onResetLink={handleResetLink}
                    msgLoading={msgLoad}
                    isSelf={isSelf}
                  />
                </div>

                {/* Completion ring */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, paddingTop: 2 }}>
                  <CompletionRing pct={pct} size={48} />
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: C.slate400, textAlign: 'center', lineHeight: 1.2 }}>Profile<br/>Complete</div>
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* ── KPI row (4 cards) ── */}
        {!loading && detail && (
          <div style={{ background: '#FFF', borderBottom: `1px solid ${C.slate100}`, padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(80px, 100%), 1fr))', gap: 8 }}>
              {detail.role === 'Player' && (
                <>
                  <KPICard label="Teams"    value={teamCount}                                                sub="enrolled"   color={C.indigo}             icon={<Ico.Users />} />
                  <KPICard label="Wellness" value={avg !== null ? avg.toFixed(1) : '—'}                    sub="avg score"  color={wellnessColor(avg)}    icon={<Ico.Heart />} />
                  <KPICard label="Last Log" value={lastLog ? fmtShortDate(lastLog.log_date) : '—'}         sub={lastLog ? fmtRelative(lastLog.logged_at) : 'no data'} icon={<Ico.Calendar />} />
                  <KPICard label="Flagged"  value={flagged > 0 ? flagged : '✓'}                            sub={flagged > 0 ? 'review needed' : 'all clear'} color={flagged > 0 ? C.red : C.green} />
                </>
              )}
              {detail.role === 'Coach' && (
                <>
                  <KPICard label="Teams"   value={teamCount}                                                                                  sub="coached"    color={C.indigo}  icon={<Ico.Users />} />
                  <KPICard label="Players" value={(detail.teams ?? []).reduce((s, t) => s + (t.player_count ?? 0), 0)}                        sub="total"                        icon={<Ico.Activity />} />
                  <KPICard label="Active"  value={(detail.teams ?? []).filter(t => t.is_active).length}                                       sub="teams"      color={C.green}   icon={<Ico.UserCheck />} />
                  <KPICard label="Profile" value={`${pct}%`}                                                                                  sub="complete"   color={pct >= 80 ? C.green : C.amber} />
                </>
              )}
              {detail.role === 'Parent' && (
                <>
                  <KPICard label="Children" value={(detail.children ?? []).length}                          sub="players"    color={C.amber}   icon={<Ico.Users />} />
                  <KPICard label="Teams"    value={Array.from(new Set((detail.children ?? []).flatMap(c => c.teams.map(t => t.id)))).length}  sub="involved"   color={C.indigo}  icon={<Ico.Activity />} />
                  <KPICard label="Joined"   value={fmtShortDate(detail.created_at ?? '')}                  sub="joined"                       icon={<Ico.Calendar />} />
                  <KPICard label="Profile"  value={`${pct}%`}                                              sub="complete"   color={pct >= 80 ? C.green : C.amber} />
                </>
              )}
              {detail.role === 'Admin' && (
                <>
                  <div style={{ flex: 1, background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: 14, padding: '12px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}><Ico.Shield /></div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4C1D95' }}>Full Academy Access</div>
                      <div style={{ fontSize: '0.67rem', color: '#7C3AED', marginTop: 2 }}>All management privileges enabled</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        {!loading && detail && tabs.length > 1 && (
          <div style={{ display: 'flex', background: '#FFF', borderBottom: `1px solid ${C.slate200}`, flexShrink: 0, overflowX: 'auto', paddingLeft: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 'none', padding: '13px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.indigo : C.slate500, borderBottom: `2.5px solid ${tab === t.id ? C.indigo : 'transparent'}`, transition: 'all 0.15s', whiteSpace: 'nowrap', marginBottom: -1, letterSpacing: tab === t.id ? '-0.01em' : undefined }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 24px' }}>

          {error && (
            <div className="alert alert-error" style={{ marginTop: 16 }}>
              {error}
              <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 20 }}>
              {[100, 64, 140, 90].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }}/>)}
            </div>
          )}

          {!loading && detail && (
            <>
              {tab === 'overview'  && <OverviewTab  detail={detail} onEditReg={() => {}} />}
              {tab === 'teams'     && <TeamsTab     detail={detail} />}
              {tab === 'wellness'  && <WellnessTab  detail={detail} />}
              {tab === 'family'    && <FamilyTab    detail={detail} />}
            </>
          )}
        </div>

        {/* ── Footer action ── */}
        {!loading && detail && !isSelf && (
          <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: `1px solid ${C.slate100}`, background: '#FFF' }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: `1.5px solid ${C.slate200}`, background: 'none', color: C.slate500, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleteLoad} style={{ flex: 2, padding: '11px', borderRadius: 11, border: 'none', background: '#7C2D12', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: deleteLoad ? 'not-allowed' : 'pointer', opacity: deleteLoad ? 0.7 : 1 }}>
                  {deleteLoad ? '…' : 'Yes, permanently delete'}
                </button>
              </div>
            ) : confirming ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: `1.5px solid ${C.slate200}`, background: 'none', color: C.slate500, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleToggle} disabled={actLoad} style={{ flex: 2, padding: '11px', borderRadius: 11, border: 'none', background: isActive ? C.red : C.green, color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: actLoad ? 'not-allowed' : 'pointer', opacity: actLoad ? 0.7 : 1 }}>
                  {actLoad ? '…' : `Confirm ${isActive ? 'Deactivate' : 'Reactivate'}`}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirming(true)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: `1.5px solid ${isActive ? C.redBdr : C.greenBdr}`, background: isActive ? C.redBg : C.greenBg, color: isActive ? C.red : C.green, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {isActive ? 'Deactivate' : 'Reactivate'}
                </button>
                <button onClick={() => setConfirmDelete(true)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  Delete Member
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes panelIn {
          from { transform: translateX(48px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── ROSTER PAGE ──────────────────────────────────────────────────────
export default function RosterPage() {
  const [members,       setMembers]       = useState<UserProfile[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRole]          = useState('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);

  const currentUserId = useAuthStore.getState().user?.id;

  async function load() {
    setLoading(true); setError('');
    try { setMembers(await adminApi.getMembers()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load roster'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleStatus(member: UserProfile) {
    setActionLoading(member.id); setConfirmId(null);
    try {
      const updated = await adminApi.setMemberStatus(member.id, !member.is_active);
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally { setActionLoading(null); }
  }

  const filtered = members.filter(m => {
    const matchRole   = roleFilter === 'All' || m.role === roleFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTERS.reduce<Record<string, number>>((a, r) => {
    a[r] = r === 'All' ? members.length : members.filter(m => m.role === r).length;
    return a;
  }, {});

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }} onClick={() => setConfirmId(null)}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>Roster</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0' }}>
          {members.length} member{members.length !== 1 ? 's' : ''} · click any row to view full profile
        </p>
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, paddingBottom: 2 }}>
            {ROLE_FILTERS.map(r => (
              <button key={r} onClick={() => setRole(r)} className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0 }}>
                {r}
                {counts[r] > 0 && (
                  <span style={{ marginLeft: 4, fontSize: '0.68rem', background: roleFilter === r ? 'rgba(255,255,255,0.25)' : C.slate50, borderRadius: 99, padding: '1px 6px', border: roleFilter === r ? 'none' : `1px solid ${C.slate200}` }}>
                    {counts[r]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="search-input" style={{ width: 220 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}><Ico.Search /></span>
            <input placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: 16 }}>
            {error}
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
          </div>
        )}

        {loading && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }}/>)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {search ? 'No members match your search' : 'No members yet'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 300, margin: 0 }}>
              {search ? 'Try a different search or filter.' : 'Invite members from the Invitations page.'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-scroll-wrap">
            <table className="table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const isSelf       = m.id === currentUserId;
                  const isLoading    = actionLoading === m.id;
                  const isConfirming = confirmId === m.id;
                  const isActive     = m.is_active !== false;
                  const isSelected   = selectedId === m.id;
                  const meta         = ROLE_META[m.role] ?? ROLE_META.Admin;
                  return (
                    <tr key={m.id} onClick={() => setSelectedId(m.id)}
                      style={{ cursor: 'pointer', background: isSelected ? meta.bg : undefined, borderLeft: isSelected ? `3px solid ${meta.color}` : '3px solid transparent', transition: 'all 0.12s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = C.slate50; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''; }}>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {m.avatar_url ? (
                            <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', border: `2px solid ${meta.border}`, flexShrink: 0, transition: 'all 0.15s' }}>
                              <img src={m.avatar_url} alt={`${m.first_name} ${m.last_name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: isSelected ? meta.gradient : meta.bg, border: `2px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'white' : meta.color, fontSize: '0.8rem', fontWeight: 800, flexShrink: 0, transition: 'all 0.15s' }}>
                              {initials(`${m.first_name} ${m.last_name}`)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? meta.color : 'var(--text-primary)' }}>{m.first_name} {m.last_name}</div>
                            <div style={{ fontSize: '0.67rem', color: C.slate400, marginTop: 1 }}>{isSelected ? 'Profile open →' : 'Click to view profile'}</div>
                          </div>
                        </div>
                      </td>

                      <td><RoleBadge role={m.role} size="sm" /></td>

                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.email}</td>

                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          <StatusDot active={isActive} />
                          {m.role === 'Player' && <AvailBadge status={m.availability_status} />}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fmtDate(m.created_at)}</td>

                      <td style={{ textAlign: 'right' }}>
                        {isSelf ? (
                          <span style={{ fontSize: '0.72rem', color: C.slate400, fontStyle: 'italic' }}>You</span>
                        ) : isActive ? (
                          isConfirming ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: '0.72rem', color: C.slate400 }}>Sure?</span>
                              <button disabled={isLoading} onClick={e => { e.stopPropagation(); toggleStatus(m); }}
                                style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                {isLoading ? '…' : 'Yes'}
                              </button>
                              <button onClick={e => { e.stopPropagation(); setConfirmId(null); }}
                                style={{ background: 'none', border: `1px solid ${C.slate200}`, borderRadius: 6, padding: '4px 8px', fontSize: '0.72rem', color: C.slate500, cursor: 'pointer' }}>
                                No
                              </button>
                            </span>
                          ) : (
                            <button disabled={isLoading} onClick={e => { e.stopPropagation(); setConfirmId(m.id); }}
                              style={{ background: 'none', border: `1px solid ${C.redBdr}`, color: C.red, borderRadius: 7, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                              Deactivate
                            </button>
                          )
                        ) : (
                          <button disabled={isLoading} onClick={e => { e.stopPropagation(); toggleStatus(m); }}
                            style={{ background: 'none', border: `1px solid ${C.greenBdr}`, color: C.green, borderRadius: 7, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                            {isLoading ? '…' : 'Reactivate'}
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelectedId(m.id); }}
                          style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? meta.color : C.slate200, padding: '4px', borderRadius: 6, verticalAlign: 'middle', transition: 'color 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.color = meta.color}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color = C.slate200; }}>
                          <Ico.Chevron />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <MemberDetailPanel
          memberId={selectedId}
          onClose={() => setSelectedId(null)}
          onToggleStatus={u => setMembers(prev => prev.map(m => m.id === u.id ? u : m))}
          onMemberUpdated={u => {
            // If the update was a deletion the panel closes itself; remove from list
            setMembers(prev => prev.filter(m => m.id !== u.id));
          }}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
