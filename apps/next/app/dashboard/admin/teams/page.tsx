'use client';

import { useEffect, useState } from 'react';
import { teamsApi } from '@sams/api';
import type { Team, TeamMember } from '@sams/api';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [form, setForm] = useState({ name: '', sport: '', division: '' });
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try { setTeams(await teamsApi.getTeams()); } catch (_) {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function expand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!members[id]) {
      try { setMembers((p) => ({ ...p, [id]: [] })); const m = await teamsApi.getTeamMembers(id); setMembers((p) => ({ ...p, [id]: m })); } catch (_) {}
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try { await teamsApi.createTeam(form); setForm({ name: '', sport: '', division: '' }); await load(); } catch (_) {}
    setCreating(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Teams</h1>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Create Team</h2>
        <form onSubmit={createTeam} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { key: 'name', label: 'Team Name', placeholder: 'e.g. U18 Elite', required: true },
            { key: 'sport', label: 'Sport', placeholder: 'e.g. Football' },
            { key: 'division', label: 'Division', placeholder: 'e.g. Premier' },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key} className="field" style={{ flex: '1 1 160px' }}>
              <label className="field-label">{label}</label>
              <div className="input-wrapper">
                <input className="field-input" style={{ paddingLeft: 14 }} placeholder={placeholder} required={!!required}
                  value={(form as Record<string, string>)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            </div>
          ))}
          <button className={`btn btn-primary${creating ? ' btn-loading' : ''}`} disabled={creating} type="submit">Create</button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading…</div> : teams.map((team) => (
          <div key={team.id} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' }} onClick={() => expand(team.id)}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#6366F110', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🏅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{team.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{[team.sport, team.division].filter(Boolean).join(' · ')}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: team.is_active ? '#10B981' : '#94A3B8', fontWeight: 700 }}>{team.is_active ? 'Active' : 'Inactive'}</div>
              <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{expanded === team.id ? '▴' : '▾'}</span>
            </div>
            {expanded === team.id && (
              <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                {(members[team.id] ?? []).length === 0
                  ? <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No players assigned yet.</div>
                  : (members[team.id] ?? []).map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', flex: 1 }}>{m.first_name} {m.last_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.email}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
