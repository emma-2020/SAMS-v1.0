// src/pages/player/index.jsx
import { useState, useCallback } from 'react';
import { useApi, useSubmit } from '../../hooks/useApi';
import { scheduleApi }  from '../../services/schedule.api';
import { healthApi }    from '../../services/health.api';
import { workoutApi }   from '../../services/workout.api';
import useAuthStore     from '../../store/authStore';
import {
  PageHeader, SectionCard, ErrorBanner, EmptyState,
  SkeletonCard,
} from '../../components/shared/ui';

// ─── Icons ───────────────────────────────────────────────────────
const IcoCalendar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoPin      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoClock    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

// ─── Helpers ─────────────────────────────────────────────────────
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

function daysUntil(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 0)  return 'Past';
  return `In ${d}d`;
}

const TYPE_STYLE = {
  Practice: { color:'var(--info)',   bg:'rgba(59,130,246,0.12)' },
  Game:     { color:'var(--accent)', bg:'var(--accent-subtle)'  },
};

const METRICS = [
  { key:'fatigue',       label:'Physical Fatigue',  icon:'⚡', danger:(v)=>v>=4, low:'Fully rested',  high:'Exhausted'     },
  { key:'soreness',      label:'Muscular Soreness',  icon:'💪', danger:(v)=>v>=4, low:'No soreness',   high:'Very sore'      },
  { key:'sleep_quality', label:'Sleep Quality',      icon:'🌙', danger:(v)=>v<=2, low:'Poor sleep',    high:'Excellent sleep' },
];

const SCORE_LABELS = ['','Very Low','Low','Moderate','High','Very High'];

// ─────────────────────────────────────────────────────────────────
// SCHEDULE FEED
// ─────────────────────────────────────────────────────────────────

function ScheduleFeed() {
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + 30);

  const { data: events, loading, error, refetch } = useApi(
    () => scheduleApi.getEvents({ start: now.toISOString(), end: end.toISOString() }),
    [],
    { fallback: [] }
  );

  return (
    <SectionCard
      title="Upcoming Schedule"
      subtitle="Next 30 days"
      action={<span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text-muted)' }}>
        {!loading && `${events?.length ?? 0} sessions`}
      </span>}
    >
      {error && <ErrorBanner message={error} onRetry={refetch} style={{ marginBottom:16 }} />}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <SkeletonCard key={i} rows={2} style={{ padding:'14px 16px' }} />)}
        </div>
      ) : events?.length === 0 ? (
        <EmptyState icon={<IcoCalendar />} title="No upcoming sessions" subtitle="Your schedule is clear for the next 30 days." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {events.map((ev) => {
            const ts   = TYPE_STYLE[ev.type] || TYPE_STYLE.Practice;
            const soon = daysUntil(ev.start_time);
            return (
              <div key={ev.id} style={{
                display:'flex', alignItems:'stretch', background:'var(--bg-elevated)',
                borderRadius:'var(--radius-md)', border:'1px solid var(--border-default)',
                overflow:'hidden', animation:'fadeIn 0.25s ease',
              }}>
                <div style={{ width:4, flexShrink:0, background:ts.color }} />
                <div style={{ flex:1, padding:'12px 14px', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</span>
                      <span style={{ padding:'1px 8px', borderRadius:99, fontSize:'0.68rem', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:ts.bg, color:ts.color, flexShrink:0 }}>{ev.type}</span>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:soon==='Today'?'var(--accent)':'var(--text-muted)', fontWeight:soon==='Today'?600:400, flexShrink:0 }}>{soon}</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'10px 18px' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-secondary)', fontSize:'0.8rem' }}><IcoClock />{fmtDate(ev.start_time)}, {fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</span>
                    {ev.location && <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-secondary)', fontSize:'0.8rem' }}><IcoPin />{ev.location}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// WORKOUT CHECKLIST — F-08: Now wired to real API
// ─────────────────────────────────────────────────────────────────

function WorkoutChecklist() {
  const { data: assignments, loading, error, refetch } = useApi(
    () => workoutApi.getAssignments(),
    [],
    { fallback: [] }
  );

  // Track optimistic local completion state
  const [localState, setLocalState] = useState({});
  const { submit: saveCompletion } = useSubmit(
    ({ exerciseId, isCompleted }) => workoutApi.toggleCompletion(exerciseId, isCompleted)
  );

  const activeAssignment = assignments?.[0] ?? null;
  const exercises        = activeAssignment?.workout_exercises ?? [];

  const getCompleted = (ex) => {
    if (localState[ex.id] !== undefined) return localState[ex.id];
    return ex.is_completed ?? false;
  };

  const toggleExercise = useCallback(async (ex) => {
    const newVal = !getCompleted(ex);
    // Optimistic update
    setLocalState((p) => ({ ...p, [ex.id]: newVal }));
    // Persist to API
    const res = await saveCompletion({ exerciseId: ex.id, isCompleted: newVal });
    if (!res.ok) {
      // Revert on failure
      setLocalState((p) => ({ ...p, [ex.id]: !newVal }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localState, saveCompletion]);

  const completed = exercises.filter((ex) => getCompleted(ex)).length;
  const total     = exercises.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <SectionCard
      title="Today's Workout"
      subtitle={activeAssignment?.title ?? 'No assignment'}
      action={
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:pct===100?'var(--success)':'var(--text-muted)' }}>
          {total > 0 ? `${completed}/${total} done` : ''}
        </span>
      }
    >
      {error && <ErrorBanner message={error} onRetry={refetch} style={{ marginBottom:16 }} />}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height:46, borderRadius:'var(--radius-md)' }} />
          ))}
        </div>
      ) : !activeAssignment ? (
        <EmptyState
          icon={<IcoCheck />}
          title="No workout assigned"
          subtitle="Your coach hasn't assigned a workout yet."
        />
      ) : (
        <>
          {/* Progress bar */}
          <div style={{ height:6, borderRadius:3, background:'var(--bg-overlay)', marginBottom:20, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:3, background:pct===100?'var(--success)':'var(--accent)', width:`${pct}%`, transition:'width 0.4s ease' }} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {exercises.map((ex) => {
              const done = getCompleted(ex);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggleExercise(ex)}
                  style={{
                    display:'flex', alignItems:'center', gap:14,
                    padding:'11px 14px',
                    background: done ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)',
                    border:`1px solid ${done ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                    borderRadius:'var(--radius-md)', cursor:'pointer',
                    textAlign:'left', width:'100%', transition:'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width:20, height:20, borderRadius:4, flexShrink:0,
                    border:`1.5px solid ${done?'var(--success)':'var(--border-strong)'}`,
                    background: done?'var(--success)':'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.15s ease',
                  }}>
                    {done && <span style={{ color:'#fff' }}><IcoCheck /></span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.875rem', fontWeight:500, color:done?'var(--text-muted)':'var(--text-primary)', textDecoration:done?'line-through':'none', transition:'color 0.15s ease' }}>
                      {ex.description}
                    </div>
                    {ex.sets_reps_notes && (
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                        {ex.sets_reps_notes}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {pct === 100 && (
            <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(16,185,129,0.08)', borderRadius:'var(--radius-md)', border:'1px solid rgba(16,185,129,0.2)', textAlign:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', color:'var(--success)', letterSpacing:'0.04em' }}>
              ✓ Workout Complete — Great work!
            </div>
          )}

          {activeAssignment.due_date && (
            <div style={{ marginTop:12, fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'right', fontFamily:'var(--font-mono)' }}>
              Due: {new Date(activeAssignment.due_date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// HEALTH CHECK-IN
// ─────────────────────────────────────────────────────────────────

function HealthCheckIn() {
  const [scores, setScores]   = useState({ fatigue:3, soreness:3, sleep_quality:3 });
  const [submitted, setSubmitted] = useState(false);

  const { submit, loading, error, success } = useSubmit(
    () => healthApi.submitLog(scores)
  );

  const handleChange = (key, val) =>
    setScores((p) => ({ ...p, [key]: Number(val) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await submit();
    if (res.ok) setSubmitted(true);
  };

  const flagged = METRICS.some((m) => m.danger(scores[m.key]));

  if (submitted) {
    return (
      <SectionCard title="Daily Health Log" accent>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'24px 0', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--success-subtle)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>✓</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:700, color:'var(--success)' }}>Check-in Submitted</div>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', maxWidth:280 }}>
            Your wellness data has been logged.{flagged ? ' Some scores triggered a health alert.' : ''}
          </p>
          {flagged && (
            <div className="alert alert-warning" style={{ width:'100%' }}>
              One or more scores are outside the normal range. Rest and recovery recommended.
            </div>
          )}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Daily Health Check-in" subtitle="Submit once per day" accent>
      {error && <ErrorBanner message={error} style={{ marginBottom:16 }} />}
      {flagged && (
        <div className="alert alert-warning" style={{ marginBottom:20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ flexShrink:0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{ fontSize:'0.85rem' }}>High-risk score detected — your coach will receive an alert.</span>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:28 }}>
        {METRICS.map(({ key, label, danger, low, high, icon }) => {
          const val      = scores[key];
          const isDanger = danger(val);
          const pct      = ((val - 1) / 4) * 100;
          const trackColor = isDanger ? 'var(--danger)' : val >= 4 ? 'var(--success)' : 'var(--accent)';

          return (
            <div key={key}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)' }}>
                    {icon} {label}
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.4rem', fontWeight:500, color:isDanger?'var(--danger)':'var(--text-primary)', transition:'color 0.2s ease' }}>
                  {val}
                </div>
              </div>
              <div style={{ position:'relative', marginBottom:6 }}>
                <div style={{ position:'absolute', top:'50%', left:0, right:0, height:6, borderRadius:3, background:'var(--bg-overlay)', transform:'translateY(-50%)', pointerEvents:'none' }}>
                  <div style={{ height:'100%', borderRadius:3, background:trackColor, width:`${pct}%`, transition:'width 0.15s ease, background 0.2s ease' }} />
                </div>
                <input type="range" min={1} max={5} step={1} value={val}
                  onChange={(e) => handleChange(key, e.target.value)}
                  style={{ width:'100%', height:24, opacity:0.01, cursor:'pointer', position:'relative', zIndex:1 }}
                  aria-label={label}
                />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                {[1,2,3,4,5].map((n) => (
                  <div key={n} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:n<=val?trackColor:'var(--border-strong)', transition:'background 0.15s ease' }} />
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:n===val?trackColor:'var(--text-muted)', fontWeight:n===val?600:400 }}>{n}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{low}</span>
                <span style={{ fontSize:'0.72rem', color:isDanger?'var(--danger)':'var(--text-muted)' }}>{SCORE_LABELS[val]}</span>
              </div>
            </div>
          );
        })}
        <button
          type="submit"
          className={`btn btn-primary btn-full${loading?' btn-loading':''}`}
          disabled={loading}
        >
          {!loading && 'Submit Health Log'}
        </button>
      </form>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// PLAYER DASHBOARD
// ─────────────────────────────────────────────────────────────────

export default function PlayerDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      <PageHeader
        eyebrow="Player Workspace"
        title={`${user?.first_name}'s Locker`}
        subtitle={new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
        roleColor="var(--role-player)"
      />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ gridColumn:'1 / -1' }}>
          <ScheduleFeed />
        </div>
        <WorkoutChecklist />
        <HealthCheckIn />
      </div>
    </div>
  );
}
