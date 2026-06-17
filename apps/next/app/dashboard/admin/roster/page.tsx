'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
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
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: meta.bg, border: `2px solid ${meta.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: meta.color, fontSize: Math.round(size * 0.32), fontWeight: 800,
    }}>
      {init || '?'}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 99, background: meta.bg, border: `1px solid ${meta.border}`,
      fontSize: '0.72rem', fontWeight: 700, color: meta.color, letterSpacing: '0.02em',
    }}>
      {role}
    </span>
  );
}

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: isActive ? '#ECFDF5' : '#F8FAFC',
      border: `1px solid ${isActive ? '#A7F3D0' : '#E2E8F0'}`,
      fontSize: '0.72rem', fontWeight: 700,
      color: isActive ? '#059669' : '#94A3B8',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#059669' : '#94A3B8', flexShrink: 0 }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function RosterPage() {
  const [members,       setMembers]       = useState<UserProfile[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRole]          = useState('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);

  const currentUserId = useAuthStore.getState().user?.id;

  async function load() {
    setLoading(true);
    setError('');
    try { setMembers(await adminApi.getMembers()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load roster'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(member: UserProfile) {
    setActionLoading(member.id);
    setConfirmId(null);
    try {
      const updated = await adminApi.setMemberStatus(member.id, !member.is_active);
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update member status');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = members.filter(m => {
    const matchRole   = roleFilter === 'All' || m.role === roleFilter;
    const q           = search.toLowerCase();
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
    <div style={{ animation: 'fadeIn 0.3s ease' }} onClick={() => setConfirmId(null)}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>
            Roster
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: '4px 0 0' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} in your academy
          </p>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 8,
        }}>
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
                  <span style={{
                    marginLeft: 4, fontSize: '0.7rem',
                    background: roleFilter === r ? 'rgba(255,255,255,0.2)' : 'var(--bg-overlay)',
                    borderRadius: 99, padding: '1px 6px',
                  }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-subtle)', border: '1px solid var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 4, fontSize: 22 }}>
              👥
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {search ? 'No members match your search' : 'No members yet'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 300, margin: 0 }}>
              {search ? 'Try a different search term or filter.' : 'Invite members from the Invitations page.'}
            </p>
          </div>
        ) : (
          <div className="table-scroll-wrap">
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const isSelf       = m.id === currentUserId;
                const isLoading    = actionLoading === m.id;
                const isConfirming = confirmId === m.id;
                const isActive     = m.is_active !== false;

                return (
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
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {m.email}
                    </td>
                    <td><StatusPill isActive={isActive} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {fmtDate(m.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isSelf ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>You</span>
                      ) : isActive ? (
                        isConfirming ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deactivate?</span>
                            <button
                              disabled={isLoading}
                              onClick={e => { e.stopPropagation(); toggleStatus(m); }}
                              style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                              {isLoading ? '…' : 'Confirm'}
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmId(null); }}
                              style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            disabled={isLoading}
                            onClick={e => { e.stopPropagation(); setConfirmId(m.id); }}
                            style={{ background: 'none', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                            Deactivate
                          </button>
                        )
                      ) : (
                        <button
                          disabled={isLoading}
                          onClick={e => { e.stopPropagation(); toggleStatus(m); }}
                          style={{ background: 'none', border: '1px solid #A7F3D0', color: '#059669', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                          {isLoading ? '…' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
