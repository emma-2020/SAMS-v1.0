'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Dumbbell } from 'lucide-react';
import { workoutApi } from '@sams/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkoutExercise {
  id?: string;
  description?: string;
  sets_reps_notes?: string;
  sort_order?: number;
}

interface ParentWorkout {
  id: string;
  title: string;
  due_date?: string;
  created_at?: string;
  team_id?: string;
  player_id?: string;
  workout_exercises?: WorkoutExercise[];
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

const ACCENT_COLORS = ['#6366F1', '#7C3AED', '#059669', '#D97706', '#EC4899'];
function accentFor(str?: string) {
  return ACCENT_COLORS[(str?.charCodeAt(0) ?? 0) % ACCENT_COLORS.length];
}

// ─── Read-only Exercise Item ──────────────────────────────────────────────────
function ExerciseItem({ exercise, index, accent }: {
  exercise: WorkoutExercise;
  index: number;
  accent: string;
}) {
  const name = exercise.description ?? 'Exercise';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14, borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: `${accent}12`,
        border: `1.5px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.78rem', fontWeight: 900, color: accent,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)',
        }}>
          {name}
        </div>
        {exercise.sets_reps_notes && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {exercise.sets_reps_notes}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Workout Card (read-only) ─────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: ParentWorkout }) {
  const [expanded, setExpanded] = useState(false);
  const accent  = accentFor(workout.title);
  const due     = daysDue(workout.due_date);
  const exList  = workout.workout_exercises ?? [];
  const exCount = exList.length;

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
                {workout.due_date && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>📅 {fmtDate(workout.due_date)}</span>
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
      </div>

      {/* Toggle row */}
      <div style={{ padding: '10px 16px', background: 'var(--bg-elevated)', borderBottom: exCount > 0 && expanded ? '1px solid var(--border-subtle)' : 'none' }}>
        {exCount > 0 ? (
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
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No exercises defined.</span>
        )}
      </div>

      {/* Expanded exercises (read-only) */}
      {expanded && exCount > 0 && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exList.map((ex, i) => (
            <ExerciseItem key={ex.id ?? i} exercise={ex} index={i} accent={accent} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ParentWorkoutsPage() {
  const [workouts, setWorkouts] = useState<ParentWorkout[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    workoutApi.getWorkouts()
      .then(data => setWorkouts(data as unknown as ParentWorkout[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalExercises = workouts.reduce((s, w) => s + (w.workout_exercises?.length ?? 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Navy header banner ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        borderRadius: 16, padding: '24px 28px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
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
            Parent
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', margin: '0 0 4px' }}>
            Child's Workouts
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Training plans assigned to your child by their coach
          </p>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      {!loading && workouts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
          {([
            { label: 'Workout Plans',   value: workouts.length, color: '#6366F1', Icon: ClipboardList },
            { label: 'Total Exercises', value: totalExercises,  color: '#7C3AED', Icon: Dumbbell      },
          ]).map(({ label, value, color, Icon }) => (
            <div key={label} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color,
              }}>
                <Icon size={20} strokeWidth={1.75} />
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
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
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
          <p style={{ color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto', fontSize: '0.875rem' }}>
            Your child's coach will assign training plans here. Check back soon!
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
