// src/pages/player/WorkoutsPage.jsx
import { useState } from 'react';
import { useApi, useSubmit } from '../../hooks/useApi';
import { workoutApi }        from '../../services/workout.api';
import useAuthStore          from '../../store/authStore';

const IcoCheck  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoCircle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
const IcoFire   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;

const MUSCLE_GROUPS = {
  'Push-up':       { muscles: 'Chest, Triceps, Shoulders', icon: '💪', color: '#6366F1' },
  'Squat':         { muscles: 'Quads, Glutes, Hamstrings', icon: '🦵', color: '#059669' },
  'Sprint':        { muscles: 'Full Body, Cardio',         icon: '⚡', color: '#F59E0B' },
  'Plank':         { muscles: 'Core, Shoulders',           icon: '🧠', color: '#3B82F6' },
  'Lunges':        { muscles: 'Quads, Glutes, Balance',    icon: '🏃', color: '#8B5CF6' },
  'Burpees':       { muscles: 'Full Body, Cardio',         icon: '🔥', color: '#EF4444' },
  'Pull-up':       { muscles: 'Back, Biceps',              icon: '💪', color: '#06B6D4' },
  'Deadlift':      { muscles: 'Back, Hamstrings, Glutes',  icon: '🏋️', color: '#D97706' },
  'Bench Press':   { muscles: 'Chest, Triceps',            icon: '💪', color: '#6366F1' },
  'Calf Raise':    { muscles: 'Calves',                    icon: '🦶', color: '#10B981' },
};
function getMeta(name) {
  for (const [k, v] of Object.entries(MUSCLE_GROUPS)) {
    if (name?.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return { muscles: 'Functional Fitness', icon: '🏅', color: '#6366F1' };
}

function difficultyLabel(sets, reps) {
  const load = (sets ?? 1) * (reps ?? 1);
  if (load >= 60) return { label: 'Hard', color: '#EF4444' };
  if (load >= 30) return { label: 'Medium', color: '#F59E0B' };
  return { label: 'Easy', color: '#10B981' };
}

export default function PlayerWorkoutsPage() {
  const user = useAuthStore(s => s.user);
  const [filter, setFilter] = useState('all');

  const { data: assignments, loading, error, refetch } = useApi(
    () => workoutApi.getAssignments(),
    [], { fallback: [] }
  );

  const { submit: toggleExercise } = useSubmit(
    ({ exerciseId, isCompleted }) => workoutApi.toggleCompletion(exerciseId, isCompleted)
  );

  async function handleToggle(exerciseId, currentState) {
    await toggleExercise({ exerciseId, isCompleted: !currentState });
    refetch();
  }

  const allExercises = (assignments || []).flatMap(a =>
    (a.exercises || []).map(ex => ({ ...ex, plan: a }))
  );

  const filtered = filter === 'done'    ? allExercises.filter(e => e.is_completed)
                 : filter === 'pending' ? allExercises.filter(e => !e.is_completed)
                 : allExercises;

  const doneCount  = allExercises.filter(e => e.is_completed).length;
  const totalCount = allExercises.length;
  const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1B3E, #1a2d5a)',
        borderRadius: 16, padding: '24px 28px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(245,158,11,0.08)',
        }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
            Player
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', margin: '0 0 4px' }}>
            My Workouts
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Training plans assigned by your coach
          </p>

          {totalCount > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {doneCount}/{totalCount} exercises completed
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pct === 100 ? '#10B981' : '#F59E0B' }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${pct}%`,
                  background: pct === 100 ? '#10B981' : 'linear-gradient(90deg, #6366F1, #F59E0B)',
                  transition: 'width 0.8s ease',
                }}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {totalCount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Exercises', value: totalCount, color: '#6366F1', icon: '📋' },
            { label: 'Completed',       value: doneCount,  color: '#10B981', icon: '✅' },
            { label: 'Remaining',       value: totalCount - doneCount, color: '#F59E0B', icon: '⏳' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['all', 'All'], ['pending', 'Pending'], ['done', 'Done']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '6px 16px', borderRadius: 99, cursor: 'pointer',
                background: filter === val ? 'var(--accent)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === val ? 'var(--accent)' : 'var(--border-default)'}`,
                color: filter === val ? 'white' : 'var(--text-secondary)',
                fontWeight: filter === val ? 700 : 500, fontSize: '0.82rem',
                transition: 'all 0.15s',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Exercise cards */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }}/>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-surface)', borderRadius: 16,
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            {filter === 'all' ? 'No workouts assigned yet' : `No ${filter} exercises`}
          </div>
          {filter === 'all' ? (
            <>
              <p style={{ color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto 4px', fontSize: '0.875rem' }}>
                Your coach will assign training plans here.
              </p>
              <p style={{ color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto', fontSize: '0.875rem' }}>
                Check back soon!
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto', fontSize: '0.875rem' }}>
              Adjust the filter to see other exercises.
            </p>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {filtered.map(exercise => {
            const meta   = getMeta(exercise.name);
            const diff   = difficultyLabel(exercise.sets, exercise.reps);
            const done   = exercise.is_completed;

            return (
              <div
                key={exercise.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: done ? 0.8 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Color bar */}
                <div style={{ height: 4, background: done ? '#10B981' : meta.color }}/>

                <div style={{ padding: '16px 18px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: done ? 'rgba(16,185,129,0.12)' : `${meta.color}15`,
                      border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : `${meta.color}30`}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}>
                      {done ? '✅' : meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
                        textDecoration: done ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {exercise.name || 'Exercise'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {meta.muscles}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                      background: `${diff.color}15`, color: diff.color,
                      flexShrink: 0,
                    }}>
                      {diff.label}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Sets',  value: exercise.sets  ?? '—' },
                      { label: 'Reps',  value: exercise.reps  ?? '—' },
                      { label: 'Rest',  value: exercise.rest_seconds ? `${exercise.rest_seconds}s` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        flex: 1, background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 8px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {exercise.notes && (
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
                      marginBottom: 12, lineHeight: 1.4,
                    }}>
                      "{exercise.notes}"
                    </div>
                  )}

                  {/* Toggle button */}
                  <button
                    onClick={() => handleToggle(exercise.id, done)}
                    style={{
                      width: '100%', padding: '8px 0', borderRadius: 9, cursor: 'pointer',
                      background: done ? 'rgba(16,185,129,0.1)' : meta.color,
                      border: `1.5px solid ${done ? 'rgba(16,185,129,0.3)' : meta.color}`,
                      color: done ? '#10B981' : 'white',
                      fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    {done ? <><IcoCheck /> Done — Mark Incomplete</> : <><IcoCircle /> Mark as Done</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
