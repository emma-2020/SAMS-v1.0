// src/pages/coach/PlayersPage.jsx — Premium v2
import { useState, useEffect } from 'react';
import { coachApi } from '../../services/coach.api';
import { useApi }   from '../../hooks/useApi';
import { PageHeader, EmptyState } from '../../components/shared/ui';

// ─── Icons ────────────────────────────────────────────────────────
const IcoSearch  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoClose   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoUser    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoHeart   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoBarbell = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="11" width="4" height="2" rx="1"/><rect x="18" y="11" width="4" height="2" rx="1"/><rect x="6" y="8" width="2" height="8" rx="1"/><rect x="16" y="8" width="2" height="8" rx="1"/><line x1="8" y1="12" x2="16" y2="12" strokeWidth="2"/></svg>;
const IcoCal     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoFlag    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IcoArrow   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

// ─── Helpers ──────────────────────────────────────────────────────
function getPhotoSeed(player) {
  const s = `${player.id ?? ''}${player.email ?? ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h) % 90 + 10;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function daysAgo(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}
function healthStatus(h) {
  if (!h) return { label: 'No data',    color: '#94A3B8', bg: '#F8FAFC',  border: '#E2E8F0' };
  if (h.is_flagged) return { label: 'Flagged',    color: '#EF4444', bg: '#FEF2F2',  border: '#FECACA' };
  const avg = (h.fatigue + h.soreness + h.sleep_quality) / 3;
  if (avg <= 2) return { label: 'Good',      color: '#059669', bg: '#ECFDF5',  border: '#A7F3D0' };
  if (avg >= 4) return { label: 'Needs Rest', color: '#D97706', bg: '#FFFBEB',  border: '#FDE68A' };
  return          { label: 'Moderate',  color: '#6366F1', bg: '#EEF2FF',  border: '#C7D2FE' };
}

// ─── Circular Health Metric Ring ──────────────────────────────────
function HealthRing({ label, value, max = 5, low = false }) {
  const valid = value != null;
  const pct   = valid ? (value / max) * 100 : 0;
  const r     = 30, sz = 76;
  const circ  = 2 * Math.PI * r;
  const dash  = circ - (pct / 100) * circ;

  const isBad   = valid && (low ? value >= 4 : value <= 2);
  const isGood  = valid && (low ? value <= 2 : value >= 4);
  const stroke  = isBad ? '#EF4444' : isGood ? '#10B981' : '#F59E0B';
  const centerBg = isBad ? '#FEF2F260' : isGood ? '#ECFDF560' : '#FFFBEB60';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div style={{ position: 'relative', width: sz, height: sz }}>
        <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id={`rg-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
              <stop offset="100%" stopColor={stroke} stopOpacity={1} />
            </linearGradient>
          </defs>
          <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`${stroke}20`} strokeWidth={7} />
          {valid && (
            <circle
              cx={sz/2} cy={sz/2} r={r}
              fill="none" stroke={`url(#rg-${label})`} strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={dash}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
            />
          )}
        </svg>
        <div style={{
          position: 'absolute', inset: 7, borderRadius: '50%',
          background: centerBg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {valid ? (
            <>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: stroke, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: '0.52rem', fontWeight: 700, color: `${stroke}99` }}>/{max}</span>
            </>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', letterSpacing: '0.02em' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Premium Photo Player Card ────────────────────────────────────
function PlayerCard({ player, onSelect }) {
  const hs   = healthStatus(player.latest_health);
  const seed = getPhotoSeed(player);

  const badgeColor =
    hs.label === 'Flagged'    ? 'rgba(239,68,68,0.9)' :
    hs.label === 'Good'       ? 'rgba(5,150,105,0.85)' :
    hs.label === 'Needs Rest' ? 'rgba(217,119,6,0.85)' :
    'rgba(100,116,139,0.75)';

  return (
    <div
      onClick={() => onSelect(player)}
      style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden',
        cursor: 'pointer', height: 300, background: '#0F172A',
        boxShadow: '0 4px 20px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)',
        transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-7px) scale(1.013)';
        e.currentTarget.style.boxShadow = '0 22px 56px rgba(15,23,42,0.22), 0 4px 14px rgba(15,23,42,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)';
      }}
    >
      {/* Background photo */}
      <img
        src={`https://picsum.photos/seed/${seed}/400/560`}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />

      {/* Multi-stop gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.80) 68%, rgba(0,0,0,0.97) 100%)',
      }} />

      {/* Health badge — top right */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        padding: '4px 10px', borderRadius: 99,
        background: badgeColor, backdropFilter: 'blur(10px)',
        fontSize: '0.6rem', fontWeight: 800, color: '#fff',
        border: '1px solid rgba(255,255,255,0.2)',
        letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {hs.label === 'Flagged' && <IcoFlag />}
        {hs.label.toUpperCase()}
      </div>

      {/* Bottom content overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px' }}>
        {/* Team tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {player.teams.map(t => (
            <span key={t.id} style={{
              fontSize: '0.57rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99,
              background: 'rgba(99,102,241,0.72)', backdropFilter: 'blur(12px)',
              color: '#fff', border: '1px solid rgba(99,102,241,0.4)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {t.name}
            </span>
          ))}
        </div>

        {/* Name */}
        <div style={{
          fontWeight: 900, fontSize: '1.1rem', color: '#fff', lineHeight: 1.2,
          letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {player.first_name} {player.last_name}
        </div>

        {/* Email + timestamp */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 3, fontSize: '0.68rem', color: 'rgba(255,255,255,0.52)',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '62%' }}>
            {player.email}
          </span>
          <span>{player.latest_health ? daysAgo(player.latest_health.logged_at) : 'No check-in'}</span>
        </div>

        {/* Action row */}
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.13)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em' }}>
            View Profile
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', display: 'flex' }}><IcoArrow /></span>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Drawer ───────────────────────────────────────────────
function ProfileDrawer({ player, onClose }) {
  const [tab, setTab]       = useState('overview');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const seed = getPhotoSeed(player);
  const hs   = healthStatus(player.latest_health);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setProfile(null);
    coachApi.getPlayerProfile(player.id)
      .then(d => { if (!cancelled) { setProfile(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message || 'Failed to load profile.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [player.id]);

  const TABS = [
    { key: 'overview',  label: 'Overview',  icon: <IcoUser /> },
    { key: 'health',    label: 'Health',    icon: <IcoHeart /> },
    { key: 'workouts',  label: 'Workouts',  icon: <IcoBarbell /> },
    { key: 'schedule',  label: 'Schedule',  icon: <IcoCal /> },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(5px)' }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 500, maxWidth: '100vw',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '0 0 80px rgba(15,23,42,0.2), -4px 0 24px rgba(15,23,42,0.07)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Hero photo header */}
        <div style={{ position: 'relative', height: 220, background: '#0F172A', overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={`https://picsum.photos/seed/${seed}/960/440`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.72) 100%)',
          }} />

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.22)', borderRadius: 99,
              width: 34, height: 34, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IcoClose />
          </button>

          {/* Player identity */}
          <div style={{ position: 'absolute', bottom: 18, left: 22, right: 22 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
              {player.teams.map(t => (
                <span key={t.id} style={{
                  fontSize: '0.58rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(99,102,241,0.78)', backdropFilter: 'blur(8px)',
                  color: '#fff', border: '1px solid rgba(99,102,241,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {t.name}
                </span>
              ))}
            </div>
            <div style={{
              fontWeight: 900, fontSize: '1.5rem', color: '#fff',
              lineHeight: 1.15, letterSpacing: '-0.025em',
              textShadow: '0 2px 10px rgba(0,0,0,0.35)',
            }}>
              {player.first_name} {player.last_name}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.58)', marginTop: 4 }}>
              {player.email}
            </div>
          </div>
        </div>

        {/* Status strip */}
        <div style={{
          padding: '10px 20px', flexShrink: 0,
          background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99,
            background: hs.bg, color: hs.color, border: `1px solid ${hs.border}`,
          }}>
            {hs.label === 'Flagged' && <IcoFlag />}
            {hs.label}
            {player.latest_health && (
              <span style={{ fontWeight: 500, opacity: 0.75 }}>· {daysAgo(player.latest_health.logged_at)}</span>
            )}
          </span>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-subtle)',
          padding: '0 20px', flexShrink: 0, background: 'var(--bg-surface)',
        }}>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '11px 12px', background: 'none', border: 'none',
                borderBottom: tab === key ? '2px solid #2563EB' : '2px solid transparent',
                color: tab === key ? '#2563EB' : 'var(--text-muted)',
                fontWeight: tab === key ? 700 : 500, fontSize: '0.8rem',
                cursor: 'pointer', transition: 'all 0.12s', marginBottom: -1,
              }}
            >
              <span style={{ display: 'flex', opacity: tab === key ? 1 : 0.55 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {loading && <DrawerSkeleton />}
          {error && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</div>
          )}
          {!loading && !error && profile && (
            <>
              {tab === 'overview' && <OverviewTab player={profile.player} teams={player.teams} latestHealth={player.latest_health} />}
              {tab === 'health'   && <HealthTab   logs={profile.healthLogs} />}
              {tab === 'workouts' && <WorkoutsTab workouts={profile.workouts} />}
              {tab === 'schedule' && <ScheduleTab events={profile.upcomingEvents} />}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

function DrawerSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[80, 55, 100, 65, 80, 45].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: `${w}%`, borderRadius: 6 }} />
      ))}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────
function OverviewTab({ player, teams, latestHealth }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Player info card */}
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 16,
        border: '1px solid var(--border-subtle)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)',
          background: 'linear-gradient(90deg, rgba(37,99,235,0.05), transparent)',
        }}>
          Player Info
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <InfoRow label="Member Since" value={fmtDate(player.created_at)} />
          <InfoRow label="Email"        value={player.email} />
          <InfoRow label="Status"       value={player.is_active ? 'Active' : 'Inactive'} valueColor={player.is_active ? '#059669' : 'var(--text-muted)'} />
          <InfoRow label="Teams"        value={teams.map(t => t.name).join(', ')} />
        </div>
      </div>

      {/* Health check-in with rings */}
      {latestHealth ? (
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 16,
          border: '1px solid var(--border-subtle)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(90deg, rgba(16,185,129,0.05), transparent)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>Latest Health Check-in</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Logged {daysAgo(latestHealth.logged_at)}</div>
          </div>
          <div style={{
            padding: '20px 16px',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, justifyItems: 'center',
          }}>
            <HealthRing label="Fatigue"       value={latestHealth.fatigue}       low={true}  />
            <HealthRing label="Soreness"      value={latestHealth.soreness}      low={true}  />
            <HealthRing label="Sleep Quality" value={latestHealth.sleep_quality} low={false} />
          </div>
          {latestHealth.notes && (
            <div style={{
              margin: '0 14px 14px',
              padding: '10px 12px',
              background: 'rgba(99,102,241,0.05)', borderRadius: 10,
              border: '1px solid rgba(99,102,241,0.14)',
              fontSize: '0.76rem', color: 'var(--text-secondary)', fontStyle: 'italic',
            }}>
              "{latestHealth.notes}"
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 16,
          border: '1px solid var(--border-subtle)',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No health check-in recorded yet.</div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.83rem', color: valueColor || 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ─── Health Tab ───────────────────────────────────────────────────
function HealthTab({ logs }) {
  if (!logs.length) {
    return <EmptyState icon={<IcoHeart />} title="No health logs" subtitle="This player hasn't submitted any wellness check-ins yet." />;
  }
  return (
    <div>
      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>
        Last {logs.length} check-in{logs.length !== 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {logs.map(log => (
          <div key={log.id} style={{
            background: log.is_flagged
              ? 'linear-gradient(135deg, #FEF2F2 0%, #FFF 60%)'
              : 'var(--bg-elevated)',
            border: `1px solid ${log.is_flagged ? '#FECACA' : 'var(--border-subtle)'}`,
            borderRadius: 14, overflow: 'hidden',
            borderLeft: `4px solid ${log.is_flagged ? '#EF4444' : '#10B981'}`,
          }}>
            <div style={{
              padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.04)',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {fmtDate(log.logged_at)}
              </span>
              {log.is_flagged && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 800, color: '#EF4444',
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: '#FEF2F2', padding: '2px 8px', borderRadius: 99, border: '1px solid #FECACA',
                }}>
                  <IcoFlag /> FLAGGED
                </span>
              )}
            </div>
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, justifyItems: 'center' }}>
              <HealthRing label="Fatigue"  value={log.fatigue}       max={5} low={true}  />
              <HealthRing label="Soreness" value={log.soreness}      max={5} low={true}  />
              <HealthRing label="Sleep"    value={log.sleep_quality} max={5} low={false} />
            </div>
            {log.notes && (
              <div style={{ padding: '0 14px 12px', fontSize: '0.73rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "{log.notes}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Workouts Tab ─────────────────────────────────────────────────
function WorkoutsTab({ workouts }) {
  if (!workouts.length) {
    return <EmptyState icon={<IcoBarbell />} title="No workouts assigned" subtitle="Create a training plan to assign workouts to this player or their team." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {workouts.map(w => (
        <div key={w.id} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          borderRadius: 14, padding: '14px 16px',
          borderLeft: '4px solid #7C3AED',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{w.title}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {w.due_date ? `Due ${fmtDate(w.due_date)}` : 'No due date'} · {w.workout_exercises?.length ?? 0} exercises
          </div>
          {(w.workout_exercises || []).length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {w.workout_exercises.map((ex, i) => (
                <div key={ex.id} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 18 }}>{i + 1}.</span>
                  <span style={{ flex: 1 }}>{ex.description}{ex.sets_reps_notes ? ` — ${ex.sets_reps_notes}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────
function ScheduleTab({ events }) {
  if (!events.length) {
    return <EmptyState icon={<IcoCal />} title="No upcoming events" subtitle="No sessions scheduled for this player's teams in the near future." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map(ev => (
        <div key={ev.id} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
          borderLeft: '4px solid #6366F1',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: '#6366F112', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6366F1', border: '1px solid #6366F120',
          }}>
            <IcoCal />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ev.title}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtDate(ev.start_time)} · {fmtTime(ev.start_time)}{ev.location && ` · ${ev.location}`}
            </div>
            {ev.teams?.name && (
              <div style={{ fontSize: '0.7rem', color: '#6366F1', marginTop: 4, fontWeight: 600 }}>{ev.teams.name}</div>
            )}
          </div>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: '#6366F110', color: '#6366F1', border: '1px solid #6366F128', flexShrink: 0,
          }}>
            {ev.type}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Team Tab Pill ────────────────────────────────────────────────
function TeamTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 99, cursor: 'pointer',
        border: active ? '1px solid #2563EB' : '1px solid var(--border-default)',
        background: active ? '#2563EB' : 'var(--bg-surface)',
        color: active ? '#fff' : 'var(--text-secondary)',
        fontSize: '0.8rem', fontWeight: active ? 700 : 500,
        transition: 'all 0.14s',
        boxShadow: active ? '0 3px 10px rgba(37,99,235,0.3)' : '0 1px 3px rgba(15,23,42,0.04)',
      }}
    >
      {label}
      <span style={{
        minWidth: 18, height: 18, borderRadius: 99,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
        fontSize: '0.67rem', fontWeight: 700,
        color: active ? '#fff' : 'var(--text-muted)',
      }}>
        {count}
      </span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function PlayersPage() {
  const [search, setSearch]         = useState('');
  const [activeTeam, setActiveTeam] = useState('all');
  const [selected, setSelected]     = useState(null);

  const { data, loading, error } = useApi(
    () => coachApi.getPlayers(),
    [],
    { fallback: { players: [], teams: [] } }
  );

  const players = data?.players ?? [];
  const teams   = data?.teams   ?? [];

  const filtered = players.filter(p => {
    const nm = `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    const tm = activeTeam === 'all' || p.teams.some(t => t.id === activeTeam);
    return nm && tm;
  });

  const flaggedCount = filtered.filter(p => p.latest_health?.is_flagged).length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Player Management"
        subtitle={`${players.length} player${players.length !== 1 ? 's' : ''} across ${teams.length} team${teams.length !== 1 ? 's' : ''}`}
        badge={
          flaggedCount > 0 ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA',
            }}>
              <IcoFlag /> {flaggedCount} flagged
            </span>
          ) : null
        }
      />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 12, padding: '9px 14px',
          boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
        }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IcoSearch /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players…"
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
              <IcoClose />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <TeamTab id="all" label="All Players" count={players.length} active={activeTeam === 'all'} onClick={() => setActiveTeam('all')} />
          {teams.map(t => (
            <TeamTab key={t.id} id={t.id} label={t.name}
              count={players.filter(p => p.teams.some(pt => pt.id === t.id)).length}
              active={activeTeam === t.id} onClick={() => setActiveTeam(t.id)} />
          ))}
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 20 }} />)}
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<IcoUser />}
          title={search ? 'No players match your search' : 'No players yet'}
          subtitle={search ? 'Try a different name or email.' : 'Players will appear here once they are rostered on your teams.'}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {filtered.map(p => <PlayerCard key={p.id} player={p} onSelect={setSelected} />)}
        </div>
      )}

      {selected && <ProfileDrawer player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
