// src/pages/player/index.jsx — Player Dashboard Home
import { useNavigate } from 'react-router-dom';
import { useApi }      from '../../hooks/useApi';
import { scheduleApi } from '../../services/schedule.api';
import { healthApi }   from '../../services/health.api';
import { workoutApi }  from '../../services/workout.api';
import useAuthStore    from '../../store/authStore';

const GREETING_EMOJI = () => {
  const h = new Date().getHours();
  if (h < 12) return '🌅';
  if (h < 17) return '☀️';
  return '🌙';
};

function daysUntil(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d < 0)   return { text: 'Past',     color: '#94A3B8' };
  if (d === 0) return { text: 'Today',    color: '#10B981' };
  if (d === 1) return { text: 'Tomorrow', color: '#6366F1' };
  return { text: `In ${d}d`, color: '#F59E0B' };
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtShort(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function PlayerDashboard() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const today    = new Date();
  const in30     = new Date(); in30.setDate(today.getDate() + 30);

  const { data: events }      = useApi(() => scheduleApi.getEvents({ start: today.toISOString(), end: in30.toISOString() }), [], { fallback: [] });
  const { data: healthLogs }  = useApi(() => healthApi.getLogs({ days: 7 }), [], { fallback: [] });
  const { data: assignments } = useApi(() => workoutApi.getAssignments(), [], { fallback: [] });

  const upcoming     = (events || []).slice(0, 4);
  const todayEvents  = (events || []).filter(ev => new Date(ev.start_time).toDateString() === today.toDateString());
  const latestLog    = (healthLogs || [])[0] ?? null;
  const todayLogged  = latestLog ? new Date(latestLog.logged_at).toDateString() === today.toDateString() : false;

  const allExercises = (assignments || []).flatMap(a => a.exercises || []);
  const doneExercises = allExercises.filter(e => e.is_completed).length;
  const totalExercises = allExercises.length;

  const fitnessScore = latestLog
    ? Math.round(((5 - latestLog.fatigue) + (5 - latestLog.soreness) + latestLog.sleep_quality) / 3 / 5 * 100)
    : null;
  const fitnessLabel = fitnessScore === null ? 'Log Today' : fitnessScore >= 70 ? 'Fully Fit' : fitnessScore >= 45 ? 'Moderate' : 'Needs Rest';
  const fitnessColor = fitnessScore === null ? '#6366F1' : fitnessScore >= 70 ? '#10B981' : fitnessScore >= 45 ? '#F59E0B' : '#EF4444';

  const greetingHour  = today.getHours();
  const greetingWord  = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Hero greeting */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1B3E 0%, #1a2d5a 50%, #0f2244 100%)',
        borderRadius: 18, padding: '28px 32px 24px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.06)' }}/>
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.04)' }}/>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: '1.6rem', color: 'white', margin: '0 0 4px' }}>
              {greetingWord}, {user?.first_name}! {GREETING_EMOJI()}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0 0 18px', fontSize: '0.875rem' }}>
              {todayEvents.length > 0
                ? `You have ${todayEvents.length} session${todayEvents.length > 1 ? 's' : ''} today.`
                : upcoming.length > 0
                ? `Next session: ${upcoming[0]?.title} on ${fmtShort(upcoming[0]?.start_time)}`
                : 'No sessions scheduled. Stay active!'}
            </p>

            {/* Today's highlight */}
            {!todayLogged && (
              <button
                onClick={() => navigate('/dashboard/player/health')}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                  color: '#A5B4FC', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span>💊</span> Log today's wellness check-in
              </button>
            )}
          </div>

          {/* Fitness status ring */}
          <div style={{
            flexShrink: 0, textAlign: 'center',
            padding: '16px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"/>
              {fitnessScore !== null && (
                <circle cx="40" cy="40" r="32" fill="none"
                  stroke={fitnessColor} strokeWidth="7"
                  strokeDasharray={`${(fitnessScore/100)*201} 201`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              )}
              <text x="40" y="36" textAnchor="middle" fontSize="13" fontWeight="900" fill="white">
                {fitnessScore !== null ? fitnessScore : '—'}
              </text>
              {fitnessScore !== null && (
                <text x="40" y="49" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)">%</text>
              )}
            </svg>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: fitnessColor, marginTop: 4, letterSpacing: '0.04em' }}>
              {fitnessLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          {
            label: 'Sessions This Month', value: events?.length ?? '—',
            color: '#6366F1', icon: '📅',
            action: () => navigate('/dashboard/player/schedule'),
          },
          {
            label: 'Today\'s Sessions', value: todayEvents.length,
            color: '#3B82F6', icon: '⚽',
            sub: todayEvents[0]?.title || 'None today',
          },
          {
            label: 'Workouts Progress',
            value: totalExercises ? `${doneExercises}/${totalExercises}` : '—',
            color: '#D97706', icon: '🏋️',
            action: () => navigate('/dashboard/player/workouts'),
          },
          {
            label: 'Wellness Status', value: fitnessLabel,
            color: fitnessColor, icon: '💚',
            action: () => navigate('/dashboard/player/health'),
          },
        ].map(({ label, value, color, icon, sub, action }) => (
          <div
            key={label}
            onClick={action}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 14, padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)', cursor: action ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (action) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { if (action) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>
                {icon}
              </div>
              {action && <span style={{ fontSize: '0.7rem', color, fontWeight: 700 }}>View →</span>}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub || label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

        {/* Upcoming sessions */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Upcoming Sessions</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>Your next training & matches</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/dashboard/player/schedule')}
            >
              Full schedule →
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No upcoming sessions</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
                Your coach will schedule sessions for your team.
              </p>
            </div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map(ev => {
                const lbl     = daysUntil(ev.start_time);
                const isGame  = ev.type === 'Game';
                const color   = isGame ? '#EF4444' : '#6366F1';
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 9, flexShrink: 0,
                      background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}>
                      {isGame ? '⚽' : '🏃'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {fmtShort(ev.start_time)} · {fmtTime(ev.start_time)}
                        {ev.location && ` · ${ev.location}`}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
                        background: `${lbl.color}15`, color: lbl.color,
                      }}>
                        {lbl.text}
                      </span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                        background: `${color}12`, color, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {ev.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
              background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
            }}>
              Quick Actions
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Health Dashboard', path: '/dashboard/player/health',   color: '#10B981', icon: '💊', desc: 'View & log wellness'       },
                { label: 'My Workouts',      path: '/dashboard/player/workouts', color: '#D97706', icon: '🏋️', desc: 'Training assignments'       },
                { label: 'Full Schedule',    path: '/dashboard/player/schedule', color: '#6366F1', icon: '📅', desc: 'All sessions & matches'      },
                { label: 'Team Chat',        path: '/dashboard/player/chat',     color: '#2563EB', icon: '💬', desc: 'Message teammates & coach'   },
              ].map(({ label, path, color, icon, desc }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', width: '100%', textAlign: 'left',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}06`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Last wellness summary */}
          {latestLog && (
            <div style={{
              background: `linear-gradient(135deg, ${fitnessColor}10, var(--bg-surface))`,
              border: `1px solid ${fitnessColor}25`,
              borderRadius: 14, padding: '16px 18px',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 10 }}>
                Last Wellness Log
              </div>
              {[
                { label: 'Fatigue',   value: latestLog.fatigue,       max: 5, color: '#EF4444' },
                { label: 'Soreness',  value: latestLog.soreness,      max: 5, color: '#F59E0B' },
                { label: 'Sleep',     value: latestLog.sleep_quality, max: 5, color: '#6366F1' },
              ].map(({ label, value, max, color }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}/{max}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${(value/max)*100}%`, background: color }}/>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(latestLog.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}· <button onClick={() => navigate('/dashboard/player/health')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontWeight: 700, padding: 0 }}>View health →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
