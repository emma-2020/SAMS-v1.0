'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Users, Dumbbell, AlertTriangle } from 'lucide-react';
import { workoutApi, teamsApi, adminApi } from '@sams/api';
import type { UserProfile } from '@sams/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkoutExercise {
  id?: string;
  description?: string;
  sets_reps_notes?: string;
  sort_order?: number;
}

interface AdminWorkout {
  id: string;
  title: string;
  team_id?: string | null;
  player_id?: string | null;
  assigned_by?: string | null;
  due_date?: string | null;
  created_at?: string;
  workout_exercises?: WorkoutExercise[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysDue(iso?: string | null) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' };
  if (diff === 0) return { label: 'Due today',       color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' };
  if (diff <= 3)  return { label: `Due in ${diff}d`, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
  return           { label: `Due ${fmtDate(iso)}`,  color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };
}

const ACCENTS = [
  '#6366F1', '#2563EB', '#059669', '#D97706', '#7C3AED',
  '#0891B2', '#EA580C', '#C026D3', '#0F766E', '#BE123C',
];
function accentFor(str?: string) {
  return ACCENTS[(str?.charCodeAt(0) ?? 0) % ACCENTS.length];
}

function memberName(members: UserProfile[], id?: string | null): string {
  if (!id) return '—';
  const m = members.find(m => m.id === id);
  return m ? `${m.first_name} ${m.last_name}` : '—';
}

// ─── Workout Card ─────────────────────────────────────────────────────────────
function WorkoutCard({
  workout, teamName, coachName, playerName, onDelete,
}: {
  workout: AdminWorkout;
  teamName: string;
  coachName: string;
  playerName: string;
  onDelete: (id: string) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const accent   = accentFor(workout.title);
  const due      = daysDue(workout.due_date);
  const exList   = workout.workout_exercises ?? [];
  const exCount  = exList.length;
  const chips    = exList.slice(0, 3);
  const extra    = exCount - 3;
  const target   = workout.team_id ? `👥 ${teamName}` : `👤 ${playerName}`;

  return (
    <div
      style={{ background: '#FFFFFF', borderRadius: 20, border: '1.5px solid #E8EDF5', boxShadow: '0 2px 10px rgba(15,23,42,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.boxShadow = `0 8px 32px ${accent}14`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDF5'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Top accent strip */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      {/* Card header */}
      <div style={{ padding: '18px 20px 14px', background: `linear-gradient(140deg, ${accent}0C, ${accent}04)`, borderBottom: `1px solid ${accent}12` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${accent}30`, fontSize: '1.2rem' }}>
            🏋️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {workout.title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.71rem', color: '#64748B' }}>{target}</span>
              <span style={{ color: '#CBD5E1', fontSize: '0.55rem' }}>●</span>
              <span style={{ fontSize: '0.71rem', color: '#64748B' }}>🏋️ {exCount} exercise{exCount !== 1 ? 's' : ''}</span>
              <span style={{ color: '#CBD5E1', fontSize: '0.55rem' }}>●</span>
              <span style={{ fontSize: '0.71rem', color: '#64748B' }}>Assigned by <strong style={{ color: '#334155' }}>{coachName}</strong></span>
            </div>
          </div>
          {due && (
            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, flexShrink: 0, background: due.bg, color: due.color, border: `1px solid ${due.border}` }}>
              {due.label}
            </span>
          )}
        </div>
      </div>

      {/* Exercise chips */}
      {exCount > 0 && (
        <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
          {chips.map((ex, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: `${accent}09`, border: `1px solid ${accent}1A`, fontSize: '0.7rem', fontWeight: 600, color: '#334155', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, background: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900, color: 'white' }}>{i + 1}</span>
              {ex.description ?? '—'}
            </span>
          ))}
          {extra > 0 && (
            <span style={{ padding: '3px 9px', borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8' }}>+{extra} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 18px', marginTop: 'auto', borderTop: '1px solid #F4F6FA', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: '#94A3B8' }}>
          {workout.created_at && <span>📅 {fmtDate(workout.created_at)}</span>}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {exCount > 0 && (
            <button
              onClick={() => setExpanded(p => !p)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: expanded ? `${accent}12` : '#F1F5F9', border: `1px solid ${expanded ? `${accent}25` : '#E2E8F0'}`, color: expanded ? accent : '#64748B', fontSize: '0.71rem', fontWeight: 700, transition: 'all 0.2s' }}>
              {expanded ? 'Collapse ▲' : 'View all ▶'}
            </button>
          )}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFE4E6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF1F2'; }}
              title="Delete workout"
            >
              🗑
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Remove?</span>
              <button onClick={() => onDelete(workout.id)} style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: '#EF4444', color: '#fff', border: 'none', fontSize: '0.71rem', fontWeight: 700 }}>Yes</button>
              <button onClick={() => setConfirming(false)} style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', fontSize: '0.71rem', fontWeight: 600 }}>No</button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded exercises */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '14px 20px', background: `linear-gradient(180deg, ${accent}05, transparent)` }}>
          {exList.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < exList.length - 1 ? '1px solid #F8FAFC' : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: 'white' }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>{ex.description ?? '—'}</div>
                {ex.sets_reps_notes && <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 2 }}>{ex.sets_reps_notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminWorkoutsPage() {
  const [workouts, setWorkouts] = useState<AdminWorkout[]>([]);
  const [members,  setMembers]  = useState<UserProfile[]>([]);
  const [teams,    setTeams]    = useState<Array<{ id: string; name: string }>>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all' | string>('all'); // 'all' | team_id

  useEffect(() => {
    Promise.all([
      workoutApi.getWorkouts().catch(() => []),
      adminApi.getMembers().catch(() => []),
      teamsApi.getTeams().catch(() => []),
    ]).then(([w, m, t]) => {
      setWorkouts(w as unknown as AdminWorkout[]);
      setMembers(m);
      setTeams(t as unknown as Array<{ id: string; name: string }>);
    }).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    try {
      await workoutApi.deleteWorkout(id);
      setWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (_) {}
  }

  // Build lookup maps
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t.name]));

  // Filter
  const filtered = filter === 'all'
    ? workouts
    : workouts.filter(w => w.team_id === filter);

  // Stats
  const totalExercises    = workouts.reduce((s, w) => s + (w.workout_exercises?.length ?? 0), 0);
  const teamsWithPlans    = new Set(workouts.map(w => w.team_id).filter(Boolean)).size;
  const overduePlans      = workouts.filter(w => w.due_date && new Date(w.due_date) < new Date()).length;

  // Teams that have at least one workout
  const activeTeams = teams.filter(t => workouts.some(w => w.team_id === t.id));

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Cliniva Hero ────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius: 20, padding: '28px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(79,70,229,0.28)' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 100, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Admin</div>
          <h1 style={{ fontSize: 'clamp(1.4rem,4vw,1.8rem)', fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Training Overview</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>All workout plans assigned across the academy</p>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
          {([
            { label: 'Total Plans',     value: workouts.length, grad: 'linear-gradient(135deg,#6366F1,#818CF8)', shadow: 'rgba(99,102,241,0.28)' },
            { label: 'Teams w/ Plans',  value: teamsWithPlans,  grad: 'linear-gradient(135deg,#2563EB,#3B82F6)', shadow: 'rgba(37,99,235,0.28)'  },
            { label: 'Total Exercises', value: totalExercises,  grad: 'linear-gradient(135deg,#059669,#10B981)', shadow: 'rgba(5,150,105,0.28)'  },
            { label: 'Overdue',         value: overduePlans,    grad: 'linear-gradient(135deg,#DC2626,#EF4444)', shadow: 'rgba(220,38,38,0.28)'  },
          ]).map(({ label, value, grad, shadow }) => (
            <div key={label} style={{ background: grad, borderRadius: 16, padding: '20px 20px', position: 'relative', overflow: 'hidden', boxShadow: `0 6px 20px ${shadow}` }}>
              <div style={{ position: 'absolute', right: -14, top: -14, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', marginBottom: 10 }}>{label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Team filter pills ─────────────────────────────────────────────────── */}
      {!loading && activeTeams.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[{ id: 'all', name: 'All Teams' }, ...activeTeams].map(t => {
            const active = filter === t.id;
            const color  = accentFor(t.name);
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                style={{ padding: '5px 14px', borderRadius: 99, border: `1.5px solid ${active ? color : 'var(--border-default)'}`, background: active ? `${color}12` : 'var(--bg-surface)', color: active ? color : 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 20 }} />)}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && workouts.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC, #EEF2FF)', borderRadius: 20, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: 8 }}>No training plans yet</div>
          <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 320, margin: 0 }}>
            Your coaches haven't assigned any workout plans yet. They create and assign plans from their own dashboard.
          </p>
        </div>
      )}

      {/* ── Filtered empty state ─────────────────────────────────────────────── */}
      {!loading && workouts.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 32px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No plans for this team</div>
          <button onClick={() => setFilter('all')} style={{ marginTop: 12, padding: '6px 16px', borderRadius: 8, background: '#6366F1', color: 'white', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Show all teams</button>
        </div>
      )}

      {/* ── Workout grid ─────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
          {filtered.map(w => (
            <WorkoutCard
              key={w.id}
              workout={w}
              teamName={teamMap[w.team_id ?? ''] ?? 'Unknown Team'}
              coachName={memberName(members, w.assigned_by)}
              playerName={memberName(members, w.player_id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
