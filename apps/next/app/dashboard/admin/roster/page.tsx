'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import type { UserProfile, MemberDetail } from '@sams/api';

// ─── Icons ──────────────────────────────────────────────────────────
const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoHeart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IcoChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IcoShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────
const ROLE_FILTERS = ['All', 'Admin', 'Coach', 'Player', 'Parent'];

const ROLE_META: Record<string, { color: string; bg: string; border: string }> = {
  Admin:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  Coach:  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  Player: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  Parent: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function scoreColor(val: number) {
  if (val <= 2) return '#DC2626';
  if (val <= 3) return '#D97706';
  return '#059669';
}

function scoreBg(val: number) {
  if (val <= 2) return '#FEF2F2';
  if (val <= 3) return '#FFFBEB';
  return '#ECFDF5';
}

// ─── UI atoms ────────────────────────────────────────────────────────
function Avatar({ name, role, size = 34 }: { name: string; role: string; size?: number }) {
  const meta = ROLE_META[role] ?? { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: meta.bg, border: `2px solid ${meta.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: meta.color, fontSize: Math.round(size * 0.32), fontWeight: 800,
    }}>
      {initials(name)}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 99, background: meta.bg, border: `1px solid ${meta.border}`,
      fontSize: '0.72rem', fontWeight: 700, color: meta.color, letterSpacing: '0.02em',
    }}>
      {role}
    </span>
  );
}

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: isActive ? '#ECFDF5' : '#F8FAFC',
      border: `1px solid ${isActive ? '#A7F3D0' : '#E2E8F0'}`,
      fontSize: '0.72rem', fontWeight: 700,
      color: isActive ? '#059669' : '#94A3B8',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#059669' : '#94A3B8', flexShrink: 0 }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>
      {children}
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────
function TeamCard({ name, sport, division, isActive, playerCount }: {
  name: string; sport?: string | null; division?: string | null; isActive?: boolean; playerCount?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9', marginBottom: 6 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>
          {[sport, division].filter(Boolean).join(' · ') || 'No sport/division'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        {playerCount !== undefined && (
          <span style={{ fontSize: '0.7rem', color: '#6366F1', fontWeight: 700 }}>{playerCount} players</span>
        )}
        {isActive !== undefined && (
          <span style={{ fontSize: '0.65rem', color: isActive ? '#059669' : '#94A3B8', fontWeight: 600 }}>
            {isActive ? '● Active' : '○ Inactive'}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Health Score Bar ─────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct   = (value / 5) * 100;
  const color = scoreColor(value);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}/5</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ─── Member Detail Panel ──────────────────────────────────────────────
function MemberDetailPanel({ memberId, onClose, onToggleStatus, currentUserId }: {
  memberId: string;
  onClose: () => void;
  onToggleStatus: (member: UserProfile) => void;
  currentUserId?: string;
}) {
  const [detail,       setDetail]       = useState<MemberDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [confirming,   setConfirming]   = useState(false);
  const [actLoading,   setActLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDetail(await adminApi.getMemberDetail(memberId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load member.'); }
    finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle() {
    if (!detail) return;
    setActLoading(true); setConfirming(false);
    try {
      const updated = await adminApi.setMemberStatus(detail.id, !detail.is_active);
      setDetail(d => d ? { ...d, is_active: updated.is_active } : d);
      onToggleStatus(updated);
    } catch { /* ignore */ }
    finally { setActLoading(false); }
  }

  const isSelf = detail?.id === currentUserId;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFFFFF', width: '100%', maxWidth: 420, height: '100vh', overflowY: 'auto', boxShadow: '-8px 0 48px rgba(15,23,42,0.18)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.22s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>Member Profile</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 28px' }}>

          {loading && (
            <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
              <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
            </div>
          )}

          {error && !loading && (
            <div className="alert alert-error" style={{ margin: '20px 0' }}>
              {error}
              <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
            </div>
          )}

          {detail && !loading && (() => {
            const isActive = detail.is_active !== false;
            const meta     = ROLE_META[detail.role] ?? ROLE_META.Admin;
            const fullName = `${detail.first_name} ${detail.last_name}`;

            return (
              <>
                {/* Hero */}
                <div style={{ textAlign: 'center', padding: '28px 0 20px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: meta.bg, border: `3px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 800, color: meta.color, margin: '0 auto 14px', boxShadow: `0 0 0 6px ${meta.bg}` }}>
                    {initials(fullName)}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', marginBottom: 6 }}>{fullName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <RoleBadge role={detail.role} />
                    <StatusPill isActive={isActive} />
                  </div>
                </div>

                {/* Contact info */}
                <SectionLabel>Contact &amp; Account</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                    <div style={{ color: '#6366F1', flexShrink: 0 }}><IcoMail /></div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</div>
                      <div style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 600, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{detail.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                    <div style={{ color: '#6366F1', flexShrink: 0 }}><IcoCalendar /></div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Joined</div>
                      <div style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 600 }}>{fmtDate(detail.created_at)}</div>
                    </div>
                  </div>
                </div>

                {/* ── PLAYER ── */}
                {detail.role === 'Player' && (
                  <>
                    {/* Teams */}
                    <SectionLabel>Teams Enrolled</SectionLabel>
                    {(detail.teams ?? []).length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '8px 0' }}>Not enrolled in any team yet.</div>
                    ) : (
                      (detail.teams ?? []).map(t => (
                        <TeamCard key={t.id} name={t.name} sport={t.sport} division={t.division} isActive={t.is_active} />
                      ))
                    )}

                    {/* Parent */}
                    <SectionLabel>Parent / Guardian</SectionLabel>
                    {!detail.parent ? (
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '8px 0' }}>No parent linked to this player.</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
                        <Avatar name={`${detail.parent.first_name} ${detail.parent.last_name}`} role="Parent" size={42} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                            {detail.parent.first_name} {detail.parent.last_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#78716C', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {detail.parent.email}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <StatusPill isActive={detail.parent.is_active !== false} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Health Logs */}
                    <SectionLabel>Recent Wellness Logs</SectionLabel>
                    {(detail.health_logs ?? []).length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '8px 0' }}>No wellness data submitted yet.</div>
                    ) : (
                      (detail.health_logs ?? []).map(log => (
                        <div key={log.id} style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 12, background: log.is_flagged ? '#FEF2F2' : '#F8FAFC', border: `1.5px solid ${log.is_flagged ? '#FECACA' : '#F1F5F9'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                              {new Date(log.log_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                            {log.is_flagged && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 99, border: '1px solid #FECACA' }}>⚠ Flagged</span>
                            )}
                          </div>
                          <ScoreBar label="Fatigue"  value={log.fatigue} />
                          <ScoreBar label="Soreness" value={log.soreness} />
                          <ScoreBar label="Sleep"    value={log.sleep_quality} />
                          {log.notes && (
                            <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', background: '#F1F5F9', borderRadius: 7, padding: '6px 8px' }}>
                              "{log.notes}"
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* ── COACH ── */}
                {detail.role === 'Coach' && (
                  <>
                    <SectionLabel>Teams Coached</SectionLabel>
                    {(detail.teams ?? []).length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '8px 0' }}>Not assigned to any team.</div>
                    ) : (
                      (detail.teams ?? []).map(t => (
                        <TeamCard key={t.id} name={t.name} sport={t.sport} division={t.division} isActive={t.is_active} playerCount={t.player_count} />
                      ))
                    )}
                  </>
                )}

                {/* ── PARENT ── */}
                {detail.role === 'Parent' && (
                  <>
                    <SectionLabel>Children (Players)</SectionLabel>
                    {(detail.children ?? []).length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '8px 0' }}>No players linked to this parent.</div>
                    ) : (
                      (detail.children ?? []).map((c, i) => (
                        <div key={c.player.id || i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 12, background: '#F0FDF4', border: '1.5px solid #A7F3D0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: c.teams.length > 0 ? 10 : 0 }}>
                            <Avatar name={`${c.player.first_name} ${c.player.last_name}`} role="Player" size={38} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{c.player.first_name} {c.player.last_name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.player.email}</div>
                            </div>
                            <StatusPill isActive={c.player.is_active !== false} />
                          </div>
                          {c.teams.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {c.teams.map(t => (
                                <span key={t.id} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366F1', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 99, padding: '2px 8px' }}>
                                  {t.name}{t.sport ? ` · ${t.sport}` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* ── ADMIN ── */}
                {detail.role === 'Admin' && (
                  <>
                    <SectionLabel>Admin Privileges</SectionLabel>
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: '#F5F3FF', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: '#7C3AED' }}><IcoShield /></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#4C1D95', marginBottom: 2 }}>Full Academy Access</div>
                        <div style={{ fontSize: '0.75rem', color: '#7C3AED' }}>Can manage all members, teams, schedules and settings.</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                {!isSelf && (
                  <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
                    {confirming ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid #E2E8F0', background: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button onClick={handleToggle} disabled={actLoading} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: isActive ? '#DC2626' : '#059669', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: actLoading ? 'not-allowed' : 'pointer', opacity: actLoading ? 0.7 : 1 }}>
                          {actLoading ? '…' : (isActive ? 'Confirm Deactivate' : 'Confirm Reactivate')}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirming(true)}
                        style={{ width: '100%', padding: '11px', borderRadius: 9, border: `1.5px solid ${isActive ? '#FECACA' : '#A7F3D0'}`, background: 'none', color: isActive ? '#DC2626' : '#059669', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isActive ? '#FEF2F2' : '#F0FDF4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        {isActive ? 'Deactivate Member' : 'Reactivate Member'}
                      </button>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(48px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
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
    setActionLoading(member.id);
    setConfirmId(null);
    try {
      const updated = await adminApi.setMemberStatus(member.id, !member.is_active);
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update member status');
    } finally {
      setActionLoading(null);
    }
  }

  function handlePanelToggle(updated: UserProfile) {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  const filtered = members.filter(m => {
    const matchRole   = roleFilter === 'All' || m.role === roleFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTERS.reduce<Record<string, number>>((acc, r) => {
    acc[r] = r === 'All' ? members.length : members.filter(m => m.role === r).length;
    return acc;
  }, {});

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }} onClick={() => setConfirmId(null)}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>
            Roster
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: '4px 0 0' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} · click any row to view full profile
          </p>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 8,
        }}>
          <div className="search-input" style={{ width: 240 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IcoSearch /></span>
            <input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, paddingBottom: 2 }}>
            {ROLE_FILTERS.map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flexShrink: 0 }}
                className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}>
                {r}
                {counts[r] > 0 && (
                  <span style={{ marginLeft: 4, fontSize: '0.7rem', background: roleFilter === r ? 'rgba(255,255,255,0.2)' : 'var(--bg-overlay)', borderRadius: 99, padding: '1px 6px' }}>
                    {counts[r]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ margin: 16 }}>
            <span>{error}</span>
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-subtle)', border: '1px solid var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 4, fontSize: 22 }}>
              👥
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {search ? 'No members match your search' : 'No members yet'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 300, margin: 0 }}>
              {search ? 'Try a different search term or filter.' : 'Invite members from the Invitations page.'}
            </p>
          </div>
        ) : (
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

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      style={{ cursor: 'pointer', background: isSelected ? '#F5F3FF' : undefined, transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={`${m.first_name} ${m.last_name}`} role={m.role} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#4338CA' : 'var(--text-primary)' }}>
                              {m.first_name} {m.last_name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: 1 }}>Click to view profile</div>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={m.role} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {m.email}
                      </td>
                      <td><StatusPill isActive={isActive} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(m.created_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isSelf ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>You</span>
                        ) : isActive ? (
                          isConfirming ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deactivate?</span>
                              <button disabled={isLoading} onClick={e => { e.stopPropagation(); toggleStatus(m); }}
                                style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                                {isLoading ? '…' : 'Confirm'}
                              </button>
                              <button onClick={e => { e.stopPropagation(); setConfirmId(null); }}
                                style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button disabled={isLoading} onClick={e => { e.stopPropagation(); setConfirmId(m.id); }}
                              style={{ background: 'none', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                              Deactivate
                            </button>
                          )
                        ) : (
                          <button disabled={isLoading} onClick={e => { e.stopPropagation(); toggleStatus(m); }}
                            style={{ background: 'none', border: '1px solid #A7F3D0', color: '#059669', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                            {isLoading ? '…' : 'Reactivate'}
                          </button>
                        )}

                        {/* View profile chevron */}
                        <button onClick={e => { e.stopPropagation(); setSelectedId(m.id); }}
                          style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? '#6366F1' : '#CBD5E1', verticalAlign: 'middle', padding: 4, borderRadius: 6, transition: 'color 0.12s' }}
                          title="View full profile"
                          onMouseEnter={e => e.currentTarget.style.color = '#6366F1'}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color = '#CBD5E1'; }}>
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
          onToggleStatus={handlePanelToggle}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
