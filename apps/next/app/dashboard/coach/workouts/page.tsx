'use client';

import { useEffect, useState } from 'react';
import { workoutApi } from '@sams/api';
import type { WorkoutPlan } from '@sams/api';

const DIFFICULTY_COLOR: Record<string, string> = { beginner: '#10B981', intermediate: '#FBBF24', advanced: '#EF4444' };

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setWorkouts(await workoutApi.getWorkouts()); } catch (_) {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Training Plans</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : workouts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No training plans created yet.</div>
        ) : (
          workouts.map((w) => {
            const dc = DIFFICULTY_COLOR[w.difficulty] ?? '#6366F1';
            return (
              <div key={w.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{w.title}</div>
                    {w.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.description}</div>}
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: `${dc}15`, color: dc, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{w.difficulty}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>⏱ {w.duration_minutes} min</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🏋️ {w.exercises.length} exercises</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {w.exercises.slice(0, 3).map((ex, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366F1', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>{ex.name}</span>
                      {ex.sets && ex.reps && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{ex.sets}×{ex.reps}</span>}
                    </div>
                  ))}
                  {w.exercises.length > 3 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 4 }}>+{w.exercises.length - 3} more</div>}
                </div>
                <button onClick={async () => { await workoutApi.deleteWorkout(w.id); await load(); }}
                  style={{ marginTop: 16, background: 'none', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
