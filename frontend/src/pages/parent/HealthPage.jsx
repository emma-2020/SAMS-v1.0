// src/pages/parent/HealthPage.jsx — read-only wellness monitoring for parents
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi }    from '../../hooks/useApi';
import { healthApi } from '../../services/health.api';

const AMBER  = '#D97706';
const AMBER2 = '#B45309';

const CSS = `
  @keyframes alertPulse {
    0%   { box-shadow: 0 0 0 0    rgba(239,68,68,0.5); }
    70%  { box-shadow: 0 0 0 16px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0    rgba(239,68,68,0); }
  }
  @keyframes tabSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: 'var(--shadow-sm)',
};
const cardHdr = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px',
  background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
  borderBottom: '1px solid var(--border-subtle)',
};
const cardT = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' };
const cardS = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 };

function scoreColor(pct) {
  if (pct >= 70) return '#10B981';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}
function hexRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(',');
}

function NeonMeter({ pct, color, label, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
          {sub && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sub}</span>}
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color, padding: '1px 9px', borderRadius: 99, background: `${color}14`, border: `1px solid ${color}28` }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg,${color}cc,${color})`, boxShadow: `0 0 8px ${color}55`, transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

function TrendLine({ values, color, label, badge }) {
  if (!values || values.length < 2) return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>—</span>
      </div>
      <div style={{ height: 28, background: 'var(--bg-elevated)', borderRadius: 6 }} />
    </div>
  );
  const W = 400, H = 32;
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * W, y: 4 + ((5 - v) / 4) * (H - 8) }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = `${line} L${W},${H} L0,${H} Z`;
  const uid  = `tl-${label.replace(/\W/g, '')}`;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color, padding: '1px 8px', borderRadius: 99, background: `${color}14` }}>{badge}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#${uid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={color} opacity={i === pts.length - 1 ? 1 : 0.7}
            style={i === pts.length - 1 ? { filter: `drop-shadow(0 0 3px ${color})` } : {}} />
        ))}
      </svg>
    </div>
  );
}

function InsightCard({ type, color, icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', borderRadius: 12, background: `rgba(${hexRgb(color)},0.06)`, border: `1px solid rgba(${hexRgb(color)},0.2)` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${color}16`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>{icon}</div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <span style={{ display: 'inline-block', marginBottom: 4, padding: '1px 7px', borderRadius: 99, fontSize: '0.58rem', fontWeight: 800, background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{type}</span>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{text}</div>
      </div>
    </div>
  );
}

function MiniCal({ logs }) {
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay = new Date(y, mo, 1).getDay(), daysCount = new Date(y, mo + 1, 0).getDate(), today = now.getDate();
  const logged = new Set((logs || []).map(l => {
    const d = new Date(l.logged_at);
    return d.getMonth() === mo && d.getFullYear() === y ? d.getDate() : null;
  }).filter(Boolean));
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysCount }, (_, i) => i + 1)];
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 8 }}>{MONTHS[mo]} {y}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', paddingBottom: 3 }}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isToday = day === today, hasLog = logged.has(day);
          return (
            <div key={day} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: isToday ? 800 : 500, padding: '3px 0', borderRadius: 5, background: isToday ? AMBER : hasLog ? 'rgba(16,185,129,0.12)' : 'transparent', color: isToday ? 'white' : day < today ? 'var(--text-secondary)' : 'var(--text-muted)', border: hasLog && !isToday ? '1px solid rgba(16,185,129,0.22)' : '1px solid transparent' }}>{day}</div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {[{ c: '#10B981', l: 'Logged' }, { c: AMBER, l: 'Today' }].map(({ c, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildInsights(log) {
  if (!log) return [{ type: 'Info', color: '#3B82F6', icon: '💡', text: 'No recent wellness data available. Your child has not yet submitted a check-in.' }];
  const ins = [];
  if (log.soreness >= 4)       ins.push({ type: 'Alert',   color: '#EF4444', icon: '🦵', text: 'High muscle soreness reported. Consider reducing training intensity or requesting a physio assessment.' });
  else if (log.soreness === 3) ins.push({ type: 'Warning', color: '#F59E0B', icon: '🔄', text: 'Moderate soreness noted. A recovery session this week would help prevent a fatigue spike.' });
  if (log.sleep_quality >= 4)  ins.push({ type: 'Alert',   color: '#EF4444', icon: '😴', text: 'Poor sleep quality logged. Ensure your child gets 8–9 hours of sleep each night.' });
  else if (log.sleep_quality === 3) ins.push({ type: 'Warning', color: '#F59E0B', icon: '🌙', text: 'Below-average sleep reported. Prioritise a consistent bedtime routine.' });
  if (log.fatigue >= 4)        ins.push({ type: 'Warning', color: '#F59E0B', icon: '⚡', text: 'High fatigue detected. Speak with the coaching staff about workload management.' });
  if (!ins.length) ins.push(
    { type: 'Good', color: '#10B981', icon: '✅', text: "Your child's wellness looks great! All indicators are within healthy range." },
    { type: 'Info', color: '#3B82F6', icon: '💧', text: 'Encourage regular hydration and pre-training warm-ups for best performance.' },
  );
  return ins;
}

const TABS = ['Overview', 'Wellness Trends', 'Log History'];

export default function ParentHealthPage() {
  const navigate   = useNavigate();
  const [tab, setTab] = useState('Overview');

  const { data: logs = [], loading } = useApi(
    () => healthApi.getLogs({ days: 60 }),
    [], { fallback: [] }
  );
  const { data: alerts = [] } = useApi(
    () => healthApi.getAlerts().catch(() => []),
    [], { fallback: [] }
  );

  const latestLog = logs[0] ?? null;
  const flagged   = latestLog?.is_flagged || latestLog?.soreness >= 4 || latestLog?.fatigue >= 4 || latestLog?.sleep_quality >= 4;

  const m = useMemo(() => {
    if (!latestLog) return { energy: 0, recovery: 0, sleep: 0, overall: 0 };
    const energy   = Math.round(((5 - latestLog.fatigue)       / 4) * 100);
    const recovery = Math.round(((5 - latestLog.soreness)      / 4) * 100);
    const sleep    = Math.round(((5 - latestLog.sleep_quality) / 4) * 100);
    const overall  = Math.round((energy + recovery + sleep) / 3);
    return { energy, recovery, sleep, overall };
  }, [latestLog]);

  const insights = useMemo(() => buildInsights(latestLog), [latestLog]);
  const trend    = useMemo(() => [...logs].reverse().slice(-7), [logs]);

  const avgScore = logs.length
    ? Math.round(logs.reduce((a, l) => a + Math.round(((5 - l.fatigue) + (5 - l.soreness) + (5 - l.sleep_quality)) / 3 / 4 * 100), 0) / logs.length)
    : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── BANNER ─────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${AMBER2} 0%, ${AMBER} 65%, #FCD34D 100%)`,
        borderRadius: 16, padding: '24px 28px', marginBottom: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div>
          <div style={{
            display: 'inline-block', marginBottom: 10,
            padding: '2px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)',
          }}>Parent Portal</div>

          <div style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', marginBottom: 4 }}>
            Child's Health & Wellness
          </div>
          <p style={{ color: 'rgba(255,255,255,0.65)', margin: '0 0 12px', fontSize: '0.82rem' }}>
            Real-time wellness monitoring · {logs.length} check-ins recorded
          </p>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { label: 'Overall Score', value: latestLog ? `${m.overall}%` : '—',  color: latestLog ? scoreColor(m.overall) : 'rgba(255,255,255,0.5)' },
              { label: 'Alerts',        value: String(alerts.length),               color: alerts.length ? '#FCA5A5' : 'rgba(255,255,255,0.75)' },
              { label: 'Check-ins',     value: String(logs.length),                 color: 'rgba(255,255,255,0.9)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color }}>{value}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {alerts.length > 0 && (
          <div style={{
            padding: '12px 18px', borderRadius: 12,
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
            textAlign: 'center', animation: 'alertPulse 2.5s infinite',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#FCA5A5' }}>
              {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Needs attention</div>
          </div>
        )}
      </div>

      {/* ── FLAGGED ALERT BANNER ────────────────────────────────── */}
      {flagged && (
        <div style={{
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🚨</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#EF4444' }}>Wellness flags detected</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                Your child's latest check-in has one or more elevated metrics. Review below or message the coach.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/parent/chat')}
            style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}
          >
            Message Coach
          </button>
        </div>
      )}

      {/* ── TAB BAR ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: t === tab ? 700 : 500, fontSize: '0.875rem', whiteSpace: 'nowrap',
            color: t === tab ? AMBER : 'var(--text-muted)',
            borderBottom: `2px solid ${t === tab ? AMBER : 'transparent'}`,
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* ════════ OVERVIEW ════════════════════════════════════════ */}
      {tab === 'Overview' && (
        <div style={{ animation: 'tabSlideIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            {[
              { label: 'Overall Score', value: latestLog ? `${m.overall}%` : '—', color: latestLog ? scoreColor(m.overall) : '#94A3B8', icon: '💪', desc: 'Combined wellness' },
              { label: 'Energy',        value: latestLog ? `${m.energy}%`  : '—', color: scoreColor(m.energy),   icon: '⚡', desc: 'Fatigue inverted'  },
              { label: 'Recovery',      value: latestLog ? `${m.recovery}%`: '—', color: scoreColor(m.recovery), icon: '🔄', desc: 'Soreness inverted' },
              { label: 'Sleep',         value: latestLog ? `${m.sleep}%`   : '—', color: scoreColor(m.sleep),    icon: '😴', desc: 'Sleep quality'     },
            ].map(({ label, value, color, icon, desc }) => (
              <div key={label} style={{ ...card, padding: '18px 16px', borderLeft: `3px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{icon}</div>
                  <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, background: `${color}14`, color }}>{value}</span>
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

            {/* Health Metrics */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Child's Health Metrics</div>
                  <div style={cardS}>{latestLog ? `From latest check-in · ${new Date(latestLog.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No check-in data yet'}</div>
                </div>
                <svg viewBox="0 0 44 44" width={44} height={44}>
                  <circle cx={22} cy={22} r={18} fill="none" stroke="var(--bg-elevated)" strokeWidth={5} />
                  <circle cx={22} cy={22} r={18} fill="none" stroke={scoreColor(m.overall)} strokeWidth={5}
                    strokeDasharray={`${(m.overall / 100) * 113} 113`} strokeLinecap="round" transform="rotate(-90 22 22)"
                    style={{ transition: 'stroke-dasharray 1.4s ease', filter: `drop-shadow(0 0 3px ${scoreColor(m.overall)}80)` }} />
                  <text x={22} y={26} textAnchor="middle" fontSize={10} fontWeight="800" fill={scoreColor(m.overall)}>{m.overall}%</text>
                </svg>
              </div>
              <div style={{ padding: '18px 20px' }}>
                <NeonMeter pct={m.overall}  color={scoreColor(m.overall)}  label="Overall Wellness" />
                <NeonMeter pct={m.energy}   color={scoreColor(m.energy)}   label="Energy Level"     sub={latestLog ? `Fatigue: ${latestLog.fatigue}/5` : undefined} />
                <NeonMeter pct={m.recovery} color={scoreColor(m.recovery)} label="Recovery"         sub={latestLog ? `Soreness: ${latestLog.soreness}/5` : undefined} />
                <NeonMeter pct={m.sleep}    color={scoreColor(m.sleep)}    label="Sleep Quality"    sub={latestLog ? `Score: ${latestLog.sleep_quality}/5` : undefined} />
                {!latestLog && (
                  <div style={{ textAlign: 'center', padding: '12px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Metrics will appear once your child submits a wellness check-in.
                  </div>
                )}
              </div>
            </div>

            {/* Parent Insights */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Health Insights</div>
                  <div style={cardS}>Based on your child's latest data</div>
                </div>
                <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 800, background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}30`, letterSpacing: '0.1em' }}>Parent View</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            </div>
          </div>

          {/* Recent alerts */}
          {alerts.length > 0 && (
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Active Wellness Alerts</div>
                  <div style={cardS}>{alerts.length} alert{alerts.length > 1 ? 's' : ''} requiring attention</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ padding: '0 0 4px' }}>
                {alerts.map((a, i) => {
                  const score = a.overall_score ?? Math.round(((5 - (a.fatigue ?? 3)) + (5 - (a.soreness ?? 3)) + (5 - (a.sleep_quality ?? 3))) / 3 / 4 * 100);
                  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={a.id ?? i} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Wellness Score: {score}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(a.submitted_at ?? a.logged_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        {a.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                            "{a.notes}"
                          </div>
                        )}
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: `${color}14`, color, border: `1px solid ${color}28` }}>
                        {score >= 70 ? 'Good' : score >= 40 ? 'Moderate' : 'Low'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact CTA */}
          <div style={{
            borderRadius: 14, padding: '20px 24px',
            background: `linear-gradient(135deg, rgba(217,119,6,0.07), rgba(180,83,9,0.04))`,
            border: `1px solid rgba(217,119,6,0.18)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Have questions about your child's health?
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                Message the coaching staff directly to discuss your child's wellness data.
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/parent/chat')}
              style={{ padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, background: `linear-gradient(135deg, ${AMBER2}, ${AMBER})`, color: 'white', border: 'none', boxShadow: `0 4px 14px rgba(217,119,6,0.3)` }}
            >
              Message Coach
            </button>
          </div>
        </div>
      )}

      {/* ════════ WELLNESS TRENDS ═════════════════════════════════ */}
      {tab === 'Wellness Trends' && (
        <div style={{ animation: 'tabSlideIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 256px', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div style={card}>
                <div style={cardHdr}>
                  <div>
                    <div style={cardT}>Wellness Trend</div>
                    <div style={cardS}>Last {trend.length} check-ins</div>
                  </div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {trend.length >= 2 ? (
                    <>
                      <TrendLine values={trend.map(e => 6 - e.fatigue)}       color="#10B981" label="Energy (Fatigue)"   badge={latestLog ? `${latestLog.fatigue}/5` : '—'} />
                      <TrendLine values={trend.map(e => 6 - e.soreness)}      color="#F59E0B" label="Recovery (Soreness)" badge={latestLog ? `${latestLog.soreness}/5` : '—'} />
                      <TrendLine values={trend.map(e => 6 - e.sleep_quality)} color="#6366F1" label="Sleep Quality"       badge={latestLog ? `${latestLog.sleep_quality}/5` : '—'} />
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📈</div>
                      <div style={{ fontSize: '0.82rem' }}>Trends will appear once your child has submitted multiple check-ins.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recovery protocols reference */}
              <div style={card}>
                <div style={cardHdr}>
                  <div>
                    <div style={cardT}>Recovery Guidance</div>
                    <div style={cardS}>How to support your child's recovery at home</div>
                  </div>
                </div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  {[
                    { icon: '💤', title: 'Sleep',      desc: '8–9 hours per night',         note: 'Most important recovery tool',     color: '#6366F1' },
                    { icon: '💧', title: 'Hydration',   desc: '2–3 litres per day',           note: 'More on training days',            color: '#3B82F6' },
                    { icon: '🥗', title: 'Nutrition',   desc: 'Protein within 30 min',        note: 'Post-training recovery meal',      color: '#10B981' },
                    { icon: '🧘', title: 'Stretching',  desc: '10–15 min daily',              note: 'Focus on hip flexors and calves',  color: AMBER    },
                  ].map(({ icon, title, desc, note, color }) => (
                    <div key={title} style={{ padding: '14px 16px', borderRadius: 12, background: `${color}08`, border: `1px solid ${color}1E` }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{title}</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color, marginTop: 2 }}>{desc}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: score gauge + log calendar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...card, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 14 }}>
                  Latest Score
                </div>
                <svg viewBox="0 0 100 100" width={100} height={100} style={{ margin: '0 auto', display: 'block' }}>
                  <circle cx={50} cy={50} r={38} fill="none" stroke="var(--bg-elevated)" strokeWidth={9} />
                  <circle cx={50} cy={50} r={38} fill="none" stroke={scoreColor(m.overall)} strokeWidth={9}
                    strokeDasharray={`${(m.overall / 100) * 239} 239`} strokeLinecap="round" transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 1.5s ease', filter: `drop-shadow(0 0 5px ${scoreColor(m.overall)}88)` }} />
                  <text x={50} y={47} textAnchor="middle" fontSize={18} fontWeight="900" fill="var(--text-primary)">{m.overall}</text>
                  <text x={50} y={60} textAnchor="middle" fontSize={8} fill="var(--text-muted)">/ 100</text>
                </svg>
                <span style={{ marginTop: 10, display: 'inline-block', padding: '3px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, background: `${scoreColor(m.overall)}14`, color: scoreColor(m.overall), border: `1px solid ${scoreColor(m.overall)}28` }}>
                  {m.overall >= 70 ? 'Fully Fit' : m.overall >= 40 ? 'Moderate' : latestLog ? 'Needs Rest' : 'No Data'}
                </span>
              </div>

              <div style={card}>
                <div style={cardHdr}><div style={cardT}>Check-in Calendar</div></div>
                <div style={{ padding: '12px 14px' }}><MiniCal logs={logs} /></div>
              </div>

              <div style={{ ...card, padding: '16px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 10 }}>Season Summary</div>
                {[
                  { label: 'Total check-ins', value: String(logs.length),          color: '#6366F1' },
                  { label: 'Avg wellness',     value: avgScore ? `${avgScore}%` : '—', color: scoreColor(avgScore) },
                  { label: 'Active alerts',    value: String(alerts.length),        color: alerts.length ? '#EF4444' : '#10B981' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ LOG HISTORY ═════════════════════════════════════ */}
      {tab === 'Log History' && (
        <div style={{ animation: 'tabSlideIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Season banner */}
          <div style={{ background: `linear-gradient(135deg, ${AMBER2}, ${AMBER})`, borderRadius: 16, padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Season Progress</div>
              <div style={{ fontWeight: 900, fontSize: '2.4rem', color: 'white', lineHeight: 1 }}>
                {logs.length}<span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>check-ins</span>
              </div>
              <div style={{ marginTop: 10, width: 240, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, (logs.length / 30) * 100)}%`, background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 8px rgba(255,255,255,0.4)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Avg Score',  value: avgScore ? `${avgScore}%` : '—', color: 'white' },
                { label: 'Alerts',     value: String(alerts.length),            color: alerts.length ? '#FCA5A5' : 'white' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 256px', gap: 18 }}>

            {/* Logs list */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Wellness Log History</div>
                  <div style={cardS}>All {logs.length} entries from your child</div>
                </div>
              </div>
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>
                ) : !logs.length ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No check-ins yet</div>
                    <div style={{ fontSize: '0.82rem' }}>Wellness check-ins will appear here once your child submits them through the player portal.</div>
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {logs.map((l, i) => {
                      const ePct = Math.round(((5 - l.fatigue) / 4) * 100);
                      const rPct = Math.round(((5 - l.soreness) / 4) * 100);
                      const sPct = Math.round(((5 - l.sleep_quality) / 4) * 100);
                      const sc   = Math.round((ePct + rPct + sPct) / 3);
                      const col  = scoreColor(sc);
                      return (
                        <div key={l.id ?? i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${col}` }}>
                          <div style={{ flexShrink: 0, textAlign: 'center', width: 42 }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: col }}>{sc}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>score</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                              {new Date(l.logged_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {[['Fatigue', l.fatigue, '#10B981'], ['Soreness', l.soreness, '#F59E0B'], ['Sleep', l.sleep_quality, '#6366F1']].map(([lb, v, c]) => (
                                <span key={lb} style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: `${c}12`, color: c }}>{lb}: {v}/5</span>
                              ))}
                              {l.is_flagged && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>⚑ Flagged</span>}
                            </div>
                            {l.notes && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>"{l.notes}"</div>}
                          </div>
                          {i === 0 && <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, background: `${AMBER}18`, color: AMBER }}>Latest</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={card}>
                <div style={cardHdr}><div style={cardT}>Check-in Calendar</div></div>
                <div style={{ padding: '12px 14px' }}><MiniCal logs={logs} /></div>
              </div>

              <div style={{ ...card, padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 12 }}>Wellness Flags</div>
                {logs.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No data yet.</div>
                ) : (
                  [
                    { label: 'High fatigue',   count: logs.filter(l => l.fatigue >= 4).length,       color: '#F59E0B', icon: '⚡' },
                    { label: 'High soreness',  count: logs.filter(l => l.soreness >= 4).length,      color: '#EF4444', icon: '🦵' },
                    { label: 'Poor sleep',     count: logs.filter(l => l.sleep_quality >= 4).length, color: '#6366F1', icon: '😴' },
                    { label: 'Flagged',        count: logs.filter(l => l.is_flagged).length,         color: '#EF4444', icon: '⚑'  },
                  ].map(({ label, count, color, icon }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '7px 10px', borderRadius: 8, background: count > 0 ? `${color}08` : 'transparent', border: `1px solid ${count > 0 ? `${color}18` : 'transparent'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: count > 0 ? color : 'var(--text-muted)' }}>{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
