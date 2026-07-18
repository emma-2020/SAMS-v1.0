'use client';

import { useState } from 'react';
import { workoutApi } from '@sams/api';
import type { Team } from '@sams/api';

/**
 * CreateWorkoutModal
 * ───────────────────
 * Shared "Create Training Plan" form used by both the Coach and Admin
 * Workouts pages. POST /api/workouts allows both roles (see
 * backend/src/routes/workout.routes.js), and the resulting assignment is
 * attributed via `assigned_by` to whichever role created it.
 */

// Loosely typed to match the raw shape returned by POST /api/workouts
// (workout_assignments row + workout_exercises). Callers cast this into
// their own local list-item type, matching the existing pattern in
// this codebase for workout API responses.
export interface CreatedWorkout {
  id: string;
  title: string;
  team_id?: string | null;
  player_id?: string | null;
  assigned_by?: string | null;
  due_date?: string | null;
  created_at?: string;
  workout_exercises?: Array<{ id?: string; description?: string; sets_reps_notes?: string; sort_order?: number }>;
}

export function CreateWorkoutModal({ teams, players, onClose, onCreated }: {
  teams: Team[];
  players: Array<{ id: string; first_name: string; last_name: string }>;
  onClose: () => void;
  onCreated: (a: CreatedWorkout) => void;
}) {
  const [form, setForm] = useState({ title: '', targetType: 'team', team_id: teams[0]?.id || '', player_id: '', due_date: '' });
  const [exercises, setExercises] = useState([{ description: '', sets_reps_notes: '' }]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function addExercise() { setExercises(ex => [...ex, { description: '', sets_reps_notes: '' }]); }
  function removeExercise(i: number) { setExercises(ex => ex.filter((_, idx) => idx !== i)); }
  function setExercise(i: number, k: string, v: string) { setExercises(ex => ex.map((e, idx) => idx === i ? { ...e, [k]: v } : e)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || exercises.every(ex => !ex.description.trim())) return;
    const validExs = exercises.filter(ex => ex.description.trim());
    const payload: any = {
      title:     form.title.trim(),
      due_date:  form.due_date || null,
      exercises: validExs.map(ex => ({ name: ex.description.trim(), notes: ex.sets_reps_notes.trim() || undefined })),
      difficulty: 'intermediate',
      duration_minutes: 60,
    };
    if (form.targetType === 'team'   && form.team_id)   payload.team_id   = form.team_id;
    if (form.targetType === 'player' && form.player_id) payload.player_id = form.player_id;
    setLoading(true); setError('');
    try {
      const result = await workoutApi.createWorkout(payload);
      onCreated(result as unknown as CreatedWorkout); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    }
    setLoading(false);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(12px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 301, width: 580, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 24, border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 32px 80px rgba(15,23,42,0.22)', animation: 'fadeIn 0.18s ease' }}>
        {/* Header */}
        <div style={{ padding: '22px 26px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(124,58,237,0.03))', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 2, borderRadius: '24px 24px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
              <span style={{ fontSize: '1.25rem' }}>🏋️</span>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.02rem', color: '#0F172A', letterSpacing: '-0.02em' }}>Create Training Plan</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 1 }}>Assign structured exercises to a team or player</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', fontSize: '1.1rem' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{error}</div>}

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Plan Title <span style={{ color: '#EC4899' }}>*</span></label>
            <input placeholder="e.g. Pre-season Strength Block" value={form.title} onChange={e => setF('title', e.target.value)} required
              style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }} />
          </div>

          {/* Assign To */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Assign To</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {[
                { key: 'team',   label: 'Entire Team',     icon: '👥', desc: 'All team members'    },
                { key: 'player', label: 'Specific Player', icon: '👤', desc: 'Individual athlete'   },
              ].map(({ key, label, icon, desc }) => {
                const active = form.targetType === key;
                return (
                  <button key={key} type="button" onClick={() => setF('targetType', key)}
                    style={{ padding: '12px 14px', borderRadius: 13, cursor: 'pointer', textAlign: 'left', border: active ? '2px solid #7C3AED' : '1.5px solid #E2E8F0', background: active ? 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' : '#F8FAFC', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s', boxShadow: active ? '0 2px 12px rgba(124,58,237,0.12)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: active ? 'linear-gradient(135deg, #7C3AED, #6366F1)' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: 'all 0.2s' }}>{icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: active ? '#4F46E5' : '#334155' }}>{label}</div>
                      <div style={{ fontSize: '0.67rem', color: active ? '#7C3AED' : '#94A3B8', marginTop: 1 }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 10 }}>
              {form.targetType === 'team' ? (
                <select value={form.team_id} onChange={e => setF('team_id', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '0.875rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                  <option value="">Select a team…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.sport ? ` · ${t.sport}` : ''}</option>)}
                </select>
              ) : (
                <select value={form.player_id} onChange={e => setF('player_id', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '0.875rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                  <option value="">Select a player…</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Due Date <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
            <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }} />
          </div>

          {/* Exercises */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Exercises</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.18)' }}>{exercises.length}</span>
              </div>
              <button type="button" onClick={addExercise}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, cursor: 'pointer', background: 'linear-gradient(135deg, #6366F1, #7C3AED)', color: 'white', border: 'none', fontSize: '0.72rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(99,102,241,0.28)' }}>
                + Add Exercise
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #E8EEFB', background: '#FAFCFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: 'white' }}>{i + 1}</div>
                    <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8' }}>Exercise {i + 1}</span>
                    {exercises.length > 1 && (
                      <button type="button" onClick={() => removeExercise(i)}
                        style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'none'; }}>
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input placeholder="Exercise name (e.g. Barbell Back Squat)" value={ex.description} onChange={e => setExercise(i, 'description', e.target.value)} required={i === 0}
                      style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }} />
                    <input placeholder="Sets / Reps / Notes (e.g. 4 × 8 @ 70%RM)" value={ex.sets_reps_notes} onChange={e => setExercise(i, 'sets_reps_notes', e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, cursor: 'pointer', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#475569', fontSize: '0.875rem', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#94A3B8' : 'linear-gradient(135deg, #6366F1, #7C3AED)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.875rem', boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.32)' }}>
              {loading ? 'Creating…' : '+ Create Training Plan'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
