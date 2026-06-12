'use client';

import { useState, useEffect } from 'react';
import { workoutApi, apiClient } from '@sams/api';
import type { WorkoutPlan, Exercise } from '@sams/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkoutExercise {
  id?: string;
  description?: string;
  sets_reps_notes?: string;
  is_completed?: boolean;
  sort_order?: number;
}

interface PlayerWorkout {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  duration_minutes?: number;
  due_date?: string;
  created_at?: string;
  workout_exercises?: WorkoutExercise[];
  exercises?: Exercise[];
  teams?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysDue(iso?: string | null): { label: string; color: string; bg: string } | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  };
  if (diff === 0) return { label: 'Due today',       color: '#D97706', bg: 'rgba(217,119,6,0.1)'   };
  if (diff <= 3)  return { label: `Due in ${diff}d`, color: '#D97706', bg: 'rgba(245,158,11,0.1)'  };
  return           { label: `Due ${fmtDate(iso)}`,  color: '#64748B', bg: 'rgba(100,116,139,0.08)' };
}

const ACCENT_COLORS = ['#6366F1', '#2563EB', '#059669', '#D97706', '#7C3AED'];
function accentFor(str?: string) {
  return ACCENT_COLORS[(str?.charCodeAt(0) ?? 0) % ACCENT_COLORS.length];
}

// ─── Exercise Item ────────────────────────────────────────────────────────────
function ExerciseItem({
  exercise, index, accent, onToggle,
}: {
  exercise: WorkoutExercise;
  index: number;
  accent: string;
  onToggle?: () => void;
}) {
  const [done,     setDone]     = useState(exercise.is_completed ?? false);
  const [toggling, setToggling] = useState(false);
  const name = exercise.description ?? 'Exercise';

  async function handleToggle() {
    if (!exercise.id) return;
    setToggling(true);
    try {
      await (apiClient as any).post('/workouts/complete', { exercise_id: exercise.id, is_completed: !done });
      setDone(d => !d);
      onToggle?.();
    } catch (_) {}
    setToggling(false);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: done ? 'rgba(16,185,129,0.04)' : 'var(--bg-elevated)',
      border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`,
      borderRadius: 14, borderLeft: `4px solid ${done ? '#10B981' : accent}`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: done ? 'rgba(16,185,129,0.12)' : `${accent}12`,
        border: `1.5px solid ${done ? 'rgba(16,185,129,0.35)' : `${accent}30`}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.78rem', fontWeight: 900,
        color: done ? '#10B981' : accent, transition: 'all 0.2s',
      }}>
        {done ? '✓' : index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: '0.875rem',
          color: done ? '#059669' : 'var(--text-primary)',
          textDecoration: done ? 'line-through' : 'none',
          transition: 'all 0.2s',
        }}>
          {name}
        </div>
        {exercise.sets_reps_notes && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {exercise.sets_reps_notes}
          </div>
        )}
      </div>
      {exercise.id && (
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{
            padding: '5px 14px', borderRadius: 99,
            border: `1.5px solid ${done ? 'rgba(16,185,129,0.3)' : `${accent}40`}`,
            background: done ? 'rgba(16,185,129,0.1)' : `${accent}08`,
            color: done ? '#059669' : accent,
            fontSize: '0.72rem', fontWeight: 700,
            cursor: toggling ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          {toggling ? '…' : done ? '↩ Undo' : 'Mark Done'}
        </button>
      )}
    </div>
  );
}

// ─── Workout Card ─────────────────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: PlayerWorkout }) {
  const [expanded,       setExpanded]       = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const accent  = accentFor(workout.title);
  const due     = daysDue(workout.due_date);

  const exList: WorkoutExercise[] = workout.workout_exercises
    ?? workout.exercises?.map((e, i) => ({
        id: undefined as string | undefined,
        description: e.name,
        sets_reps_notes: e.sets && e.reps ? `${e.sets}×${e.reps}` : (e.notes ?? undefined),
        is_completed: false,
        sort_order: i,
      }))
    ?? [];
  const exCount = exList.length;

  useEffect(() => {
    setCompletedCount(exList.filter(ex => ex.is_completed).length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout]);

  const progress = exCount > 0 ? Math.round((completedCount / exCount) * 100) : 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)', borderRadius: 18,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}40`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${accent}14`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />

      {/* Card header */}
      <div style={{ padding: '18px 20px 14px', background: `linear-gradient(140deg, ${accent}08, ${accent}02)`, borderBottom: `1px solid ${accent}10` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${accent}30`, fontSize: '1.25rem',
            }}>
              🏋️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.97rem', color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>
                {workout.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                {exCount > 0 && <span>🏋️ {exCount} exercise{exCount !== 1 ? 's' : ''}</span>}
                {workout.teams?.name && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>👥 {workout.teams.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {due && (
            <span style={{
              fontSize: '0.66rem', fontWeight: 800, padding: '4px 10px',
              borderRadius: 99, background: due.bg, color: due.color,
              border: `1px solid ${due.color}30`, flexShrink: 0,
            }}>
              {due.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {exCount > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: progress === 100 ? '#10B981' : accent }}>
                {completedCount}/{exCount} done
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: 99,
                background: progress === 100
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : `linear-gradient(90deg, ${accent}99, ${accent})`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Toggle row */}
      <div style={{ padding: '10px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setExpanded(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            background: expanded ? `${accent}12` : 'var(--bg-surface)',
            border: `1px solid ${expanded ? `${accent}25` : 'var(--border-default)'}`,
            color: expanded ? accent : 'var(--text-secondary)',
            fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.2s',
          }}
        >
          {expanded ? '▲ Hide exercises' : '▶ View exercises'}
        </button>
      </div>

      {/* Expanded exercises */}
      {expanded && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!exList.length ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No exercises defined.
            </div>
          ) : (
            exList.map((ex, i) => (
              <ExerciseItem
                key={ex.id ?? i}
                exercise={ex}
                index={i}
                accent={accent}
                onToggle={() => setCompletedCount(prev => ex.is_completed ? prev - 1 : prev + 1)}
              />
            ))
          )}
          {progress === 100 && (
            <div style={{
              marginTop: 8, padding: '12px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#059669', fontWeight: 700, fontSize: '0.875rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>🎉</span> All exercises complete! Great work!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlayerWorkoutsPage() {
  const [workouts, setWorkouts] = useState<PlayerWorkout[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    workoutApi.getWorkouts()
      .then(data => setWorkouts(data as unknown as PlayerWorkout[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalExercises = workouts.reduce((s, w) => {
    const exList = w.workout_exercises ?? w.exercises ?? [];
    return s + exList.length;
  }, 0);
  const completedExercises = workouts.reduce((s, w) => {
    return s + (w.workout_exercises ?? []).filter(ex => ex.is_completed).length;
  }, 0);
  const overallPct = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Navy header banner ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D1B3E, #1a2d5a)',
        borderRadius: 16, padding: '24px 28px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orb */}
        <div style={{
          position: 'absolute', right: -30, top: -30,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(245,158,11,0.08)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4,
          }}>
            Player
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', margin: '0 0 4px' }}>
            My Workouts
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Training plans assigned by your coach
          </p>

          {/* Overall progress bar — shown when workouts exist */}
          {!loading && totalExercises > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {completedExercises}/{totalExercises} exercises completed
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: overallPct === 100 ? '#10B981' : '#F59E0B' }}>
                  {overallPct}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${overallPct}%`,
                  background: overallPct === 100 ? '#10B981' : 'linear-gradient(90deg, #6366F1, #F59E0B)',
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row — shown when workouts exist ───────────────────────────── */}
      {!loading && totalExercises > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
          {([
            { label: 'Total Exercises', value: totalExercises,                         color: '#6366F1', icon: '📋' },
            { label: 'Completed',       value: completedExercises,                     color: '#10B981', icon: '✅' },
            { label: 'Remaining',       value: totalExercises - completedExercises,    color: '#F59E0B', icon: '⏳' },
          ] as const).map(({ label, value, color, icon }) => (
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

      {/* ── Loading skeletons ───────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 18 }} />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && workouts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-surface)', borderRadius: 16,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            No workouts assigned yet
          </div>
          <p style={{ color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto 4px', fontSize: '0.875rem' }}>
            Your coach will assign training plans here.
          </p>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
            Check back soon!
          </p>
        </div>
      )}

      {/* ── Workout grid ────────────────────────────────────────────────────── */}
      {!loading && workouts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {workouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
        </div>
      )}
    </div>
  );
}
