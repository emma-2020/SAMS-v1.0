'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@sams/api';
import type { InvitationRecord } from '@sams/api';

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', role: 'Player', first_name: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const STATUS_COLOR: Record<string, string> = { pending: '#FBBF24', accepted: '#10B981', expired: '#94A3B8', revoked: '#EF4444' };

  async function load() {
    setLoading(true);
    try { setInvitations(await adminApi.getInvitations()); } catch (_) {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await adminApi.sendInvitation(form);
      setForm({ email: '', role: 'Player', first_name: '' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Invitations</h1>

      {/* Send form */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Send Invitation</h2>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>{error}</span></div>}
        <form onSubmit={sendInvitation} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label className="field-label">First Name (optional)</label>
            <div className="input-wrapper">
              <input className="field-input" style={{ paddingLeft: 14 }} type="text" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="e.g. Alex" />
            </div>
          </div>
          <div className="field" style={{ flex: '1 1 240px' }}>
            <label className="field-label">Email</label>
            <div className="input-wrapper">
              <input className="field-input" style={{ paddingLeft: 14 }} type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="athlete@academy.com" />
            </div>
          </div>
          <div className="field" style={{ flex: '0 0 140px' }}>
            <label className="field-label">Role</label>
            <select className="field-input" style={{ paddingLeft: 14 }} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              {['Coach', 'Player', 'Parent'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button className={`btn btn-primary${sending ? ' btn-loading' : ''}`} disabled={sending} type="submit">Send</button>
        </form>
      </div>

      {/* List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Email', 'Role', 'Status', 'Sent', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{inv.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{inv.role}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: `${STATUS_COLOR[inv.status]}15`, color: STATUS_COLOR[inv.status] }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {inv.status === 'pending' && (
                      <button onClick={async () => { await adminApi.revokeInvitation(inv.id); await load(); }}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                        Revoke
                      </button>
                    )}
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
