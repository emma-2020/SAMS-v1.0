// src/pages/admin/InvitationsPage.jsx
import { useState } from 'react';
import { useApi, useSubmit } from '../../hooks/useApi';
import { adminApi }          from '../../services/admin.api';
import { PageHeader, SectionCard, ErrorBanner, EmptyState, RoleBadge } from '../../components/shared/ui';

const IcoMail  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
const IcoTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>;
const IcoSend  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

const EMPTY = { email: '', role: 'Player', first_name: '', last_name: '' };

function inviteStatus(inv) {
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InvitationsPage() {
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('pending');
  const [sentMsg, setSentMsg] = useState('');

  const { data: invitations, loading, error: listErr, refetch } = useApi(
    () => adminApi.listInvitations(filter),
    [filter], { fallback: [] }
  );

  const { submit: sendInvite, loading: sending, error: sendErr, reset } = useSubmit(
    () => adminApi.createInvitation({
      email:      form.email.trim().toLowerCase(),
      role:       form.role,
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
    })
  );

  const { submit: revoke, loading: revoking } = useSubmit(id => adminApi.revokeInvitation(id));

  function setField(k, v) {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    if (sendErr) reset();
    setSentMsg('');
  }

  function validate() {
    const e = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required.';
    if (!form.first_name.trim()) e.first_name = 'First name required.';
    if (!form.last_name.trim())  e.last_name  = 'Last name required.';
    return e;
  }

  async function handleSend(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const res = await sendInvite();
    if (res.ok) {
      setForm(EMPTY);
      setSentMsg(`Invitation sent to ${form.email}`);
      refetch();
      setTimeout(() => setSentMsg(''), 4000);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this invitation?')) return;
    await revoke(id);
    refetch();
  }

  const filterCounts = {
    pending:  (invitations || []).filter(i => inviteStatus(i) === 'pending').length,
    accepted: (invitations || []).filter(i => inviteStatus(i) === 'accepted').length,
    expired:  (invitations || []).filter(i => inviteStatus(i) === 'expired').length,
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Member Invitations"
        subtitle="Invite coaches, players, and parents to your academy"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Send invitation form */}
        <SectionCard title="Send New Invitation" subtitle="Invite a new member via email">
          {sentMsg && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              <IcoSend />
              <span>{sentMsg}</span>
            </div>
          )}
          {sendErr && <ErrorBanner message={sendErr} style={{ marginBottom: 16 }} />}

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">First Name</label>
                <input className={`field-input${errors.first_name ? ' error' : ''}`}
                  value={form.first_name} placeholder="Jordan"
                  onChange={e => setField('first_name', e.target.value)} />
                {errors.first_name && <span className="field-error">{errors.first_name}</span>}
              </div>
              <div className="field">
                <label className="field-label">Last Name</label>
                <input className={`field-input${errors.last_name ? ' error' : ''}`}
                  value={form.last_name} placeholder="Ellis"
                  onChange={e => setField('last_name', e.target.value)} />
                {errors.last_name && <span className="field-error">{errors.last_name}</span>}
              </div>
            </div>

            <div className="field">
              <label className="field-label">Role</label>
              <select className="field-select" value={form.role}
                onChange={e => setField('role', e.target.value)}>
                <option value="Player">Player</option>
                <option value="Coach">Coach</option>
                <option value="Parent">Parent</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><IcoMail /></span>
                <input type="email" className={`field-input${errors.email ? ' error' : ''}`}
                  value={form.email} placeholder="member@example.com"
                  onChange={e => setField('email', e.target.value)} />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <button type="submit"
              className={`btn btn-primary btn-full${sending ? ' btn-loading' : ''}`}
              disabled={sending} style={{ marginTop: 4 }}>
              {!sending && <><IcoSend /> Send Invitation</>}
            </button>
          </form>
        </SectionCard>

        {/* Invitation list */}
        <SectionCard
          title="Invitation History"
          subtitle="Track all sent invitations"
          noPad
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              {['pending','accepted','expired'].map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}>
                  {s} {filterCounts[s] > 0 && (
                    <span style={{
                      marginLeft: 4, background: filter === s ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                      borderRadius: 99, padding: '1px 6px', fontSize: '0.7rem',
                    }}>
                      {filterCounts[s]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          }
        >
          {listErr && <ErrorBanner message={listErr} onRetry={refetch} style={{ margin: 16 }} />}
          {loading ? (
            <div style={{ padding: 20 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
          ) : !invitations?.length ? (
            <EmptyState
              icon={<IcoMail />}
              title={`No ${filter} invitations`}
              subtitle={filter === 'pending' ? 'Send an invitation using the form on the left.' : `No ${filter} invitations found.`}
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => {
                  const st = inviteStatus(inv);
                  const stColor = st === 'accepted' ? '#059669' : st === 'expired' ? '#94A3B8' : '#D97706';
                  const stBg    = st === 'accepted' ? '#ECFDF5' : st === 'expired' ? '#F8FAFC' : '#FFFBEB';
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {inv.first_name} {inv.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {inv.email}
                        </div>
                      </td>
                      <td><RoleBadge role={inv.role} /></td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem',
                          fontWeight: 600, background: stBg, color: stColor,
                          border: `1px solid ${stColor}30`, textTransform: 'capitalize',
                        }}>{st}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(inv.expires_at)}
                      </td>
                      <td>
                        {st === 'pending' && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revoking}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Revoke"
                            style={{ color: 'var(--danger)' }}
                          >
                            <IcoTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
