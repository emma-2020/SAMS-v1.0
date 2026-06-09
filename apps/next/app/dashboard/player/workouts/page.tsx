'use client';

import { useState, useEffect } from 'react';
import { workoutApi, apiClient } from '@sams/api';
import type { WorkoutPlan, Exercise } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';

// ─── Types ──────────────────────────────────────────────────────────
interface PlayerWorkout {
  id: string; title: string; description?: string; difficulty?: string;
  duration_minutes?: number; due_date?: string; created_at?: string;
  workout_exercises?: Array<{ id?: string; description?: string; sets_reps_notes?: string; is_completed?: boolean; sort_order?: number }>;
  exercises?: Exercise[];
  teams?: { name: string };
}

// ─── Helpers ────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysDue(iso?: string | null): { label: string; color: string; bg: string } | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: '#EF4444', bg: '#FEF2F2' };
  if (diff === 0) return { label: 'Due today',        color: '#D97706', bg: '#FEF3C7' };
  if (diff <= 3)  return { label: `Due in ${diff}d`,  color: '#D97706', bg: '#FFFBEB' };
  return           { label: `Due ${fmtDate(iso)}`,   color: '#64748B', bg: '#F8FAFC' };
}

const ACCENT_COLORS = ['#6366F1', '#2563EB', '#059669', '#D97706', '#7C3AED'];
function accentFor(str?: string) { return ACCENT_COLORS[(str?.charCodeAt(0) ?? 0) % ACCENT_COLORS.length]; }

// ─── Types ──────────────────────────────────────────────────────────
type WorkoutExercise = { id?: string; description?: string; sets_reps_notes?: string; is_completed?: boolean; sort_order?: number };

// ─── Exercise Card ───────────────────────────────────────────────────
function ExerciseItem({ exercise, index, accent, workoutId, onToggle }: {
  exercise: WorkoutExercise;
  index: number; accent: string; workoutId: string; onToggle?: () => void;
}) {
  const [done, setDone]       = useState(exercise.is_completed ?? false);
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: done ? '#F0FDF4' : 'var(--bg-elevated)', border: `1px solid ${done ? '#A7F3D0' : 'var(--border-subtle)'}`, borderRadius: 14, borderLeft: `4px solid ${done ? '#10B981' : accent}`, transition: 'all 0.2s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: done ? '#DCFCE7' : `${accent}12`, border: `1.5px solid ${done ? '#86EFAC' : `${accent}30`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900, color: done ? '#10B981' : accent, transition: 'all 0.2s' }}>
        {done ? '✓' : index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: done ? '#059669' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
          {name}
        </div>
        {exercise.sets_reps_notes && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{exercise.sets_reps_notes}</div>
        )}
      </div>
      {exercise.id && (
        <button onClick={handleToggle} disabled={toggling}
          style={{ padding: '5px 14px', borderRadius: 99, border: `1.5px solid ${done ? '#A7F3D0' : `${accent}40`}`, background: done ? '#DCFCE7' : `${accent}08`, color: done ? '#059669' : accent, fontSize: '0.72rem', fontWeight: 700, cursor: toggling ? 'not-allowed' : 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
          {toggling ? '…' : done ? '↩ Undo' : 'Mark Done'}
        </button>
      )}
    </div>
  );
}

// ─── Workout Card ────────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: PlayerWorkout }) {
  const [expanded, setExpanded] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const accent  = accentFor(workout.title);
  const due     = daysDue(workout.due_date);
  const exList: WorkoutExercise[]  = workout.workout_exercises ?? workout.exercises?.map((e, i) => ({ id: undefined as string | undefined, description: e.name, sets_reps_notes: e.sets && e.reps ? `${e.sets}×${e.reps}` : (e.notes ?? undefined), is_completed: false, sort_order: i })) ?? [];
  const exCount = exList.length;

  useEffect(() => {
    setCompletedCount(exList.filter(ex => ex.is_completed).length);
  }, [workout]);

  const progress = exCount > 0 ? Math.round((completedCount / exCount) * 100) : 0;

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1.5px solid #E8EDF5', boxShadow: '0 2px 10px rgba(15,23,42,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.border = `1.5px solid ${accent}40`; e.currentTarget.style.boxShadow = `0 8px 32px ${accent}14`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.border = '1.5px solid #E8EDF5'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'none'; }}>

      {/* Header */}
      <div style={{ padding: '18px 20px 14px', background: `linear-gradient(140deg, ${accent}0C, ${accent}04)`, borderBottom: `1px solid ${accent}12` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${accent}30`, fontSize: '1.25rem' }}>🏋️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.97rem', color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 2 }}>{workout.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', gap: 8 }}>
                {exCount > 0 && <span>🏋️ {exCount} exercise{exCount !== 1 ? 's' : ''}</span>}
                {workout.teams?.name && <><span style={{ opacity: 0.4 }}>·</span><span>👥 {workout.teams.name}</span></>}
              </div>
            </div>
          </div>
          {due && (
            <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: due.bg, color: due.color, border: `1px solid ${due.color}30`, flexShrink: 0 }}>
              {due.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {exCount > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: progress === 100 ? '#10B981' : accent }}>{completedCount}/{exCount} done</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: progress === 100 ? 'linear-gradient(90deg, #10B981, #059669)' : `linear-gradient(90deg, ${accent}99, ${accent})`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Exercise list toggle */}
      <div style={{ padding: '10px 16px', background: '#FAFBFC', borderBottom: '1px solid #F4F6FA' }}>
        <button onClick={() => setExpanded(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: expanded ? `${accent}12` : '#F1F5F9', border: `1px solid ${expanded ? `${accent}25` : '#E2E8F0'}`, color: expanded ? accent : '#64748B', fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.2s' }}>
          {expanded ? '▲ Hide exercises' : '▶ View exercises'}
        </button>
      </div>

      {/* Expanded exercises */}
      {expanded && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!exList.length ? (
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic', padding: '8px 0' }}>No exercises defined.</div>
          ) : (
            exList.map((ex, i) => (
              <ExerciseItem
                key={ex.id ?? i}
                exercise={ex}
                index={i}
                accent={accent}
                workoutId={workout.id}
                onToggle={() => setCompletedCount(prev => ex.is_completed ? prev - 1 : prev + 1)}
              />
            ))
          )}
          {progress === 100 && (
            <div style={{ marginTop: 8, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontWeight: 700, fontSize: '0.875rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎉</span> All exercises complete! Great work!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function PlayerWorkoutsPage() {
  const [workouts, setWorkouts] = useState<PlayerWorkout[]>([]);
  const [loading, setLoading]  = useState(true);

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
    const exList = w.workout_exercises ?? [];
    return s + exList.filter(ex => ex.is_completed).length;
  }, 0);
  const overallProgress = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>My Workouts</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
          {workouts.length} training plan{workouts.length !== 1 ? 's' : ''} · {totalExercises} total exercises
        </p>
      </div>

      {/* Overall progress banner */}
      {!loading && totalExercises > 0 && (
        <div style={{ marginBottom: 24, borderRadius: 18, padding: '16px 20px', background: `linear-gradient(135deg, ${ROLE_COLOR.Player}08, transparent)`, border: `1.5px solid ${ROLE_COLOR.Player}20`, borderLeft: `5px solid ${ROLE_COLOR.Player}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Overall Progress</div>
            <span style={{ fontWeight: 900, fontSize: '1rem', color: ROLE_COLOR.Player }}>{overallProgress}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ width: `${overallProgress}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${ROLE_COLOR.Player}99, ${ROLE_COLOR.Player})`, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>{completedExercises} of {totalExercises} exercises completed</div>
        </div>
      )}

      {/* Workout grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 20 }} />)}
        </div>
      ) : !workouts.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #ECFDF5 100%)', borderRadius: 20, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', marginBottom: 8 }}>No workouts assigned yet</div>
          <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 280, margin: 0, lineHeight: 1.6 }}>Your coach will assign training plans here once available.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {workouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
        </div>
      )}
    </div>
  );
}
