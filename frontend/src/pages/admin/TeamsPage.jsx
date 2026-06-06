// src/pages/admin/TeamsPage.jsx
import { useState } from 'react';
import { useApi, useSubmit } from '../../hooks/useApi';
import { teamsApi }          from '../../services/teams.api';
import api                   from '../../services/api';
import {
  PageHeader, ErrorBanner, EmptyState, Avatar,
} from '../../components/shared/ui';

// ── Icons ──────────────────────────────────────────────────────────
const IcoPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IcoChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcoChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const IcoUser = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const EMPTY_FORM = { name: '', sport: '', division: '', coach_id: '' };

// ── Team avatar with generated initials ────────────────────────────
const AVATAR_PALETTES = [
  { bg: '#EEF2FF', text: '#4338CA', ring: '#C7D2FE' }, // indigo
  { bg: '#F0FDF4', text: '#15803D', ring: '#86EFAC' }, // green
  { bg: '#FFF7ED', text: '#C2410C', ring: '#FDBA74' }, // orange
  { bg: '#F0F9FF', text: '#0369A1', ring: '#7DD3FC' }, // sky
  { bg: '#FDF4FF', text: '#7E22CE', ring: '#D8B4FE' }, // purple
  { bg: '#FFF1F2', text: '#BE123C', ring: '#FECDD3' }, // rose
  { bg: '#F0FDFA', text: '#0F766E', ring: '#5EEAD4' }, // teal
];

function TeamAvatar({ name, size = 52 }) {
  const words  = (name || '?').trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name || '?').slice(0, 2).toUpperCase();
  const palette = AVATAR_PALETTES[(name || '').charCodeAt(0) % AVATAR_PALETTES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: palette.bg,
      border: `2.5px solid ${palette.ring}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: palette.text,
      fontSize: Math.round(size * 0.33),
      fontWeight: 800,
      letterSpacing: '-0.02em',
      boxShadow: `0 2px 8px ${palette.ring}80`,
    }}>
      {initials}
    </div>
  );
}

// ── Custom select wrapper ──────────────────────────────────────────
function SelectField({ value, onChange, children, disabled }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          appearance: 'none', WebkitAppearance: 'none',
          padding: '10px 38px 10px 14px',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          background: 'var(--bg-surface)',
          border: '1.5px solid #E2E8F0',
          borderRadius: 12,
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: 'none',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
      >
        {children}
      </select>
      <span style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex',
      }}>
        <IcoChevronDown />
      </span>
    </div>
  );
}

// ── Modern input ───────────────────────────────────────────────────
function InputField({ placeholder, value, onChange, error }) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '10px 14px',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        color: 'var(--text-primary)',
        background: 'var(--bg-surface)',
        border: `1.5px solid ${error ? 'var(--danger)' : '#E2E8F0'}`,
        borderRadius: 12,
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.10)' : 'none',
      }}
      onFocus={e => {
        if (!error) { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }
      }}
      onBlur={e => {
        if (!error) { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }
      }}
    />
  );
}

// ── Team card ──────────────────────────────────────────────────────
function TeamCard({ team, members, onDelete, onAddPlayer, allPlayers }) {
  const [open,     setOpen]     = useState(false);
  const [showAdd,  setShowAdd]  = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [addErr,   setAddErr]   = useState('');
  const [adding,   setAdding]   = useState(false);
  const [hovered,  setHovered]  = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  const coach = team.users;
  const coachName = coach ? `${coach.first_name} ${coach.last_name}` : 'Unassigned';
  const rostered = (members?.rosters || []);
  const rosteredPlayerIds = new Set(rostered.map(r => r.player_id));
  const availablePlayers = allPlayers.filter(p => !rosteredPlayerIds.has(p.id));

  async function handleAddPlayer() {
    if (!playerId) return;
    setAdding(true); setAddErr('');
    try {
      await teamsApi.addMember(team.id, { player_id: playerId });
      setPlayerId(''); setShowAdd(false); onAddPlayer();
    } catch (err) {
      setAddErr(err.response?.data?.error || err.message || 'Failed to add player.');
    } finally { setAdding(false); }
  }

  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: 'hidden',
        border: hovered ? '1.5px solid #C7D2FE' : '1.5px solid #F1F5F9',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 32px rgba(99,102,241,0.12), 0 4px 12px rgba(15,23,42,0.06)'
          : '0 2px 12px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card header */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <TeamAvatar name={team.name} size={52} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <div style={{
                fontWeight: 800, fontSize: '1.05rem',
                color: '#0F172A',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {team.name}
              </div>
              {/* Player count badge */}
              <span style={{
                flexShrink: 0,
                fontSize: '0.72rem', fontWeight: 700,
                padding: '3px 10px', borderRadius: 99,
                background: '#DBEAFE', color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                {rostered.length} {rostered.length === 1 ? 'player' : 'players'}
              </span>
            </div>

            {/* Coach row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.8rem', color: 'var(--text-secondary)',
              marginBottom: 4,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#F1F5F9', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', flexShrink: 0,
              }}>
                <IcoUser />
              </span>
              <span style={{ fontWeight: 600, color: coach ? '#334155' : 'var(--text-muted)' }}>
                {coachName}
              </span>
            </div>

            {/* Sport · Division tags */}
            {(team.sport || team.division) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                {team.sport && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                    borderRadius: 99, background: '#F8FAFC',
                    border: '1px solid #E2E8F0', color: '#64748B',
                    letterSpacing: '0.02em',
                  }}>
                    {team.sport}
                  </span>
                )}
                {team.division && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                    borderRadius: 99, background: '#F8FAFC',
                    border: '1px solid #E2E8F0', color: '#64748B',
                    letterSpacing: '0.02em',
                  }}>
                    {team.division}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card footer actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid #F1F5F9',
        }}>
          <button
            onClick={e => { e.stopPropagation(); onDelete(team); }}
            onMouseEnter={() => setDeleteHovered(true)}
            onMouseLeave={() => setDeleteHovered(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 8,
              border: `1px solid ${deleteHovered ? 'var(--danger-border)' : '#E2E8F0'}`,
              background: deleteHovered ? 'var(--danger-subtle)' : 'transparent',
              color: deleteHovered ? 'var(--danger)' : 'var(--text-muted)',
              fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <IcoTrash /> Deactivate
          </button>

          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: open ? 'var(--accent-subtle)' : 'transparent',
              color: open ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {open ? <><IcoChevronUp /> Hide Roster</> : <><IcoChevronDown /> View Roster</>}
          </button>
        </div>
      </div>

      {/* Expandable roster panel */}
      {open && (
        <div style={{
          borderTop: '1px solid #F1F5F9',
          padding: '16px 20px 20px',
          background: '#FAFBFC',
          animation: 'fadeIn 0.15s ease',
        }}>
          {rostered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: '0 0 12px', fontStyle: 'italic' }}>
              No players assigned yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {rostered.map(r => {
                const p = r.players;
                if (!p) return null;
                return (
                  <div key={r.player_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'var(--bg-surface)', border: '1px solid #EEF2FF',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  }}>
                    <Avatar name={`${p.first_name} ${p.last_name}`} role="Player" size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {p.email}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: 99,
                      background: '#F0FDF4', color: '#15803D',
                      border: '1px solid #86EFAC',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>
                      Player
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {showAdd ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <SelectField value={playerId} onChange={e => setPlayerId(e.target.value)}>
                  <option value="">Select player…</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </SelectField>
              </div>
              <button
                onClick={handleAddPlayer}
                disabled={!playerId || adding}
                className="btn btn-primary btn-sm"
              >
                {adding ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Add'}
              </button>
              <button onClick={() => { setShowAdd(false); setAddErr(''); }} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              disabled={availablePlayers.length === 0}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <IcoPlus />
              {availablePlayers.length === 0 ? 'All players assigned' : 'Add Player'}
            </button>
          )}
          {addErr && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--danger)' }}>{addErr}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function TeamsPage() {
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [teamMembers, setTeamMembers] = useState({});

  const { data: teams, loading: teamsLoading, error: teamsError, refetch: refetchTeams } = useApi(
    () => teamsApi.listTeams(), [], { fallback: [] }
  );
  const { data: allMembers } = useApi(
    () => api.get('/admin/roster').then(r => r.data.data.members || []), [], { fallback: [] }
  );

  const coaches = (allMembers || []).filter(m => m.role === 'Coach');
  const players = (allMembers || []).filter(m => m.role === 'Player');

  const { submit: createTeam, loading: creating, error: createErr, reset: resetCreate } = useSubmit(
    () => teamsApi.createTeam({
      name:     form.name.trim(),
      sport:    form.sport.trim()    || null,
      division: form.division.trim() || null,
      coach_id: form.coach_id        || null,
    })
  );
  const { submit: deleteTeam } = useSubmit(id => teamsApi.deleteTeam(id));

  function setField(k, v) {
    setForm(p => ({ ...p, [k]: v }));
    if (formErrors[k]) setFormErrors(p => ({ ...p, [k]: '' }));
    if (createErr) resetCreate();
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Team name is required.';
    return e;
  }

  async function handleCreate(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }
    const { ok } = await createTeam();
    if (ok) { setForm(EMPTY_FORM); setFormErrors({}); refetchTeams(); }
  }

  async function handleDelete(team) {
    if (!window.confirm(`Deactivate "${team.name}"? Members will lose access to this channel.`)) return;
    await deleteTeam(team.id);
    refetchTeams();
  }

  async function loadMembers(teamId) {
    try {
      const data = await teamsApi.getMembers(teamId);
      setTeamMembers(prev => ({ ...prev, [teamId]: data }));
    } catch { /* silent */ }
  }

  const teamsArr = teams || [];
  if (teamsArr.length > 0) {
    teamsArr.forEach(t => { if (!teamMembers[t.id]) loadMembers(t.id); });
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Teams"
        subtitle="Create and manage teams — each team gets a chat channel automatically."
        badge={
          <span style={{
            background: 'var(--accent-subtle)', color: 'var(--accent)',
            border: '1px solid var(--border-accent)',
            borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
            padding: '2px 10px', letterSpacing: '0.04em',
          }}>
            {teamsArr.length} team{teamsArr.length !== 1 ? 's' : ''}
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 28, alignItems: 'start' }}>

        {/* ── Create Team card ─────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #F1F5F9' }}>
          {/* Form header */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #F1F5F9',
            background: 'linear-gradient(135deg, #FAFBFF 0%, #F5F3FF 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}>
                <IcoPlus />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Create Team
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  Fill in the details below
                </div>
              </div>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '20px 24px 24px' }}>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: '#334155', marginBottom: 6, letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}>
                  Team Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <InputField
                  placeholder="e.g. U16 Boys"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  error={formErrors.name}
                />
                {formErrors.name && (
                  <div style={{ marginTop: 5, fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500 }}>
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: '0.78rem', fontWeight: 700,
                    color: '#334155', marginBottom: 6, letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}>
                    Sport
                  </label>
                  <InputField
                    placeholder="e.g. Football"
                    value={form.sport}
                    onChange={e => setField('sport', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: '0.78rem', fontWeight: 700,
                    color: '#334155', marginBottom: 6, letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}>
                    Division
                  </label>
                  <InputField
                    placeholder="e.g. Premier"
                    value={form.division}
                    onChange={e => setField('division', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: '#334155', marginBottom: 6, letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}>
                  Head Coach
                </label>
                <SelectField
                  value={form.coach_id}
                  onChange={e => setField('coach_id', e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </SelectField>
                {coaches.length === 0 && (
                  <div style={{ marginTop: 5, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    No coaches yet — invite one from the Invitations page.
                  </div>
                )}
              </div>

              {createErr && <ErrorBanner message={createErr} />}

              <button
                type="submit"
                disabled={creating}
                style={{
                  width: '100%', height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: creating
                    ? 'var(--accent)'
                    : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.75 : 1,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                }}
                onMouseEnter={e => {
                  if (!creating) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)';
                }}
              >
                {creating
                  ? <><span className="spinner" style={{ width: 15, height: 15, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Creating…</>
                  : <><IcoPlus /> Create Team</>
                }
              </button>
            </form>
          </div>
        </div>

        {/* ── Teams grid ───────────────────────────────────── */}
        <div>
          {teamsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 160, borderRadius: 20 }} />
              ))}
            </div>
          ) : teamsError ? (
            <ErrorBanner message={teamsError} onRetry={refetchTeams} />
          ) : teamsArr.length === 0 ? (
            <div className="card" style={{ border: '1.5px solid #F1F5F9' }}>
              <EmptyState
                icon={<IcoUsers />}
                title="No teams yet"
                subtitle="Create your first team using the form on the left. Each team automatically gets its own chat channel."
              />
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}>
              {teamsArr.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  members={teamMembers[team.id]}
                  allPlayers={players}
                  onDelete={handleDelete}
                  onAddPlayer={() => loadMembers(team.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
