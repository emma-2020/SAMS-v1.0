'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { UserProfile, MemberDetail, HealthLogEntry } from '@sams/api';

// ─── Design tokens ───────────────────────────────────────────────────
const C = {
  indigo:     '#6366F1',
  indigoDark: '#4338CA',
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
  blueBg:     '#EFF6FF',
  blueBdr:    '#BFDBFE',
  slate50:    '#F8FAFC',
  slate100:   '#F1F5F9',
  slate200:   '#E2E8F0',
  slate400:   '#94A3B8',
  slate500:   '#64748B',
  slate700:   '#334155',
  slate900:   '#0F172A',
};

const ROLE_META: Record<string, { color: string; bg: string; border: string; gradient: string }> = {
  Admin:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', gradient: 'linear-gradient(135deg,#7C3AED,#6D28D9)' },
  Coach:  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)' },
  Player: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', gradient: 'linear-gradient(135deg,#059669,#047857)' },
  Parent: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', gradient: 'linear-gradient(135deg,#D97706,#B45309)' },
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
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function wellnessAvg(logs: HealthLogEntry[]) {
  if (!logs.length) return null;
  const sum = logs.reduce((a, l) => a + (l.fatigue + l.soreness + l.sleep_quality) / 3, 0);
  return Math.round((sum / logs.length) * 10) / 10;
}
function wellnessColor(avg: number | null) {
  if (avg === null) return C.slate400;
  if (avg >= 3.5)   return C.green;
  if (avg >= 2.5)   return C.amber;
  return C.red;
}

// ─── Icons ───────────────────────────────────────────────────────────
const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IcoMail = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoHeart = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IcoActivity = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Sparkline SVG ────────────────────────────────────────────────────
function Sparkline({ logs }: { logs: HealthLogEntry[] }) {
  if (logs.length < 2) return null;
  const W = 80, H = 28, PAD = 3;
  const pts = [...logs].reverse().map(l => (l.fatigue + l.soreness + l.sleep_quality) / 3);
  const min = 1, max = 5;
  const toX = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + ((max - v) / (max - min)) * (H - PAD * 2);
  const last = pts[pts.length - 1];
  const col  = wellnessColor(last);
  const d    = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p).toFixed(1)}`).join(' ');
  const fill = `${d} L ${toX(pts.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={col} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)"/>
      <path d={d} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={toX(pts.length - 1)} cy={toY(last)} r="2.5" fill={col}/>
    </svg>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 36 }: { name: string; role: string; size?: number }) {
  const m = ROLE_META[role] ?? ROLE_META.Admin;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: m.bg, border: `2px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, fontSize: Math.round(size * 0.3), fontWeight: 800 }}>
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

function KPICard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.slate50, border: `1px solid ${C.slate100}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.63rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        {icon && <span style={{ color: color ?? C.indigo, opacity: 0.8 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: color ?? C.slate900, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.65rem', color: C.slate400, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.63rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10, marginTop: 22 }}>{children}</div>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.slate100}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.indigo, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.63rem', fontWeight: 600, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

function TeamCard({ name, sport, division, isActive, playerCount }: {
  name: string; sport?: string | null; division?: string | null; isActive?: boolean; playerCount?: number;
}) {
  const meta = ROLE_META.Coach;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#FFF', border: `1px solid ${C.slate200}`, marginBottom: 8, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: C.slate900, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: '0.72rem', color: C.slate400 }}>{[sport, division].filter(Boolean).join(' · ') || 'No sport / division'}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
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
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }}/>
      </div>
    </div>
  );
}

// ─── Tab content components ───────────────────────────────────────────
function OverviewTab({ detail }: { detail: MemberDetail }) {
  const isPlayer = detail.role === 'Player';
  const isCoach  = detail.role === 'Coach';
  const isParent = detail.role === 'Parent';

  const teamCount = (detail.teams ?? []).length;
  const childCount = (detail.children ?? []).length;
  const sports = Array.from(new Set((detail.teams ?? []).map(t => t.sport).filter(Boolean)));

  const activities: { label: string; date: string; icon: string }[] = [];
  if (detail.health_logs?.[0]) {
    activities.push({ label: 'Wellness log submitted', date: detail.health_logs[0].logged_at, icon: '💚' });
  }
  if ((detail.teams ?? []).length > 0) {
    activities.push({ label: `Enrolled in ${(detail.teams ?? [])[0].name}`, date: detail.created_at ?? '', icon: '🏆' });
  }
  activities.push({ label: 'Joined the academy', date: detail.created_at ?? '', icon: '🎓' });

  return (
    <div>
      {/* Summary card */}
      <SectionLabel>Profile Summary</SectionLabel>
      <div style={{ background: '#FFF', border: `1px solid ${C.slate200}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        {isPlayer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${C.slate100}` }}>
            <span style={{ fontSize: '0.75rem', color: C.slate500 }}><IcoUsers /></span>
            <span style={{ fontSize: '0.82rem', color: C.slate700, fontWeight: 500 }}>
              Playing across <strong>{teamCount}</strong> team{teamCount !== 1 ? 's' : ''}{sports.length > 0 ? ` in ${sports.join(', ')}` : ''}
            </span>
          </div>
        )}
        {isCoach && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${C.slate100}` }}>
            <span style={{ fontSize: '0.75rem', color: C.slate500 }}><IcoUsers /></span>
            <span style={{ fontSize: '0.82rem', color: C.slate700, fontWeight: 500 }}>
              Coaching <strong>{teamCount}</strong> team{teamCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {isParent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${C.slate100}` }}>
            <span style={{ fontSize: '0.75rem', color: C.slate500 }}><IcoUsers /></span>
            <span style={{ fontSize: '0.82rem', color: C.slate700, fontWeight: 500 }}>
              Guardian of <strong>{childCount}</strong> player{childCount !== 1 ? 's' : ''} in the academy
            </span>
          </div>
        )}
        <InfoRow icon={<IcoMail />}     label="Email"   value={detail.email} />
        <InfoRow icon={<IcoCalendar />} label="Joined"  value={fmtDate(detail.created_at)} />
        {isPlayer && detail.parent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 0', borderTop: `1px solid ${C.slate100}`, paddingLeft: 14, paddingRight: 14, paddingBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 600, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 1 }}>Parent / Guardian</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.slate900 }}>{detail.parent.first_name} {detail.parent.last_name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Team membership */}
      {(detail.teams ?? []).length > 0 && (
        <>
          <SectionLabel>Team Membership</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(detail.teams ?? []).map(t => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: '0.72rem', fontWeight: 700, color: C.indigo }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.is_active ? C.green : C.slate400 }}/>
                {t.name}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Recent Activity */}
      <SectionLabel>Recent Activity</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 8 }}>
        {activities.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 16, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', border: '2px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', zIndex: 1 }}>
                {a.icon}
              </div>
              {i < activities.length - 1 && (
                <div style={{ width: 1, flex: 1, background: C.slate200, marginTop: 4, marginBottom: -4, minHeight: 20 }}/>
              )}
            </div>
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.slate900 }}>{a.label}</div>
              <div style={{ fontSize: '0.7rem', color: C.slate400, marginTop: 2 }}>{a.date ? fmtDate(a.date) : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamsTab({ detail }: { detail: MemberDetail }) {
  const teams = detail.teams ?? [];
  if (teams.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏟️</div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>No teams assigned</div>
        <div style={{ fontSize: '0.78rem' }}>
          {detail.role === 'Player' ? 'This player is not on any team yet.' : 'No teams coached yet.'}
        </div>
      </div>
    );
  }
  const activeCount   = teams.filter(t => t.is_active).length;
  const inactiveCount = teams.length - activeCount;
  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 18 }}>
        <div style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.green }}>{activeCount}</div>
          <div style={{ fontSize: '0.65rem', color: C.green, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active</div>
        </div>
        {inactiveCount > 0 && (
          <div style={{ flex: 1, background: C.slate50, border: `1px solid ${C.slate200}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.slate400 }}>{inactiveCount}</div>
            <div style={{ fontSize: '0.65rem', color: C.slate400, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inactive</div>
          </div>
        )}
        <div style={{ flex: 1, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.indigo }}>{teams.length}</div>
          <div style={{ fontSize: '0.65rem', color: C.indigo, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
        </div>
      </div>
      {/* Team cards */}
      {teams.map(t => (
        <TeamCard key={t.id} name={t.name} sport={t.sport} division={t.division} isActive={t.is_active} playerCount={t.player_count} />
      ))}
    </div>
  );
}

function WellnessTab({ detail }: { detail: MemberDetail }) {
  const logs = detail.health_logs ?? [];
  const avg  = wellnessAvg(logs);
  const flagCount = logs.filter(l => l.is_flagged).length;

  if (logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>💤</div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>No wellness data</div>
        <div style={{ fontSize: '0.78rem' }}>This player hasn't submitted any wellness logs yet.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Flagged banner */}
      {flagCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: C.redBg, border: `1px solid ${C.redBdr}`, marginBottom: 16 }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.red }}>Wellness Alert</div>
            <div style={{ fontSize: '0.72rem', color: '#B91C1C' }}>{flagCount} recent log{flagCount > 1 ? 's' : ''} flagged for review</div>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <KPICard
          label="Avg Score"
          value={avg !== null ? avg.toFixed(1) : '—'}
          sub="out of 5.0"
          color={wellnessColor(avg)}
          icon={<IcoHeart />}
        />
        <KPICard
          label="Log Entries"
          value={logs.length}
          sub="last 5 shown"
          icon={<IcoActivity />}
        />
        {flagCount > 0 && (
          <KPICard label="Flagged" value={flagCount} sub="need review" color={C.red} />
        )}
      </div>

      {/* Trend sparkline */}
      {logs.length >= 2 && (
        <div style={{ background: '#FFF', border: `1px solid ${C.slate200}`, borderRadius: 12, padding: '14px 16px', marginBottom: 18, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.slate500 }}>Wellness Trend</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {[{ label: 'Good', color: C.green }, { label: 'OK', color: C.amber }, { label: 'Low', color: C.red }].map(s => (
                <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.63rem', color: C.slate400 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }}/>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <Sparkline logs={logs} />
        </div>
      )}

      {/* Log entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {logs.map(log => (
          <div key={log.id} style={{ background: log.is_flagged ? C.redBg : '#FFF', border: `1.5px solid ${log.is_flagged ? C.redBdr : C.slate200}`, borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.slate900 }}>{fmtShortDate(log.log_date)}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {log.is_flagged && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.red, background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 99, padding: '2px 7px' }}>⚠ Flagged</span>
                )}
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: wellnessColor((log.fatigue + log.soreness + log.sleep_quality) / 3), background: '#F8FAFC', borderRadius: 6, padding: '2px 6px' }}>
                  avg {((log.fatigue + log.soreness + log.sleep_quality) / 3).toFixed(1)}
                </span>
              </div>
            </div>
            <WellnessBar label="Fatigue"   value={log.fatigue} />
            <WellnessBar label="Soreness"  value={log.soreness} />
            <WellnessBar label="Sleep"     value={log.sleep_quality} />
            {log.notes && (
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: C.slate500, fontStyle: 'italic', background: C.slate50, borderRadius: 8, padding: '7px 10px', borderLeft: `3px solid ${C.indigo}` }}>
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
  // Player view: show their parent
  if (detail.role === 'Player') {
    if (!detail.parent) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>👨‍👩‍👦</div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>No guardian linked</div>
          <div style={{ fontSize: '0.78rem' }}>No parent or guardian has been assigned to this player.</div>
        </div>
      );
    }
    const p = detail.parent;
    return (
      <div>
        <SectionLabel>Parent / Guardian</SectionLabel>
        <div style={{ background: '#FFF', border: `1.5px solid ${C.amberBdr}`, borderRadius: 14, padding: '18px 16px', boxShadow: '0 2px 8px rgba(217,119,6,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar name={`${p.first_name} ${p.last_name}`} role="Parent" size={52} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: C.slate900 }}>{p.first_name} {p.last_name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                <RoleBadge role="Parent" />
                <StatusDot active={p.is_active !== false} />
              </div>
            </div>
          </div>
          <div style={{ background: C.slate50, borderRadius: 10, overflow: 'hidden' }}>
            <InfoRow icon={<IcoMail />} label="Email" value={p.email} />
          </div>
        </div>
      </div>
    );
  }

  // Parent view: show children
  const children = detail.children ?? [];
  if (children.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.slate400 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>👦</div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>No players linked</div>
        <div style={{ fontSize: '0.78rem' }}>No players have been assigned to this guardian.</div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>Children ({children.length})</SectionLabel>
      {children.map((c, i) => (
        <div key={c.player.id || i} style={{ background: '#FFF', border: `1.5px solid ${C.greenBdr}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(16,185,129,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: c.teams.length > 0 ? 12 : 0 }}>
            <Avatar name={`${c.player.first_name} ${c.player.last_name}`} role="Player" size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.slate900 }}>{c.player.first_name} {c.player.last_name}</div>
              <div style={{ fontSize: '0.72rem', color: C.slate400, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.player.email}</div>
            </div>
            <StatusDot active={c.player.is_active !== false} />
          </div>
          {c.teams.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {c.teams.map(t => (
                <span key={t.id} style={{ fontSize: '0.65rem', fontWeight: 700, color: C.indigo, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 99, padding: '2px 8px' }}>
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

// ─── Detail Panel ─────────────────────────────────────────────────────
type TabId = 'overview' | 'teams' | 'wellness' | 'family';

function MemberDetailPanel({ memberId, onClose, onToggleStatus, currentUserId }: {
  memberId: string;
  onClose: () => void;
  onToggleStatus: (m: UserProfile) => void;
  currentUserId?: string;
}) {
  const [detail,     setDetail]     = useState<MemberDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState<TabId>('overview');
  const [confirming, setConfirming] = useState(false);
  const [actLoad,    setActLoad]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDetail(await adminApi.getMemberDetail(memberId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load member.'); }
    finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => { load(); setTab('overview'); setConfirming(false); }, [load]);

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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...(detail && (detail.role === 'Player' || detail.role === 'Coach')
      ? [{ id: 'teams' as TabId, label: 'Teams' }] : []),
    ...(detail?.role === 'Player'
      ? [{ id: 'wellness' as TabId, label: 'Wellness' }] : []),
    ...(detail?.role === 'Player' || detail?.role === 'Parent'
      ? [{ id: 'family' as TabId, label: 'Family' }] : []),
  ];

  const isSelf   = detail?.id === currentUserId;
  const isActive = detail?.is_active !== false;
  const meta     = ROLE_META[detail?.role ?? 'Admin'] ?? ROLE_META.Admin;
  const fullName = detail ? `${detail.first_name} ${detail.last_name}` : '';

  const teamCount  = (detail?.teams ?? []).length;
  const avg        = wellnessAvg(detail?.health_logs ?? []);
  const flagged    = (detail?.health_logs ?? []).some(l => l.is_flagged);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFF', width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', height: '100vh', boxShadow: '-12px 0 56px rgba(15,23,42,0.18)', animation: 'panelIn 0.25s cubic-bezier(0.22,1,0.36,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Hero ── */}
        <div style={{ background: `linear-gradient(160deg, ${meta.bg} 0%, #fff 100%)`, borderBottom: `1px solid ${meta.border}`, flexShrink: 0 }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.slate400, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Member Profile</span>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.slate500, boxShadow: '0 1px 4px rgba(15,23,42,0.1)' }}>
              <IcoX />
            </button>
          </div>

          {/* Identity */}
          {!loading && detail && (
            <div style={{ padding: '16px 20px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 68, height: 68, borderRadius: 20, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: `0 8px 24px ${meta.color}44` }}>
                {initials(fullName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: C.slate900, marginBottom: 6, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <RoleBadge role={detail.role} />
                  <StatusDot active={isActive} />
                  {teamCount > 0 && (
                    <span style={{ fontSize: '0.7rem', color: C.slate400, fontWeight: 500 }}>· {teamCount} team{teamCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skeleton hero */}
          {loading && (
            <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 14 }}>
              <div className="skeleton" style={{ width: 68, height: 68, borderRadius: 20, flexShrink: 0 }}/>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
                <div className="skeleton" style={{ height: 20, borderRadius: 6, width: '60%' }}/>
                <div className="skeleton" style={{ height: 16, borderRadius: 6, width: '40%' }}/>
              </div>
            </div>
          )}

          {/* KPI row */}
          {!loading && detail && (
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 18px' }}>
              {detail.role === 'Player' && (
                <>
                  <KPICard label="Teams" value={teamCount} sub="enrolled" color={C.indigo} icon={<IcoUsers />} />
                  <KPICard
                    label="Wellness"
                    value={avg !== null ? avg.toFixed(1) : '—'}
                    sub={avg !== null ? 'avg score' : 'no data'}
                    color={wellnessColor(avg)}
                    icon={<IcoHeart />}
                  />
                  {flagged && <KPICard label="Flagged" value="⚠" sub="review needed" color={C.red} />}
                </>
              )}
              {detail.role === 'Coach' && (
                <>
                  <KPICard label="Teams" value={teamCount} sub="coached" color={C.indigo} icon={<IcoUsers />} />
                  <KPICard label="Players" value={(detail.teams ?? []).reduce((s, t) => s + (t.player_count ?? 0), 0)} sub="total" icon={<IcoActivity />} />
                </>
              )}
              {detail.role === 'Parent' && (
                <>
                  <KPICard label="Children" value={(detail.children ?? []).length} sub="players" color={C.amber} icon={<IcoUsers />} />
                  <KPICard label="Teams" value={Array.from(new Set((detail.children ?? []).flatMap(c => c.teams.map(t => t.id)))).length} sub="involved" icon={<IcoActivity />} />
                </>
              )}
              {detail.role === 'Admin' && (
                <div style={{ flex: 1, background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#7C3AED' }}><IcoShield /></span>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4C1D95' }}>Full Academy Access</div>
                    <div style={{ fontSize: '0.65rem', color: '#7C3AED' }}>All management privileges</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        {!loading && detail && tabs.length > 1 && (
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.slate200}`, flexShrink: 0, background: '#FFF', overflowX: 'auto' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 'none', padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.indigo : C.slate500, borderBottom: `2px solid ${tab === t.id ? C.indigo : 'transparent'}`, transition: 'all 0.15s', whiteSpace: 'nowrap', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginTop: 16 }}>
              {error}
              <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 20 }}>
              {[80, 56, 120, 80].map((h, i) => (
                <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }}/>
              ))}
            </div>
          )}

          {/* Tab content */}
          {!loading && detail && (
            <>
              {tab === 'overview'  && <OverviewTab  detail={detail} />}
              {tab === 'teams'     && <TeamsTab     detail={detail} />}
              {tab === 'wellness'  && <WellnessTab  detail={detail} />}
              {tab === 'family'    && <FamilyTab    detail={detail} />}
            </>
          )}
        </div>

        {/* ── Action footer ── */}
        {!loading && detail && !isSelf && (
          <div style={{ flexShrink: 0, padding: '14px 20px', borderTop: `1px solid ${C.slate100}`, background: '#FFF' }}>
            {confirming ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${C.slate200}`, background: 'none', color: C.slate500, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleToggle} disabled={actLoad}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: isActive ? C.red : C.green, color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: actLoad ? 'not-allowed' : 'pointer', opacity: actLoad ? 0.7 : 1 }}>
                  {actLoad ? '…' : `Confirm ${isActive ? 'Deactivate' : 'Reactivate'}`}
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1.5px solid ${isActive ? C.redBdr : C.greenBdr}`, background: isActive ? C.redBg : C.greenBg, color: isActive ? C.red : C.green, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                {isActive ? 'Deactivate Member' : 'Reactivate Member'}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes panelIn {
          from { transform: translateX(40px); opacity: 0; }
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
    const matchRole = roleFilter === 'All' || m.role === roleFilter;
    const q = search.toLowerCase();
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
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
          Roster
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0' }}>
          {members.length} member{members.length !== 1 ? 's' : ''} · click any row to view full profile
        </p>
      </div>

      {/* Card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, paddingBottom: 2 }}>
            {ROLE_FILTERS.map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flexShrink: 0 }}
                className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}>
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
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IcoSearch /></span>
            <input placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ margin: 16 }}>
            {error}
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }}/>)}
          </div>
        )}

        {/* Empty */}
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

        {/* Table */}
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
                    <tr key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      style={{ cursor: 'pointer', background: isSelected ? meta.bg : undefined, borderLeft: isSelected ? `3px solid ${meta.color}` : '3px solid transparent', transition: 'all 0.12s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = C.slate50; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''; }}>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: isSelected ? meta.gradient : meta.bg, border: `2px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'white' : meta.color, fontSize: '0.8rem', fontWeight: 800, flexShrink: 0, transition: 'all 0.15s' }}>
                            {initials(`${m.first_name} ${m.last_name}`)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? meta.color : 'var(--text-primary)' }}>
                              {m.first_name} {m.last_name}
                            </div>
                            <div style={{ fontSize: '0.67rem', color: C.slate400, marginTop: 1 }}>
                              {isSelected ? 'Profile open →' : 'Click to view profile'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td><RoleBadge role={m.role} size="sm" /></td>

                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {m.email}
                      </td>

                      <td><StatusDot active={isActive} /></td>

                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(m.created_at)}
                      </td>

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
                          <IcoChevronRight />
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

      {/* Detail panel */}
      {selectedId && (
        <MemberDetailPanel
          memberId={selectedId}
          onClose={() => setSelectedId(null)}
          onToggleStatus={u => setMembers(prev => prev.map(m => m.id === u.id ? u : m))}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
