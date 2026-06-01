// src/pages/admin/RosterPage.jsx
import { useState } from 'react';
import { useApi }   from '../../hooks/useApi';
import api          from '../../services/api';
import { PageHeader, SectionCard, EmptyState, ErrorBanner, Avatar, RoleBadge, StatusPill } from '../../components/shared/ui';

const IcoUsers  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

const ROLE_FILTERS = ['All', 'Admin', 'Coach', 'Player', 'Parent'];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RosterPage() {
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('All');

  const { data: members, loading, error, refetch } = useApi(
    () => api.get('/admin/roster').then(r => r.data.data.members).catch(() => []),
    [], { fallback: [] }
  );

  const filtered = (members || []).filter(m => {
    const matchRole = roleFilter === 'All' || m.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTERS.reduce((acc, r) => {
    acc[r] = r === 'All' ? members?.length ?? 0 : (members || []).filter(m => m.role === r).length;
    return acc;
  }, {});

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Roster"
        subtitle={`${members?.length ?? 0} members in your academy`}
      />

      <SectionCard
        noPad
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 20px' }}>
            {/* Search */}
            <div className="search-input" style={{ width: 240 }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IcoSearch /></span>
              <input
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Role filter pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              {ROLE_FILTERS.map(r => (
                <button key={r}
                  onClick={() => setRole(r)}
                  className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
                >
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
        }
      >
        {error && <ErrorBanner message={error} onRetry={refetch} style={{ margin: 16 }} />}

        {loading ? (
          <div style={{ padding: 20 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IcoUsers />}
            title={search ? 'No members match your search' : 'No members yet'}
            subtitle={search ? 'Try a different search term or filter.' : 'Invite members from the Invitations page.'}
          />
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
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {m.email}
                  </td>
                  <td><StatusPill status={m.is_active !== false ? 'Active' : 'Inactive'} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {fmtDate(m.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
