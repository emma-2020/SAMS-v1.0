'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@sams/api';
import type { UserProfile } from '@sams/api';
import { ROLE_COLOR } from '@sams/ui';

export default function RosterPage() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    adminApi.getMembers().then(setMembers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const roles = ['All', 'Admin', 'Coach', 'Player', 'Parent'];
  const filtered = filter === 'All' ? members : members.filter((m) => m.role === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Roster</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {roles.map((r) => (
            <button key={r} onClick={() => setFilter(r)}
              style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: filter === r ? (ROLE_COLOR[r] ?? '#6366F1') : 'transparent', color: filter === r ? '#fff' : 'var(--text-secondary)', borderColor: filter === r ? 'transparent' : 'var(--border-default)' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading roster…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Member', 'Role', 'Email'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const color = ROLE_COLOR[m.role] ?? '#6366F1';
                const initials = `${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase();
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color, flexShrink: 0 }}>{initials}</div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{m.first_name} {m.last_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: `${color}12`, color }}>{m.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.email}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
