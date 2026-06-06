// src/pages/coach/WorkoutsPage.jsx — Training Plans Premium v2
import { useState } from 'react';
import { useApi, useSubmit }  from '../../hooks/useApi';
import { workoutApi }         from '../../services/workout.api';
import { teamsApi }           from '../../services/teams.api';
import { coachApi }           from '../../services/coach.api';
import { PageHeader, EmptyState } from '../../components/shared/ui';
import {
  Dumbbell, Users, User, Calendar, ChevronRight, X,
  Plus, Trash2, Check, ChevronDown, Clock,
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysDue(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA',  glow: 'rgba(239,68,68,0.18)'  };
  if (diff === 0) return { label: 'Due today',      color: '#D97706', bg: '#FEF3C7', border: '#FCD34D',  glow: 'rgba(217,119,6,0.2)'   };
  if (diff <= 3)  return { label: `Due in ${diff}d`, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',  glow: 'rgba(217,119,6,0.12)'  };
  return           { label: `Due ${fmtDate(iso)}`,  color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0',  glow: 'none'                  };
}

// deterministic accent per plan title
const ACCENTS = [
  { from: '#6366F1', to: '#8B5CF6' },
  { from: '#2563EB', to: '#0891B2' },
  { from: '#059669', to: '#0D9488' },
  { from: '#D97706', to: '#EA580C' },
  { from: '#7C3AED', to: '#C026D3' },
];
function accentFor(str) {
  return ACCENTS[(str?.charCodeAt(0) ?? 0) % ACCENTS.length];
}

// ─── Micro-illustration SVG ───────────────────────────────────────
function SportIllustration({ color }) {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="55" r="42" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <circle cx="55" cy="55" r="28" stroke={color} strokeWidth="1" opacity="0.2" />
      <rect x="28" y="52" width="12" height="6" rx="3" fill={color} opacity="0.4" />
      <rect x="70" y="52" width="12" height="6" rx="3" fill={color} opacity="0.4" />
      <rect x="40" y="44" width="4" height="22" rx="2" fill={color} opacity="0.5" />
      <rect x="66" y="44" width="4" height="22" rx="2" fill={color} opacity="0.5" />
      <line x1="44" y1="55" x2="66" y2="55" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// ─── Styled Select ────────────────────────────────────────────────
function StyledSelect({ value, onChange, options, placeholder, icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <div style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: focused ? '#2563EB' : '#94A3B8', transition: 'color 0.15s', pointerEvents: 'none', zIndex: 1,
        }}>
          {icon}
        </div>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: `10px 36px 10px ${icon ? '40px' : '14px'}`,
          borderRadius: 12, appearance: 'none', cursor: 'pointer',
          border: focused ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: '#FFFFFF', color: value ? '#0F172A' : '#94A3B8',
          fontSize: '0.875rem', fontWeight: 500,
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
          outline: 'none', transition: 'all 0.2s',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        color: '#94A3B8', pointerEvents: 'none',
      }}>
        <ChevronDown size={14} />
      </div>
    </div>
  );
}

// ─── Modal Field ──────────────────────────────────────────────────
function ModalField({ label, subtitle, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </label>
        {subtitle && <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 500 }}>({subtitle})</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Create Workout Modal ─────────────────────────────────────────
function CreateWorkoutModal({ teams, players, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', targetType: 'team',
    team_id: teams[0]?.id || '', player_id: '', due_date: '',
  });
  const [exercises, setExercises] = useState([{ description: '', sets_reps_notes: '' }]);
  const { submit, loading, error } = useSubmit(workoutApi.createAssignment);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function addExercise() { setExercises(ex => [...ex, { description: '', sets_reps_notes: '' }]); }
  function removeExercise(i) { setExercises(ex => ex.filter((_, idx) => idx !== i)); }
  function setExercise(i, k, v) { setExercises(ex => ex.map((e, idx) => idx === i ? { ...e, [k]: v } : e)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || exercises.every(ex => !ex.description.trim())) return;
    const validExercises = exercises.filter(ex => ex.description.trim());
    const payload = {
      title:     form.title.trim(),
      due_date:  form.due_date || null,
      exercises: validExercises.map(ex => ({
        description:     ex.description.trim(),
        sets_reps_notes: ex.sets_reps_notes.trim() || null,
      })),
    };
    if (form.targetType === 'team'   && form.team_id)   payload.team_id   = form.team_id;
    if (form.targetType === 'player' && form.player_id) payload.player_id = form.player_id;
    const { ok, data } = await submit(payload);
    if (ok) { onCreated(data); onClose(); }
  }

  const assignOptions = [
    { key: 'team',   label: 'Entire Team',     icon: Users, desc: 'All team members' },
    { key: 'player', label: 'Specific Player', icon: User,  desc: 'Individual athlete' },
  ];

  return (
    <>
      {/* Frosted backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Modal canvas */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301, width: 580, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto',
        background: '#FFFFFF', borderRadius: 24,
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 32px 80px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.12)',
        animation: 'fadeIn 0.18s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 26px 18px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(37,99,235,0.03))',
          borderBottom: '1px solid #F1F5F9',
          position: 'sticky', top: 0, zIndex: 2, borderRadius: '24px 24px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'linear-gradient(135deg, #6366F1, #2563EB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            }}>
              <Dumbbell size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.02rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
                Create Training Plan
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 1 }}>
                Assign structured exercises to a team or player
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94A3B8', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{error}</div>}

          {/* Plan Title */}
          <ModalField label="Plan Title" subtitle="required">
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}>
                <Dumbbell size={14} />
              </div>
              <input
                className="input"
                placeholder="e.g. Pre-season Strength Block"
                value={form.title}
                onChange={e => setF('title', e.target.value)}
                required
                style={{ paddingLeft: 40 }}
              />
            </div>
          </ModalField>

          {/* Assign To — polished toggle group */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Assign To
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {assignOptions.map(({ key, label, icon: Icon, desc }) => {
                const active = form.targetType === key;
                return (
                  <button
                    key={key} type="button"
                    onClick={() => setF('targetType', key)}
                    style={{
                      padding: '12px 14px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                      border: active ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
                      background: active ? 'linear-gradient(135deg, #EFF6FF, #EEF2FF)' : '#F8FAFC',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      boxShadow: active ? '0 2px 12px rgba(37,99,235,0.12)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: active ? 'linear-gradient(135deg, #2563EB, #6366F1)' : '#E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: active ? 'white' : '#94A3B8',
                      transition: 'all 0.2s', boxShadow: active ? '0 3px 10px rgba(37,99,235,0.25)' : 'none',
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: active ? '#1D4ED8' : '#334155', transition: 'color 0.15s' }}>{label}</div>
                      <div style={{ fontSize: '0.67rem', color: active ? '#3B82F6' : '#94A3B8', marginTop: 1, transition: 'color 0.15s' }}>{desc}</div>
                    </div>
                    {active && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={10} color="white" strokeWidth={3.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 10 }}>
              {form.targetType === 'team' ? (
                <StyledSelect
                  value={form.team_id}
                  onChange={v => setF('team_id', v)}
                  options={teams.map(t => ({ value: t.id, label: `${t.name}${t.sport ? ` · ${t.sport}` : ''}` }))}
                  placeholder="Select a team…"
                  icon={<Users size={14} />}
                />
              ) : (
                <StyledSelect
                  value={form.player_id}
                  onChange={v => setF('player_id', v)}
                  options={players.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))}
                  placeholder="Select a player…"
                  icon={<User size={14} />}
                />
              )}
            </div>
          </div>

          {/* Due Date */}
          <ModalField label="Due Date" subtitle="optional">
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}>
                <Calendar size={14} />
              </div>
              <input
                className="input"
                type="date"
                value={form.due_date}
                onChange={e => setF('due_date', e.target.value)}
                style={{ paddingLeft: 40 }}
              />
            </div>
          </ModalField>

          {/* Exercises block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Exercises
                </span>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                  background: 'rgba(99,102,241,0.1)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.18)',
                }}>
                  {exercises.length}
                </span>
              </div>
              <button
                type="button" onClick={addExercise}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366F1, #2563EB)',
                  color: 'white', border: 'none',
                  fontSize: '0.72rem', fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(99,102,241,0.28)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.28)'; e.currentTarget.style.transform = 'none'; }}
              >
                <Plus size={12} strokeWidth={3} /> Add Exercise
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: '1.5px solid #E8EEFB',
                  background: '#FAFCFF',
                  transition: 'all 0.2s',
                }}>
                  {/* Exercise sub-header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px',
                    background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)',
                    borderBottom: '1px solid #F1F5F9',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366F1, #2563EB)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 900, color: 'white',
                      boxShadow: '0 2px 6px rgba(99,102,241,0.22)',
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8' }}>
                      Exercise {i + 1}
                    </span>
                    {exercises.length > 1 && (
                      <button
                        type="button" onClick={() => removeExercise(i)}
                        style={{
                          width: 26, height: 26, borderRadius: 7, border: 'none',
                          background: 'none', cursor: 'pointer', color: '#CBD5E1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'none'; }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Exercise inputs */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Exercise name (e.g. Barbell Back Squat)"
                      value={ex.description}
                      onChange={e => setExercise(i, 'description', e.target.value)}
                      required={i === 0}
                      style={{ borderRadius: 10, fontSize: '0.875rem' }}
                    />
                    <input
                      className="input"
                      placeholder="Sets / Reps / Notes (e.g. 4 × 8 @ 70%RM)"
                      value={ex.sets_reps_notes}
                      onChange={e => setExercise(i, 'sets_reps_notes', e.target.value)}
                      style={{ borderRadius: 10, fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit row */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button
              type="submit" disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #6366F1, #2563EB)',
                color: 'white', border: 'none',
                fontWeight: 700, fontSize: '0.875rem',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.32)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 14px rgba(99,102,241,0.32)'; e.currentTarget.style.transform = 'none'; }}
            >
              {loading ? 'Creating…' : <><Plus size={14} strokeWidth={2.5} /> Create Training Plan</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Assignment Card (premium grid card) ─────────────────────────
function AssignmentCard({ assignment, onDelete }) {
  const [expanded, setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const due     = daysDue(assignment.due_date);
  const accent  = accentFor(assignment.title);
  const exList  = (assignment.workout_exercises || []).sort((a, b) => a.sort_order - b.sort_order);
  const exCount = exList.length;
  const chips   = exList.slice(0, 3);
  const extra   = exCount - 3;

  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: 20,
        border: '1.5px solid #E8EDF5',
        boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1.5px solid ${accent.from}40`;
        e.currentTarget.style.boxShadow = `0 8px 32px ${accent.from}14, 0 2px 8px rgba(15,23,42,0.05)`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = '1.5px solid #E8EDF5';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.05)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Card header with gradient + micro-illustration */}
      <div style={{
        padding: '20px 20px 16px',
        background: `linear-gradient(140deg, ${accent.from}0C, ${accent.to}06)`,
        borderBottom: `1px solid ${accent.from}12`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background illustration */}
        <div style={{ position: 'absolute', right: -14, top: -14, pointerEvents: 'none' }}>
          <SportIllustration color={accent.from} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, position: 'relative' }}>
          {/* Icon */}
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${accent.from}30`,
          }}>
            <Dumbbell size={21} color="white" />
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: '0.97rem', color: '#0F172A',
              lineHeight: 1.3, marginBottom: 5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {assignment.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Dumbbell size={11} style={{ color: '#94A3B8' }} /> {exCount} exercise{exCount !== 1 ? 's' : ''}
              </span>
              <span style={{ color: '#CBD5E1', fontSize: '0.55rem' }}>●</span>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} style={{ color: '#CBD5E1' }} /> {fmtDate(assignment.created_at)}
              </span>
            </div>
          </div>

          {/* Due badge */}
          {due && (
            <span style={{
              fontSize: '0.66rem', fontWeight: 800, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: due.bg, color: due.color, border: `1px solid ${due.border}`,
              letterSpacing: '0.01em',
              boxShadow: due.glow !== 'none' ? `0 2px 8px ${due.glow}` : 'none',
            }}>
              {due.label}
            </span>
          )}
        </div>
      </div>

      {/* Exercise chips */}
      {exCount > 0 && (
        <div style={{ padding: '13px 18px', display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
          {chips.map((ex, i) => (
            <span key={ex.id || i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 8,
              background: `${accent.from}09`, border: `1px solid ${accent.from}1A`,
              fontSize: '0.71rem', fontWeight: 600, color: '#334155',
              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.52rem', fontWeight: 900, color: 'white',
              }}>
                {i + 1}
              </span>
              {ex.description}
            </span>
          ))}
          {extra > 0 && (
            <span style={{
              padding: '4px 10px', borderRadius: 8,
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              fontSize: '0.71rem', fontWeight: 600, color: '#94A3B8',
            }}>
              +{extra} more
            </span>
          )}
        </div>
      )}

      {/* Card footer */}
      <div style={{
        padding: '10px 18px', marginTop: 'auto',
        borderTop: '1px solid #F4F6FA',
        background: '#FAFBFC',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Team target */}
        {assignment.teams && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.71rem', color: '#64748B' }}>
            <Users size={12} style={{ color: '#94A3B8' }} />
            <span>{assignment.teams.name}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 7, marginLeft: 'auto' }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              background: expanded ? `${accent.from}12` : '#F1F5F9',
              border: `1px solid ${expanded ? `${accent.from}25` : '#E2E8F0'}`,
              color: expanded ? accent.from : '#64748B',
              fontSize: '0.71rem', fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            {expanded ? 'Collapse' : 'View all'}
            <ChevronRight
              size={12}
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
            />
          </button>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              style={{
                width: 32, height: 32, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                background: '#FFF1F2', border: '1px solid #FECDD3',
                color: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFE4E6'; e.currentTarget.style.borderColor = '#FDA4AF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFF1F2'; e.currentTarget.style.borderColor = '#FECDD3'; }}
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onDelete(assignment.id)}
                style={{
                  padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  background: '#EF4444', color: '#fff', border: 'none',
                  fontSize: '0.71rem', fontWeight: 700, transition: 'all 0.15s',
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0',
                  fontSize: '0.71rem', fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded exercise list */}
      {expanded && (
        <div style={{
          borderTop: '1px solid #F1F5F9', padding: '16px 20px',
          background: `linear-gradient(180deg, ${accent.from}05, transparent)`,
        }}>
          {exCount === 0 ? (
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic' }}>No exercises added.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {exList.map((ex, i) => (
                <div key={ex.id} style={{
                  display: 'flex', gap: 13, padding: '10px 0',
                  borderBottom: i < exList.length - 1 ? '1px solid #F8FAFC' : 'none',
                  alignItems: 'flex-start', transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 900, color: 'white',
                    boxShadow: `0 2px 6px ${accent.from}25`,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{ex.description}</div>
                    {ex.sets_reps_notes && (
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{ex.sets_reps_notes}</div>
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

// ─── Main Page ────────────────────────────────────────────────────
export default function WorkoutsPage() {
  const [showModal, setShowModal] = useState(false);

  const { data: assignments, loading, error, setData } = useApi(
    () => workoutApi.getAssignments(),
    [], { fallback: [] }
  );
  const { data: teamsData }   = useApi(() => teamsApi.listTeams(),     [], { fallback: [] });
  const { data: playersData } = useApi(() => coachApi.getPlayers(),    [], { fallback: { players: [] } });
  const { submit: deleteSubmit } = useSubmit(workoutApi.deleteAssignment);

  function handleCreated(newAssignment) { setData(prev => [newAssignment, ...(prev || [])]); }
  async function handleDelete(id) {
    const { ok } = await deleteSubmit(id);
    if (ok) setData(prev => (prev || []).filter(a => a.id !== id));
  }

  const teams          = teamsData || [];
  const players        = playersData?.players || [];
  const totalExercises = (assignments || []).reduce((s, a) => s + (a.workout_exercises?.length ?? 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Training Plans"
        subtitle={`${(assignments || []).length} plan${(assignments || []).length !== 1 ? 's' : ''} · ${totalExercises} total exercises`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} /> Create Plan
          </button>
        }
      />

      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 20 }} />
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : !(assignments || []).length ? (
        <EmptyState
          icon={<Dumbbell size={26} />}
          title="No training plans yet"
          subtitle="Create your first plan to assign structured workouts to your players."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 auto' }}
            >
              <Plus size={15} /> Create First Plan
            </button>
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {(assignments || []).map(a => (
            <AssignmentCard key={a.id} assignment={a} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateWorkoutModal
          teams={teams}
          players={players}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
