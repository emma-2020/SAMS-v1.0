'use client';

import { useState, useEffect } from 'react';
import { workoutApi, teamsApi, coachApi } from '@sams/api';
import type { WorkoutPlan, Team } from '@sams/api';

// ─── Types ──────────────────────────────────────────────────────────
interface Assignment {
  id: string; title: string; due_date?: string; created_at?: string;
  workout_exercises?: Array<{ id?: string; description?: string; sets_reps_notes?: string; sort_order?: number; name?: string; sets?: number; reps?: number; notes?: string }>;
  exercises?: Array<{ name?: string; description?: string; sets?: number; reps?: number; notes?: string; sets_reps_notes?: string }>;
  teams?: { id: string; name: string };
  difficulty?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysDue(iso?: string | null) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', glow: 'rgba(239,68,68,0.18)' };
  if (diff === 0) return { label: 'Due today',       color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', glow: 'rgba(217,119,6,0.2)' };
  if (diff <= 3)  return { label: `Due in ${diff}d`, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', glow: 'rgba(217,119,6,0.12)' };
  return           { label: `Due ${fmtDate(iso)}`,  color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', glow: 'none' };
}
const ACCENTS = [
  { from: '#6366F1', to: '#8B5CF6' }, { from: '#7C3AED', to: '#EC4899' },
  { from: '#059669', to: '#0D9488' }, { from: '#D97706', to: '#EA580C' },
  { from: '#7C3AED', to: '#C026D3' },
];
function accentFor(str?: string) {
  return ACCENTS[(str?.charCodeAt(0) ?? 0) % ACCENTS.length];
}
function getExercises(a: Assignment): Array<{ name?: string; description?: string; sets_reps_notes?: string; sets?: number; reps?: number; notes?: string }> {
  return a.workout_exercises ?? a.exercises ?? [];
}

// ─── Create Workout Modal ────────────────────────────────────────────
function CreateWorkoutModal({ teams, players, onClose, onCreated }: {
  teams: Team[];
  players: Array<{ id: string; first_name: string; last_name: string }>;
  onClose: () => void;
  onCreated: (a: Assignment) => void;
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
      onCreated(result as unknown as Assignment); onClose();
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

// ─── Assignment Card ─────────────────────────────────────────────────
function AssignmentCard({ assignment, onDelete }: { assignment: Assignment; onDelete: (id: string) => void }) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const due     = daysDue(assignment.due_date);
  const accent  = accentFor(assignment.title);
  const exList  = getExercises(assignment);
  const exCount = exList.length;
  const chips   = exList.slice(0, 3);
  const extra   = exCount - 3;

  return (
    <div
      style={{ background: '#FFFFFF', borderRadius: 20, border: '1.5px solid #E8EDF5', boxShadow: '0 2px 10px rgba(15,23,42,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.border = `1.5px solid ${accent.from}40`; e.currentTarget.style.boxShadow = `0 8px 32px ${accent.from}14`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.border = '1.5px solid #E8EDF5'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'none'; }}>

      {/* Card header */}
      <div style={{ padding: '20px 20px 16px', background: `linear-gradient(140deg, ${accent.from}0C, ${accent.to}06)`, borderBottom: `1px solid ${accent.from}12`, position: 'relative', overflow: 'hidden' }}>
        {/* Background illustration */}
        <div style={{ position: 'absolute', right: -14, top: -14, pointerEvents: 'none', opacity: 0.3 }}>
          <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
            <circle cx="55" cy="55" r="42" stroke={accent.from} strokeWidth="1.5" />
            <circle cx="55" cy="55" r="28" stroke={accent.from} strokeWidth="1" opacity="0.5" />
            <rect x="28" y="52" width="12" height="6" rx="3" fill={accent.from} opacity="0.5" />
            <rect x="70" y="52" width="12" height="6" rx="3" fill={accent.from} opacity="0.5" />
            <rect x="40" y="44" width="4" height="22" rx="2" fill={accent.from} opacity="0.6" />
            <rect x="66" y="44" width="4" height="22" rx="2" fill={accent.from} opacity="0.6" />
            <line x1="44" y1="55" x2="66" y2="55" stroke={accent.from} strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, position: 'relative' }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${accent.from}30`, fontSize: '1.25rem' }}>
            🏋️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.97rem', color: '#0F172A', lineHeight: 1.3, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {assignment.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>🏋️ {exCount} exercise{exCount !== 1 ? 's' : ''}</span>
              <span style={{ color: '#CBD5E1', fontSize: '0.55rem' }}>●</span>
              {assignment.created_at && <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>🕐 {fmtDate(assignment.created_at)}</span>}
            </div>
          </div>
          {due && (
            <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, flexShrink: 0, background: due.bg, color: due.color, border: `1px solid ${due.border}`, boxShadow: due.glow !== 'none' ? `0 2px 8px ${due.glow}` : 'none' }}>
              {due.label}
            </span>
          )}
        </div>
      </div>

      {/* Exercise chips */}
      {exCount > 0 && (
        <div style={{ padding: '13px 18px', display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
          {chips.map((ex, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: `${accent.from}09`, border: `1px solid ${accent.from}1A`, fontSize: '0.71rem', fontWeight: 600, color: '#334155', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', fontWeight: 900, color: 'white' }}>{i + 1}</span>
              {ex.description ?? ex.name}
            </span>
          ))}
          {extra > 0 && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.71rem', fontWeight: 600, color: '#94A3B8' }}>+{extra} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 18px', marginTop: 'auto', borderTop: '1px solid #F4F6FA', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {assignment.teams && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.71rem', color: '#64748B' }}>
            👥 <span>{assignment.teams.name}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 7, marginLeft: 'auto' }}>
          <button onClick={() => setExpanded(p => !p)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: expanded ? `${accent.from}12` : '#F1F5F9', border: `1px solid ${expanded ? `${accent.from}25` : '#E2E8F0'}`, color: expanded ? accent.from : '#64748B', fontSize: '0.71rem', fontWeight: 700, transition: 'all 0.2s' }}>
            {expanded ? 'Collapse ▲' : 'View all ▶'}
          </button>
          {!confirming ? (
            <button onClick={() => setConfirming(true)}
              style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFE4E6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF1F2'; }}>
              🗑
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onDelete(assignment.id)} style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: '#EF4444', color: '#fff', border: 'none', fontSize: '0.71rem', fontWeight: 700 }}>Delete</button>
              <button onClick={() => setConfirming(false)} style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', fontSize: '0.71rem', fontWeight: 600 }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '16px 20px', background: `linear-gradient(180deg, ${accent.from}05, transparent)` }}>
          {exCount === 0 ? (
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic' }}>No exercises added.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {exList.map((ex, i) => (
                <div key={i} style={{ display: 'flex', gap: 13, padding: '10px 0', borderBottom: i < exList.length - 1 ? '1px solid #F8FAFC' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: 'white' }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{ex.description ?? ex.name}</div>
                    {(ex.sets_reps_notes || (ex.sets && ex.reps)) && (
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                        {ex.sets_reps_notes ?? `${ex.sets}×${ex.reps}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function WorkoutsPage() {
  const [showModal,    setShowModal]    = useState(false);
  const [assignments,  setAssignments]  = useState<Assignment[]>([]);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [players,      setPlayers]      = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [loading,      setLoading]      = useState(true);

  async function load() {
    setLoading(true);
    try {
      const raw = await workoutApi.getWorkouts();
      const list = Array.isArray(raw) ? raw : ((raw as any)?.assignments ?? []);
      setAssignments(list as Assignment[]);
    }
    catch (_) {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    teamsApi.getTeams().then(setTeams).catch(() => {});
    coachApi.getPlayers().then((data: any) => {
      const ps = Array.isArray(data) ? data : (data?.players ?? []);
      setPlayers(ps);
    }).catch(() => {});
  }, []);

  function handleCreated(a: Assignment) { setAssignments(prev => [a, ...prev]); }
  async function handleDelete(id: string) {
    try { await workoutApi.deleteWorkout(id); setAssignments(prev => prev.filter(a => a.id !== id)); } catch (_) {}
  }

  const totalExercises = assignments.reduce((s, a) => s + getExercises(a).length, 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem,4vw,1.55rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>Training Plans</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
            {assignments.length} plan{assignments.length !== 1 ? 's' : ''} · {totalExercises} total exercises
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          + Create Plan
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 20 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 20 }} />)}
        </div>
      ) : !assignments.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)', borderRadius: 20, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: 8 }}>No training plans yet</div>
          <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 300, margin: '0 0 20px' }}>Create your first plan to assign structured workouts to your players.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>+ Create First Plan</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
          {assignments.map(a => <AssignmentCard key={a.id} assignment={a} onDelete={handleDelete} />)}
        </div>
      )}

      {showModal && <CreateWorkoutModal teams={teams} players={players} onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
