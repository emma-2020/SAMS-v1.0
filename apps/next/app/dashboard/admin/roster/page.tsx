'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@sams/api';
import type { UserProfile } from '@sams/api';

const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ROLE_FILTERS = ['All', 'Admin', 'Coach', 'Player', 'Parent'];

const ROLE_META: Record<string, { color: string; bg: string; border: string }> = {
  Admin:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  Coach:  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  Player: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  Parent: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ name, role, size = 34 }: { name: string; role: string; size?: number }) {
  const meta = ROLE_META[role] ?? { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  const init = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: meta.bg, border: `2px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, fontSize: Math.round(size * 0.32), fontWeight: 800 }}>
      {init || '?'}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, background: meta.bg, border: `1px solid ${meta.border}`, fontSize: '0.72rem', fontWeight: 700, color: meta.color, letterSpacing: '0.02em' }}>
      {role}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'Active';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: isActive ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${isActive ? '#A7F3D0' : '#E2E8F0'}`, fontSize: '0.72rem', fontWeight: 700, color: isActive ? '#059669' : '#94A3B8' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#059669' : '#94A3B8', flexShrink: 0 }} />
      {status}
    </span>
  );
}

export default function RosterPage() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('All');

  async function load() {
    setLoading(true);
    setError('');
    try { setMembers(await adminApi.getMembers()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load roster'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = members.filter(m => {
    const matchRole = roleFilter === 'All' || m.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTERS.reduce<Record<string, number>>((acc, r) => {
    acc[r] = r === 'All' ? members.length : members.filter(m => m.role === r).length;
    return acc;
  }, {});

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>
            Roster
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
            {members.length} member{members.length !== 1 ? 's' : ''} in your academy
          </p>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ width: 240 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IcoSearch /></span>
            <input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {ROLE_FILTERS.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}>
                {r}
                {counts[r] > 0 && (
                  <span style={{ marginLeft: 4, fontSize: '0.68rem', background: roleFilter === r ? 'rgba(255,255,255,0.22)' : 'var(--bg-elevated)', borderRadius: 99, padding: '1px 6px' }}>
                    {counts[r]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ margin: 16 }}>
            <span>{error}</span>
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {search ? 'No members match your search' : 'No members yet'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {search ? 'Try a different search term or filter.' : 'Invite members from the Invitations page.'}
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={`${m.first_name} ${m.last_name}`} role={m.role} size={34} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {m.first_name} {m.last_name}
                      </span>
                    </div>
                  </td>
                  <td><RoleBadge role={m.role} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.email}</td>
                  <td><StatusPill status={(m as UserProfile & { is_active?: boolean }).is_active !== false ? 'Active' : 'Inactive'} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {fmtDate((m as UserProfile & { created_at?: string }).created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
