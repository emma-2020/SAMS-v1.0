// src/pages/player/HealthPage.jsx
import { useState, useMemo } from 'react';
import { useApi, useSubmit } from '../../hooks/useApi';
import { healthApi }         from '../../services/health.api';
import useAuthStore          from '../../store/authStore';

// ─── Colour helpers ───────────────────────────────────────────────
const STATUS_COLOR = {
  Low:      '#10B981',
  Good:     '#10B981',
  Normal:   '#10B981',
  Medium:   '#F59E0B',
  Moderate: '#F59E0B',
  Needs:    '#F59E0B',
  High:     '#EF4444',
  Poor:     '#EF4444',
  Critical: '#EF4444',
};
function scoreColor(pct) {
  if (pct >= 70) return '#10B981';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

// ─── Circular Gauge ───────────────────────────────────────────────
function CircularGauge({ pct, color, label, status, note, size = 110 }) {
  const r  = size * 0.38;
  const sw = size * 0.09;
  const C  = 2 * Math.PI * r;
  const p  = Math.max(0, Math.min(pct, 100));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--border-default)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${(p/100)*C} ${C}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
        <text x={size/2} y={size/2 - 2} textAnchor="middle"
          fontSize={size*0.19} fontWeight="800" fill="var(--text-primary)">
          {p}
        </text>
        <text x={size/2} y={size/2 + size*0.16} textAnchor="middle"
          fontSize={size*0.1} fill="var(--text-muted)">
          %
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{label}</div>
        {status && (
          <span style={{
            display: 'inline-block', marginTop: 3,
            padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
            background: `${color}18`, color,
          }}>
            {status}
          </span>
        )}
        {note && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
      </div>
    </div>
  );
}

// ─── Heart Rate Sparkline ─────────────────────────────────────────
function heartRatePath(fatigue = 3) {
  const base = 58 + fatigue * 6;
  return Array.from({ length: 36 }, (_, i) => {
    const wave  = Math.sin(i * 0.55) * 12 + Math.cos(i * 1.1) * 6;
    const spike = (i % 9 === 4) ? 22 : (i % 9 === 5) ? -8 : 0;
    return Math.max(48, Math.min(118, Math.round(base + wave + spike)));
  });
}

function HeartRateSparkline({ data, color = '#EF4444', width = 280, height = 56 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 10;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: 4 + ((max - v) / rng) * (height - 8),
  }));
  const linePath  = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const fillPath  = `${linePath} L${width},${height} L0,${height} Z`;
  const uid = `hrg-${Math.floor(Math.random()*9999)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${uid})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Sleep Bar Chart ──────────────────────────────────────────────
const SLEEP_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function SleepBars({ highlight = 4 }) {
  const sleepHrs = [6.4, 7.1, 6.9, 7.4, 7.6, 7.2, 7.8, 7.3, 6.8, 7.0, 7.5, 7.2];
  const maxH = 8.5;
  const barW = 18, gap = 8, barArea = 200;
  return (
    <svg viewBox={`0 0 ${barArea} 80`} width="100%" height={80} preserveAspectRatio="none">
      {sleepHrs.map((h, i) => {
        const barH  = (h / maxH) * 60;
        const x     = i * (barW + gap);
        const active = i === highlight;
        return (
          <g key={i}>
            <rect x={x} y={80 - barH - 16} width={barW} height={barH}
              rx={4} fill={active ? '#6366F1' : 'var(--border-default)'}
            />
            {active && (
              <text x={x + barW/2} y={80 - barH - 20} textAnchor="middle"
                fontSize="9" fontWeight="700" fill="#6366F1">
                {h}h
              </text>
            )}
            <text x={x + barW/2} y={76} textAnchor="middle"
              fontSize="7.5" fill="var(--text-muted)">
              {SLEEP_LABELS[i].slice(0,1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────
function MiniCalendar({ logs = [] }) {
  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const today     = now.getDate();
  const DAYS      = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const loggedDays = new Set(logs.map(l => {
    const d = new Date(l.logged_at);
    return d.getMonth() === month && d.getFullYear() === year ? d.getDate() : null;
  }).filter(Boolean));

  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysCount }, (_, i) => i + 1));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
          {MONTHS[month]} {year}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['←','→'].map(c => (
            <button key={c} style={{
              width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: '0.7rem',
              color: 'var(--text-secondary)',
            }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700,
            color: 'var(--text-muted)', paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isToday   = day === today;
          const hasLog    = loggedDays.has(day);
          const isPast    = day < today;
          return (
            <div key={day} style={{
              textAlign: 'center', fontSize: '0.72rem', fontWeight: isToday ? 800 : 500,
              padding: '3px 0', borderRadius: 6, position: 'relative',
              background: isToday ? '#6366F1' : 'transparent',
              color: isToday ? 'white' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
            }}>
              {day}
              {hasLog && !isToday && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%', background: '#10B981',
                  position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)',
                }}/>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        {[
          { color: '#10B981', label: 'Logged' },
          { color: '#6366F1', label: 'Today' },
          { color: '#F59E0B', label: 'Rest Day' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Health Log Modal ─────────────────────────────────────────────
function LogModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ fatigue: 3, soreness: 3, sleep_quality: 3, notes: '' });
  const { submit, loading, error, reset } = useSubmit(() => healthApi.submitLog(form));

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await submit();
    if (res.ok) { onSuccess?.(); onClose(); }
  }

  const SCALE_LABELS = {
    fatigue:       ['Perfect', 'Good', 'Average', 'Tired', 'Exhausted'],
    soreness:      ['None', 'Slight', 'Moderate', 'Sore', 'Very Sore'],
    sleep_quality: ['Excellent', 'Good', 'Fair', 'Poor', 'Terrible'],
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), var(--bg-elevated))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Log Today's Wellness
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: '1rem',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries({
            fatigue:       { label: 'Energy Level', desc: '1 = Energised, 5 = Exhausted' },
            soreness:      { label: 'Muscle Soreness', desc: '1 = None, 5 = Very Sore' },
            sleep_quality: { label: 'Sleep Quality', desc: '1 = Excellent, 5 = Terrible' },
          }).map(([key, { label, desc }]) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                  background: 'var(--accent-subtle)', color: 'var(--accent)',
                }}>
                  {SCALE_LABELS[key][form[key] - 1]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(v => (
                  <button
                    key={v} type="button"
                    onClick={() => setForm(p => ({ ...p, [key]: v }))}
                    style={{
                      flex: 1, height: 38, borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${form[key] === v ? 'var(--accent)' : 'var(--border-default)'}`,
                      background: form[key] === v ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                      color: form[key] === v ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.12s',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="field">
            <label className="field-label">Notes (optional)</label>
            <textarea
              className="field-input"
              rows={2}
              placeholder="Any injuries, comments, how you're feeling..."
              value={form.notes}
              onChange={e => { setForm(p => ({ ...p, notes: e.target.value })); reset(); }}
              style={{ resize: 'vertical' }}
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ padding: '10px 14px' }}>
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {!loading && 'Submit Wellness Log'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── AI Recommendations ───────────────────────────────────────────
function buildRecommendations(log) {
  if (!log) return [
    { type: 'info', color: '#3B82F6', icon: '💡', text: 'Log today\'s wellness to get personalised recommendations.' },
  ];
  const recs = [];
  if (log.fatigue >= 4)
    recs.push({ type: 'warning', color: '#F59E0B', icon: '⚡', text: `High fatigue detected. Reduce sprint drills by 20% this week.` });
  if (log.soreness >= 4)
    recs.push({ type: 'danger', color: '#EF4444', icon: '🦵', text: 'Elevated soreness flagged — risk of muscle strain if pace continues.' });
  else if (log.soreness === 3)
    recs.push({ type: 'warning', color: '#F59E0B', icon: '🔄', text: `Schedule ${log.soreness >= 4 ? '2 rest days' : 'a recovery session'} to avoid fatigue spike.` });
  if (log.sleep_quality >= 4)
    recs.push({ type: 'danger', color: '#EF4444', icon: '😴', text: 'Poor sleep quality. Prioritise 8h rest and hydration tonight.' });
  if (recs.length === 0) {
    recs.push(
      { type: 'success', color: '#10B981', icon: '✅', text: 'Great recovery scores! Maintain current training intensity.' },
      { type: 'info',    color: '#3B82F6', icon: '💧', text: 'Hydration on track. Keep up with pre-training fluid intake.' },
    );
  }
  return recs;
}

// ─── Player Fitness Profile Card (Rohit Sharma style) ────────────
function PlayerFitnessCard({ user, latestLog, logs, fitnessLabel, fitnessColor, recs, onLog, todayLogged }) {
  const initials  = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();
  const scoreNum  = latestLog
    ? Math.round(((5-latestLog.fatigue) + (5-latestLog.soreness) + latestLog.sleep_quality) / 3 / 5 * 100)
    : null;
  const avail     = scoreNum ?? 80;
  const lastDate  = latestLog
    ? new Date(latestLog.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : 'Not logged';
  const insight   = recs.find(r => r.type !== 'success') || recs[0];

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: 'var(--shadow-md)', marginBottom: 20,
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Left: Avatar column */}
      <div style={{
        width: 170, flexShrink: 0,
        background: 'linear-gradient(160deg, #6366F115 0%, #4F46E510 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '28px 16px',
        borderRight: '1px solid var(--border-subtle)',
        gap: 14,
      }}>
        <div style={{
          width: 112, height: 112, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          border: '4px solid var(--bg-surface)',
          boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 900, color: 'white',
          overflow: 'hidden',
        }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="Player" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>
        {/* Wellness streak */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6366F1' }}>{logs?.length ?? 0}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entries</div>
        </div>
      </div>

      {/* Right: Info */}
      <div style={{ flex: 1, padding: '22px 28px', position: 'relative' }}>

        {/* Fitness badge — top right */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <span style={{
            padding: '5px 16px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 800,
            background: `${fitnessColor}18`, border: `1.5px solid ${fitnessColor}40`,
            color: fitnessColor, letterSpacing: '0.04em',
          }}>
            {fitnessLabel}
          </span>
        </div>

        {/* Academy tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: '1.1rem' }}>🏟️</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
            Sports Academy
          </span>
        </div>

        {/* Name */}
        <h2 style={{ fontWeight: 900, fontSize: '1.55rem', color: 'var(--text-primary)', margin: '0 0 3px' }}>
          {user?.first_name} {user?.last_name}
        </h2>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
          Player · Field Player
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              Last Wellness Log
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {lastDate}
              {latestLog && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>
                  {' '}| Score: {scoreNum}%
                </span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              Next Match Availability
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {avail}%
            </div>
          </div>
        </div>

        {/* AI insight box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.05))',
          border: '1px solid rgba(99,102,241,0.18)',
          borderRadius: 12, padding: '11px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          maxWidth: 540,
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>✨</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {insight
              ? insight.text
              : `Player has logged ${logs?.length ?? 0} wellness entr${(logs?.length ?? 0) === 1 ? 'y' : 'ies'} this season. Keep maintaining the routine for best results.`
            }
          </span>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN HEALTH PAGE
// ─────────────────────────────────────────────────────────────────
const HEALTH_TABS = ['Overview', 'Fitness & Health', 'Training', 'Performance'];

export default function PlayerHealthPage() {
  const user = useAuthStore(s => s.user);
  const [tab,      setTab]      = useState('Fitness & Health');
  const [showLog,  setShowLog]  = useState(false);

  const { data: logs, loading, refetch } = useApi(
    () => healthApi.getLogs({ days: 60 }),
    [], { fallback: [] }
  );

  const latestLog = logs?.[0] ?? null;
  const initials  = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  // Derive health metrics from latest log
  const metrics = useMemo(() => {
    if (!latestLog) return { fatigue: 0, stress: 0, sleep: 0, hydration: 73, injuryRisk: 'Unknown' };
    const fatigue  = Math.round((latestLog.fatigue / 5) * 100);
    const stress   = Math.round((latestLog.soreness / 5) * 100);
    const sleep    = Math.round(((6 - latestLog.sleep_quality) / 5) * 100); // invert: 1=excellent
    const hydration = 73; // demo — could be added to health log form
    const injuryRisk = latestLog.is_flagged ? 'High' : latestLog.soreness >= 4 ? 'High' : latestLog.soreness === 3 ? 'Medium' : 'Low';
    return { fatigue, stress, sleep, hydration, injuryRisk };
  }, [latestLog]);

  const hrData  = useMemo(() => heartRatePath(latestLog?.fatigue ?? 3), [latestLog]);
  const hrBpm   = hrData[hrData.length - 1];
  const recs    = useMemo(() => buildRecommendations(latestLog), [latestLog]);

  const todayLogged = latestLog
    ? new Date(latestLog.logged_at).toDateString() === new Date().toDateString()
    : false;

  // Fitness status label
  const avgScore = latestLog
    ? Math.round(((5 - latestLog.fatigue) + (5 - latestLog.soreness) + latestLog.sleep_quality) / 3 / 5 * 100)
    : null;
  const fitnessLabel = avgScore === null ? 'No Data' : avgScore >= 70 ? 'Fully Fit' : avgScore >= 45 ? 'Moderate' : 'Needs Rest';
  const fitnessColor = avgScore === null ? '#94A3B8' : avgScore >= 70 ? '#10B981' : avgScore >= 45 ? '#F59E0B' : '#EF4444';

  const currentMonth = new Date().getMonth();

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {showLog && (
        <LogModal onClose={() => setShowLog(false)} onSuccess={refetch} />
      )}

      {/* ── Player Profile Banner ──────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1B3E 0%, #1a2d5a 60%, #0D1B3E 100%)',
        borderRadius: 16, padding: '24px 28px',
        display: 'flex', alignItems: 'center', gap: 20,
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', right: -40, top: -40, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(99,102,241,0.08)',
        }}/>
        <div style={{
          position: 'absolute', right: 80, bottom: -60, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(99,102,241,0.05)',
        }}/>

        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          border: '3px solid rgba(99,102,241,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          fontSize: '1.5rem', fontWeight: 900, color: 'white',
          overflow: 'hidden',
        }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', margin: 0 }}>
              {user?.first_name} {user?.last_name}
            </h2>
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800,
              background: `${fitnessColor}25`, border: `1px solid ${fitnessColor}50`,
              color: fitnessColor, letterSpacing: '0.06em',
            }}>
              {fitnessLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
            Player · Sports Academy
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {[
              { label: 'Last Wellness Log', value: latestLog ? new Date(latestLog.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not logged' },
              { label: 'Health Entries', value: `${logs?.length ?? 0} entries` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', marginTop: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Log button */}
        <button
          onClick={() => setShowLog(true)}
          style={{
            padding: '10px 20px', borderRadius: 10, flexShrink: 0,
            background: todayLogged ? 'rgba(16,185,129,0.2)' : '#6366F1',
            border: `1px solid ${todayLogged ? 'rgba(16,185,129,0.4)' : '#4F46E5'}`,
            color: todayLogged ? '#10B981' : 'white',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          {todayLogged ? '✓ Logged Today' : '+ Log Wellness'}
        </button>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '2px solid var(--border-subtle)',
        marginBottom: 24, overflowX: 'auto',
      }}>
        {HEALTH_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: tab === t ? 700 : 500,
              fontSize: '0.875rem', whiteSpace: 'nowrap',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -2, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

          {/* ── Section 1: Today's Readiness ───────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Today's Readiness
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                {
                  label: 'Fatigue', value: latestLog?.fatigue ?? '—', max: 5,
                  color: latestLog ? (latestLog.fatigue <= 2 ? '#10B981' : latestLog.fatigue === 3 ? '#F59E0B' : '#EF4444') : '#94A3B8',
                  desc: 'Energy level (1=best)',
                  icon: '⚡',
                  badge: latestLog ? (latestLog.fatigue <= 2 ? 'Good' : latestLog.fatigue === 3 ? 'Moderate' : 'High') : '—',
                },
                {
                  label: 'Soreness', value: latestLog?.soreness ?? '—', max: 5,
                  color: latestLog ? (latestLog.soreness <= 2 ? '#10B981' : latestLog.soreness === 3 ? '#F59E0B' : '#EF4444') : '#94A3B8',
                  desc: 'Muscle soreness (1=best)',
                  icon: '💪',
                  badge: latestLog ? (latestLog.soreness <= 2 ? 'Low' : latestLog.soreness === 3 ? 'Moderate' : 'High') : '—',
                },
                {
                  label: 'Sleep Quality', value: latestLog?.sleep_quality ?? '—', max: 5,
                  color: latestLog ? (latestLog.sleep_quality <= 2 ? '#10B981' : latestLog.sleep_quality === 3 ? '#F59E0B' : '#EF4444') : '#94A3B8',
                  desc: 'Sleep quality (1=best)',
                  icon: '😴',
                  badge: latestLog ? (latestLog.sleep_quality <= 2 ? 'Good' : latestLog.sleep_quality === 3 ? 'Fair' : 'Poor') : '—',
                },
                {
                  label: 'Wellness Logs', value: logs?.length ?? 0, max: null,
                  color: '#6366F1',
                  desc: 'Last 60 days',
                  icon: '📊',
                  badge: logs?.length >= 20 ? 'Excellent' : logs?.length >= 10 ? 'Good' : 'Building',
                },
              ].map(({ label, value, max, color, desc, icon, badge }) => (
                <div key={label} style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  borderRadius: 14, padding: '18px 20px',
                  boxShadow: 'var(--shadow-sm)',
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${color}15`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.9rem',
                    }}>{icon}</div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700,
                      background: `${color}15`, color,
                    }}>{badge}</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>
                    {value}{max && <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{max}</span>}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{desc}</div>
                  {latestLog && max && (
                    <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${(value/max)*100}%`, background: color, transition: 'width 1s ease' }}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 2: Health overview 2-col ────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* Key health metrics card — all values from latestLog, no hardcoded data */}
            <div style={{ ...card }}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={cardTitle}>Health Metrics</div>
                  <div style={cardSub}>
                    {latestLog
                      ? `From wellness log · ${new Date(latestLog.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      : 'Log today\'s wellness to see metrics'}
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(latestLog
                  ? (() => {
                      // (5-x)/4*100 → 1=best gives 100%, 5=worst gives 0%
                      const e = Math.round((5 - latestLog.fatigue)       / 4 * 100);
                      const r = Math.round((5 - latestLog.soreness)      / 4 * 100);
                      const s = Math.round((5 - latestLog.sleep_quality) / 4 * 100);
                      const o = Math.round((e + r + s) / 3);
                      return [
                        { label: 'Overall Wellness', pct: o, color: scoreColor(o), icon: '💪', desc: 'Combined score' },
                        { label: 'Energy Level',     pct: e, color: scoreColor(e), icon: '⚡', desc: `Fatigue logged: ${latestLog.fatigue}/5` },
                        { label: 'Recovery Status',  pct: r, color: scoreColor(r), icon: '🔄', desc: `Soreness logged: ${latestLog.soreness}/5` },
                        { label: 'Sleep Quality',    pct: s, color: scoreColor(s), icon: '😴', desc: `Sleep logged: ${latestLog.sleep_quality}/5` },
                      ];
                    })()
                  : [
                      { label: 'Overall Wellness', pct: 0, color: '#94A3B8', icon: '💪', desc: 'Log wellness to unlock' },
                      { label: 'Energy Level',     pct: 0, color: '#94A3B8', icon: '⚡', desc: 'Log wellness to unlock' },
                      { label: 'Recovery Status',  pct: 0, color: '#94A3B8', icon: '🔄', desc: 'Log wellness to unlock' },
                      { label: 'Sleep Quality',    pct: 0, color: '#94A3B8', icon: '😴', desc: 'Log wellness to unlock' },
                    ]
                ).map(({ label, pct, color, icon, desc }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                        <div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 6 }}>{desc}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: 'width 1.2s ease' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI recommendations */}
            <div style={{ ...card }}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={cardTitle}>AI Recommendations</div>
                  <div style={cardSub}>Based on your data</div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 800,
                  background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>AI</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recs.map((rec, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: `${rec.color}0D`, border: `1px solid ${rec.color}25`,
                  }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>{rec.icon}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 3: Recent trend + injury risk ───────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20 }}>

            {/* Trend */}
            <div style={{ ...card }}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={cardTitle}>Wellness Trend</div>
                  <div style={cardSub}>Last {Math.min(logs?.length ?? 0, 5)} entries</div>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {logs && logs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'fatigue',       label: 'Fatigue',  color: '#EF4444', invert: true },
                      { key: 'soreness',      label: 'Soreness', color: '#F59E0B', invert: true },
                      { key: 'sleep_quality', label: 'Sleep',    color: '#6366F1', invert: false },
                    ].map(({ key, label, color, invert }) => {
                      const entries = [...(logs || [])].reverse().slice(-5);
                      const vals = entries.map(l => invert ? (6 - l[key]) : l[key]);
                      const W = 320, H = 36;
                      const maxV = 5, minV = 0;
                      const pts = vals.map((v, i) => ({
                        x: (i / Math.max(vals.length - 1, 1)) * W,
                        y: 4 + ((maxV - v) / (maxV - minV)) * (H - 8),
                      }));
                      const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
                      return (
                        <div key={key}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color }}>
                              {vals[vals.length - 1]}/5
                            </span>
                          </div>
                          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
                            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            {pts.map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} opacity="0.85"/>
                            ))}
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📈</div>
                    <div style={{ fontSize: '0.78rem' }}>No entries yet — start logging to see trends</div>
                  </div>
                )}
              </div>
            </div>

            {/* Injury risk + season goals compact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 200 }}>
              {/* Injury risk */}
              <div style={{
                ...card,
                padding: '18px 16px', textAlign: 'center', flex: 1,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px',
                  background: `linear-gradient(135deg, ${
                    metrics.injuryRisk === 'High' ? '#FEF2F2' :
                    metrics.injuryRisk === 'Medium' ? '#FFFBEB' : '#ECFDF5'}, var(--bg-elevated))`,
                  border: `3px solid ${
                    metrics.injuryRisk === 'High' ? '#FECACA' :
                    metrics.injuryRisk === 'Medium' ? '#FDE68A' : '#A7F3D0'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 1,
                }}>
                  <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>
                    {metrics.injuryRisk === 'High' ? '🚨' : metrics.injuryRisk === 'Medium' ? '⚠️' : '🛡️'}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>Injury Risk</div>
                <span style={{
                  display: 'inline-block', marginTop: 4,
                  padding: '2px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800,
                  background: metrics.injuryRisk === 'High' ? 'rgba(239,68,68,0.1)' : metrics.injuryRisk === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  color: metrics.injuryRisk === 'High' ? '#EF4444' : metrics.injuryRisk === 'Medium' ? '#F59E0B' : '#10B981',
                }}>
                  {metrics.injuryRisk === 'Unknown' ? 'N/A' : metrics.injuryRisk}
                </span>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>AI Prediction</div>
              </div>

              {/* Calendar indicator */}
              <div style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  {logs?.length ?? 0} / 30
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Season logs</div>
                <div style={{ marginTop: 8, height: 5, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, ((logs?.length ?? 0)/30)*100)}%`, background: '#6366F1' }}/>
                </div>
              </div>
            </div>
          </div>

          {/* ── Log today prompt ─────────────────────────────────── */}
          {!todayLogged && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.04))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 14, padding: '20px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Log your wellness today</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Track fatigue, soreness, and sleep to get personalised recommendations.
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowLog(true)}>Log Now</button>
            </div>
          )}

        </div>
      )}

      {/* ── Fitness & Health Tab ─────────────────────────────── */}
      {tab === 'Fitness & Health' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

          {/* Player Fitness Profile Card */}
          <PlayerFitnessCard
            user={user}
            latestLog={latestLog}
            logs={logs}
            fitnessLabel={fitnessLabel}
            fitnessColor={fitnessColor}
            recs={recs}
            todayLogged={todayLogged}
          />

          {!latestLog && !loading && (
            <div style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                No wellness data yet. Log your first entry to personalise these widgets.
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLog(true)}>Log Now</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

            {/* ── Left column ─────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Key Health Summary */}
              <div style={card}>
                <div style={cardHdr}>
                  <div>
                    <div style={cardTitle}>Key Health Summary</div>
                    <div style={cardSub}>
                      {latestLog
                        ? `Based on wellness log · ${new Date(latestLog.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Log your wellness to see live data'}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <CircularGauge
                      pct={metrics.hydration}
                      color="#3B82F6"
                      label="Hydration Level"
                      status={metrics.hydration >= 70 ? 'Good' : metrics.hydration >= 50 ? 'Medium' : 'Low'}
                    />
                    <CircularGauge
                      pct={metrics.stress}
                      color={scoreColor(100 - metrics.stress)}
                      label="Stress Index"
                      status={metrics.stress >= 70 ? 'High' : metrics.stress >= 40 ? 'Moderate' : 'Low'}
                      note={latestLog ? null : 'Demo'}
                    />
                    <CircularGauge
                      pct={metrics.fatigue}
                      color={scoreColor(100 - metrics.fatigue)}
                      label="Fatigue Score"
                      status={metrics.fatigue >= 70 ? 'High' : metrics.fatigue >= 40 ? 'Needs Recovery' : 'Low'}
                      note={latestLog ? null : 'Demo'}
                    />
                    {/* Injury Risk — different styling */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 110, height: 110, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${
                          metrics.injuryRisk === 'High' ? '#FEF2F2' :
                          metrics.injuryRisk === 'Medium' ? '#FFFBEB' : '#ECFDF5'}
                          , var(--bg-elevated))`,
                        border: `3px solid ${
                          metrics.injuryRisk === 'High' ? '#FECACA' :
                          metrics.injuryRisk === 'Medium' ? '#FDE68A' : '#A7F3D0'}`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}>
                        <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>
                          {metrics.injuryRisk === 'High' ? '🚨' : metrics.injuryRisk === 'Medium' ? '⚠️' : '🛡️'}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: metrics.injuryRisk === 'High' ? '#EF4444' :
                                 metrics.injuryRisk === 'Medium' ? '#F59E0B' : '#10B981',
                        }}>
                          {metrics.injuryRisk}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>Injury Risk</div>
                        <span style={{
                          display: 'inline-block', marginTop: 3,
                          padding: '1px 8px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                          background: 'rgba(99,102,241,0.1)', color: 'var(--accent)',
                        }}>
                          AI Prediction
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Overall message */}
                  {latestLog && (
                    <div style={{
                      marginTop: 16, padding: '10px 14px', borderRadius: 10,
                      background: `${fitnessColor}10`, border: `1px solid ${fitnessColor}25`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: '1rem' }}>
                        {fitnessColor === '#10B981' ? '💪' : fitnessColor === '#F59E0B' ? '⚡' : '😴'}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {fitnessLabel === 'Fully Fit'
                          ? 'Player has shown good recovery. Maintain current training pace.'
                          : fitnessLabel === 'Moderate'
                          ? `Moderate fatigue detected over the past ${logs?.length} days. Recommend lighter training today.`
                          : 'Flagged recovery indicators. Rest recommended before next training session.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Heart Rate + Sleep row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Heart Rate */}
                <div style={card}>
                  <div style={{ padding: '16px 20px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={cardTitle}>Heart Rate</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          Last 24 hours · Simulated
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#EF4444', lineHeight: 1 }}>{hrBpm}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>bpm avg</div>
                      </div>
                    </div>
                    <HeartRateSparkline data={hrData} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      {[
                        { label: 'Resting', value: `${Math.min(...hrData)} bpm` },
                        { label: 'Peak',    value: `${Math.max(...hrData)} bpm` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sleep */}
                <div style={card}>
                  <div style={{ padding: '16px 20px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={cardTitle}>Sleep Periodic</div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                        borderRadius: 99, background: 'var(--accent-subtle)', color: 'var(--accent)',
                      }}>Monthly</span>
                    </div>
                    <SleepBars highlight={currentMonth} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      {[
                        { label: 'Avg Sleep',  value: `${latestLog?.sleep_quality === 1 ? '8.1' : latestLog?.sleep_quality === 2 ? '7.3' : latestLog?.sleep_quality === 3 ? '6.8' : latestLog?.sleep_quality === 4 ? '5.9' : '5.1'}h` || '7.2h' },
                        { label: 'Recovery',   value: `${metrics.sleep >= 60 ? 'Good' : metrics.sleep >= 30 ? 'Fair' : 'Poor'}` },
                      ].map(({ label, value }) => (
                        <div key={label} style={{
                          background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement Intensity */}
              <div style={card}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={cardTitle}>Movement Intensity / Load</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>Based on recent training activity</div>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                      background: metrics.fatigue >= 70 ? 'rgba(239,68,68,0.12)' : metrics.fatigue >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                      color: metrics.fatigue >= 70 ? '#EF4444' : metrics.fatigue >= 40 ? '#F59E0B' : '#10B981',
                    }}>
                      {metrics.fatigue >= 70 ? 'High' : metrics.fatigue >= 40 ? 'Moderate' : 'Low'}
                    </span>
                  </div>

                  {[
                    { label: 'Sprint Load',    pct: Math.max(10, 100 - metrics.fatigue * 1.2), color: '#6366F1' },
                    { label: 'Cardio',         pct: Math.max(20, 95 - metrics.stress * 0.8),  color: '#3B82F6' },
                    { label: 'Strength',       pct: Math.max(15, 90 - metrics.stress),         color: '#10B981' },
                    { label: 'Recovery Score', pct: Math.max(10, 100 - metrics.fatigue),       color: '#F59E0B' },
                  ].map(({ label, pct, color }) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{Math.round(pct)}%</span>
                      </div>
                      <div style={{
                        height: 7, borderRadius: 99,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 99, width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                          transition: 'width 1s ease',
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right column ─────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* AI Recommendations */}
              <div style={card}>
                <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={cardTitle}>AI Recommendations</div>
                    <div style={cardSub}>Personalised insights</div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 800,
                    background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>AI</span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recs.map((rec, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: `${rec.color}0D`,
                      border: `1px solid ${rec.color}25`,
                    }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{rec.icon}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {rec.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health Calendar */}
              <div style={card}>
                <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={cardTitle}>Health Calendar</div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <MiniCalendar logs={logs || []} />
                </div>
              </div>

              {/* Injury / Flagged History */}
              <div style={card}>
                <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={cardTitle}>Health Flags</div>
                    <div style={cardSub}>Flagged wellness entries</div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(logs || []).filter(l => l.is_flagged).slice(0, 3).map(l => (
                    <div key={l.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem',
                      }}>🚨</div>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Flagged Entry — F:{l.fatigue} S:{l.soreness}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          {new Date(l.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!(logs || []).some(l => l.is_flagged) && (
                    <div style={{
                      textAlign: 'center', padding: '16px 0',
                      fontSize: '0.82rem', color: 'var(--text-muted)',
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🛡️</div>
                      No health flags — keep it up!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Training Tab ─────────────────────────────────────── */}
      {tab === 'Training' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Weekly Training Load */}
          <div style={card}>
            <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={cardTitle}>Weekly Training Load</div>
                <div style={cardSub}>Intensity across training zones</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
                background: 'rgba(99,102,241,0.1)', color: 'var(--accent)',
              }}>This Week</span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {[
                { day: 'Mon', load: 72, type: 'Strength', color: '#6366F1' },
                { day: 'Tue', load: 55, type: 'Cardio',   color: '#3B82F6' },
                { day: 'Wed', load: 20, type: 'Rest',     color: '#94A3B8' },
                { day: 'Thu', load: 88, type: 'Sprint',   color: '#EF4444' },
                { day: 'Fri', load: 65, type: 'Tactical', color: '#10B981' },
                { day: 'Sat', load: 90, type: 'Match',    color: '#F59E0B' },
                { day: 'Sun', load: 15, type: 'Recovery', color: '#94A3B8' },
              ].map(({ day, load, type, color }) => (
                <div key={day} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
                    <span style={{ width: 32, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{day}</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${load}%`, borderRadius: 99,
                        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                        transition: 'width 1.2s ease',
                      }} />
                    </div>
                    <span style={{ width: 28, fontSize: '0.75rem', fontWeight: 700, color, textAlign: 'right' }}>{load}</span>
                    <span style={{
                      width: 68, fontSize: '0.68rem', fontWeight: 600,
                      padding: '2px 7px', borderRadius: 99,
                      background: `${color}15`, color, textAlign: 'center',
                    }}>{type}</span>
                  </div>
                </div>
              ))}
              <div style={{
                display: 'flex', gap: 16, marginTop: 16, padding: '12px 16px',
                background: 'var(--bg-elevated)', borderRadius: 10,
                border: '1px solid var(--border-subtle)',
              }}>
                {[
                  { label: 'Total Load', value: '405', unit: 'AU' },
                  { label: 'Avg Intensity', value: '58', unit: '%' },
                  { label: 'Sessions', value: '5', unit: 'days' },
                  { label: 'Rest Days', value: '2', unit: 'days' },
                ].map(({ label, value, unit }) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {value}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 2 }}>{unit}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Training Zones + Body Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Training Zones */}
            <div style={card}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={cardTitle}>Heart Rate Zones</div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { zone: 'Zone 5 — Max',          pct: 12, range: '185+ bpm', color: '#EF4444' },
                  { zone: 'Zone 4 — Threshold',    pct: 28, range: '165–185',  color: '#F59E0B' },
                  { zone: 'Zone 3 — Aerobic',      pct: 35, range: '145–165',  color: '#10B981' },
                  { zone: 'Zone 2 — Fat Burn',     pct: 18, range: '125–145',  color: '#3B82F6' },
                  { zone: 'Zone 1 — Recovery',     pct: 7,  range: '< 125',    color: '#6366F1' },
                ].map(({ zone, pct, range, color }) => (
                  <div key={zone}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{zone}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{range} · <b style={{ color }}>{pct}%</b></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Muscle Group Focus */}
            <div style={card}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={cardTitle}>Muscle Group Focus</div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { group: 'Legs & Glutes',   load: latestLog ? Math.max(20, 100 - metrics.fatigue) : 75,  color: '#6366F1' },
                  { group: 'Core & Stability', load: latestLog ? Math.max(30, 95 - metrics.stress * 0.6) : 68, color: '#10B981' },
                  { group: 'Upper Body',       load: latestLog ? Math.max(25, 85 - metrics.stress * 0.4) : 55, color: '#3B82F6' },
                  { group: 'Cardiovascular',   load: latestLog ? Math.max(35, 90 - metrics.fatigue * 0.5) : 82, color: '#EF4444' },
                  { group: 'Flexibility',      load: latestLog ? Math.max(40, 70 - metrics.soreness * 5) : 45, color: '#F59E0B' },
                ].map(({ group, load, color }) => (
                  <div key={group}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{group}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{Math.round(load)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(load)}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recovery Protocol */}
          <div style={card}>
            <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={cardTitle}>Recovery Protocols</div>
                <div style={cardSub}>Recommended based on your current load</div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { icon: '🧊', title: 'Ice Bath',     duration: '12–15 min', status: 'Recommended', color: '#3B82F6', note: 'Post high-intensity day' },
                { icon: '💤', title: 'Sleep Target', duration: '8–9 hours', status: 'Priority',     color: '#6366F1', note: 'Deep sleep > REM ratio' },
                { icon: '💧', title: 'Hydration',    duration: '3.5 L/day', status: 'On Track',     color: '#10B981', note: 'Electrolytes after sprint' },
                { icon: '🧘', title: 'Stretching',   duration: '20 min',    status: 'Daily',        color: '#F59E0B', note: 'Focus on hip flexors' },
              ].map(({ icon, title, duration, status, color, note }) => (
                <div key={title} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: `${color}08`, border: `1px solid ${color}20`,
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{title}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color, marginTop: 2 }}>{duration}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{note}</div>
                  <span style={{
                    display: 'inline-block', marginTop: 8,
                    padding: '2px 8px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700,
                    background: `${color}18`, color,
                  }}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Performance Tab ───────────────────────────────────── */}
      {tab === 'Performance' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Performance Score */}
          <div style={{
            background: 'linear-gradient(135deg, #0D1B3E, #1a2d5a)',
            borderRadius: 16, padding: '24px 28px',
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 20, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                Overall Performance Rating
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                {latestLog ? Math.round(((5 - latestLog.fatigue) + (5 - latestLog.soreness) + latestLog.sleep_quality) / 15 * 100) : 74}
                <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/100</span>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                {latestLog ? 'Based on your latest wellness data' : 'Log wellness data to personalise'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Fitness', value: latestLog ? Math.round((5 - latestLog.fatigue) / 5 * 100) : 78, color: '#10B981' },
                { label: 'Recovery', value: latestLog ? Math.round((5 - latestLog.soreness) / 5 * 100) : 65, color: '#6366F1' },
                { label: 'Readiness', value: latestLog ? Math.round(latestLog.sleep_quality / 5 * 100) : 80, color: '#F59E0B' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <CircularGauge pct={value} color={color} label={label} size={90} />
                </div>
              ))}
            </div>
          </div>

          {/* Athlete Profile Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { label: 'Speed Rating',    value: '87',  unit: '/100', color: '#EF4444', icon: '⚡', trend: '+3 this month' },
              { label: 'Endurance',       value: '74',  unit: '/100', color: '#3B82F6', icon: '🫁', trend: '+5 this month' },
              { label: 'Strength Index',  value: '81',  unit: '/100', color: '#F59E0B', icon: '💪', trend: '+2 this month' },
              { label: 'Agility Score',   value: '79',  unit: '/100', color: '#10B981', icon: '🏃', trend: 'Stable' },
            ].map(({ label, value, unit, color, icon, trend }) => (
              <div key={label} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 14, padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: `${color}15`, color,
                  }}>{trend}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color }}>
                  {value}<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>{unit}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Progress Over Time */}
          <div style={card}>
            <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={cardTitle}>Wellness Trend — Last 7 Entries</div>
                <div style={cardSub}>Fatigue · Soreness · Sleep quality over time</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {logs && logs.length > 0 ? (
                <div>
                  {[
                    { key: 'fatigue',       label: 'Fatigue',       color: '#EF4444', invert: true },
                    { key: 'soreness',      label: 'Soreness',      color: '#F59E0B', invert: true },
                    { key: 'sleep_quality', label: 'Sleep Quality', color: '#6366F1', invert: false },
                  ].map(({ key, label, color, invert }) => {
                    const entries = [...(logs || [])].reverse().slice(-7);
                    const vals    = entries.map(l => invert ? (6 - l[key]) : l[key]);
                    const maxV    = 5;
                    const minV    = 0;
                    const W = 500, H = 60;
                    const pts = vals.map((v, i) => ({
                      x: (i / Math.max(vals.length - 1, 1)) * W,
                      y: 4 + ((maxV - v) / (maxV - minV)) * (H - 8),
                    }));
                    const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
                    const fillPath = `${linePath} L${W},${H} L0,${H} Z`;
                    const uid = `tr-${key}`;
                    return (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
                          <span style={{ fontSize: '0.72rem', color, fontWeight: 700 }}>
                            {vals[vals.length - 1]}/5 {invert ? '(higher = better)' : ''}
                          </span>
                        </div>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
                              <stop offset="100%" stopColor={color} stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d={fillPath} fill={`url(#${uid})`}/>
                          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          {pts.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} opacity="0.8"/>
                          ))}
                        </svg>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                    Showing last {Math.min(logs.length, 7)} entries · Latest on right
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📈</div>
                  <div style={{ fontWeight: 600 }}>No entries yet</div>
                  <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Log wellness data to see your trend charts</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowLog(true)} style={{ marginTop: 14 }}>
                    Log Wellness Now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Comparison + Goals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={card}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={cardTitle}>Position Benchmark</div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'vs. Team Average',  you: 81, avg: 74, color: '#10B981' },
                  { label: 'vs. Academy Best',  you: 81, avg: 94, color: '#6366F1' },
                  { label: 'vs. Position Avg',  you: 81, avg: 79, color: '#F59E0B' },
                ].map(({ label, you, avg, color }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: you >= avg ? '#10B981' : '#F59E0B' }}>
                        {you >= avg ? `+${you - avg}` : `${you - avg}`} pts
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ flex: you, height: 8, borderRadius: '99px 0 0 99px', background: color }} />
                      <div style={{ flex: Math.max(0, 100 - you - avg + you), height: 8, background: 'var(--bg-elevated)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: '0.65rem', color, fontWeight: 700 }}>You: {you}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ref: {avg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ ...cardHdr, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={cardTitle}>Season Goals</div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { goal: 'Zero injury flags',    done: !(logs||[]).some(l => l.is_flagged), color: '#10B981' },
                  { goal: '30+ wellness logs',    done: (logs||[]).length >= 30,               color: '#6366F1' },
                  { goal: 'Avg fatigue < 3',      done: latestLog ? latestLog.fatigue <= 3 : false, color: '#F59E0B' },
                  { goal: 'Consistent sleep 1–2', done: latestLog ? latestLog.sleep_quality <= 2 : false, color: '#3B82F6' },
                ].map(({ goal, done, color }) => (
                  <div key={goal} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: done ? `${color}10` : 'var(--bg-elevated)',
                    border: `1px solid ${done ? `${color}30` : 'var(--border-subtle)'}`,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: done ? color : 'var(--bg-overlay)',
                      border: `2px solid ${done ? color : 'var(--border-default)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 600 : 400 }}>
                      {goal}
                    </span>
                    {done && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color, fontWeight: 700 }}>Done</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────
const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 14, overflow: 'hidden',
  boxShadow: 'var(--shadow-sm)',
};
const cardHdr = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px',
  background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
};
const cardTitle = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' };
const cardSub   = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 };
