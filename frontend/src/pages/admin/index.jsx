// src/pages/admin/index.jsx
import { useState, useCallback } from 'react';
import { useApi, useSubmit }     from '../../hooks/useApi';
import { adminApi }              from '../../services/admin.api';
import useAuthStore              from '../../store/authStore';
import {
  PageHeader, SectionCard, StatCard, ErrorBanner, EmptyState,
  SkeletonLine, SkeletonCard, StatusPill,
} from '../../components/shared/ui';

// ─── Icons ───────────────────────────────────────────────────────
const IcoMail   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
const IcoTrash  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcoX      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoPlus   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoUsers  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoShield = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoCheck  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="20 6 9 17 4 12"/></svg>;

// ─── Helpers ─────────────────────────────────────────────────────

const ROLE_BADGE = {
  Coach:  { bg:'rgba(59,130,246,0.12)',  color:'#93C5FD', border:'rgba(59,130,246,0.3)'  },
  Player: { bg:'rgba(16,185,129,0.12)', color:'#6EE7B7', border:'rgba(16,185,129,0.3)'  },
  Parent: { bg:'rgba(249,115,22,0.12)', color:'#FDba74', border:'rgba(249,115,22,0.3)'  },
};

function RolePill({ role }) {
  const s = ROLE_BADGE[role] ?? {};
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'2px 10px',
      borderRadius:99, fontSize:'0.7rem', fontFamily:'var(--font-display)',
      fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
    }}>{role}</span>
  );
}

function inviteStatus(inv) {
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

function fmtDT(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

// ─────────────────────────────────────────────────────────────────
// INVITE PANEL
// ─────────────────────────────────────────────────────────────────

const EMPTY_INVITE = { email:'', role:'Player', first_name:'', last_name:'' };

function InvitePanel() {
  const [form, setForm]     = useState(EMPTY_INVITE);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('pending');

  const { data: invitations, loading: listLoading, error: listError, refetch } = useApi(
    () => adminApi.listInvitations(filter),
    [filter],
    { fallback: [] }
  );

  const { submit: sendInvite, loading: sending, error: sendError, success: sent, reset } = useSubmit(
    () => adminApi.createInvitation({
      email:      form.email.trim().toLowerCase(),
      role:       form.role,
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
    })
  );

  const { submit: revoke, loading: revoking } = useSubmit(
    (id) => adminApi.revokeInvitation(id)
  );

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
    if (sendError) reset();
  };

  function validate() {
    const errs = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))
      errs.email = 'Valid email required.';
    if (!form.first_name.trim()) errs.first_name = 'First name required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name required.';
    return errs;
  }

  async function handleSend(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const res = await sendInvite();
    if (res.ok) {
      setForm(EMPTY_INVITE);
      refetch();
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this invitation?')) return;
    await revoke(id);
    refetch();
  }

  const STATUS_PILL = {
    pending:  { bg:'rgba(59,130,246,0.1)',  color:'#93C5FD', label:'Pending'  },
    accepted: { bg:'var(--success-subtle)', color:'var(--success)', label:'Accepted' },
    expired:  { bg:'var(--bg-overlay)',     color:'var(--text-muted)', label:'Expired' },
  };

  return (
    <SectionCard
      title="Member Invitations"
      subtitle="Invite coaches, players, and parents to your academy"
      accentColor="var(--role-admin)"
    >
      {/* ── Invite Form ──────────────────────────────────────── */}
      <div style={{
        padding:16, borderRadius:'var(--radius-md)',
        background:'var(--bg-elevated)',
        border:'1px solid var(--border-default)',
        marginBottom:24,
      }}>
        <div style={{
          fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.85rem',
          color:'var(--text-primary)', marginBottom:14, letterSpacing:'0.04em',
        }}>
          Send New Invitation
        </div>

        {sent && (
          <div className="alert alert-success" style={{ marginBottom:14 }}>
            ✓ Invitation sent successfully.
          </div>
        )}
        {sendError && <ErrorBanner message={sendError} style={{ marginBottom:14 }} />}

        <form onSubmit={handleSend} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {/* First name */}
            <div className="field">
              <label className="field-label" htmlFor="inv-fn">First Name</label>
              <input id="inv-fn" className={`field-input${errors.first_name ? ' error' : ''}`}
                value={form.first_name} placeholder="Jordan"
                onChange={(e) => setField('first_name', e.target.value)} />
              {errors.first_name && <span className="field-error">{errors.first_name}</span>}
            </div>
            {/* Last name */}
            <div className="field">
              <label className="field-label" htmlFor="inv-ln">Last Name</label>
              <input id="inv-ln" className={`field-input${errors.last_name ? ' error' : ''}`}
                value={form.last_name} placeholder="Ellis"
                onChange={(e) => setField('last_name', e.target.value)} />
              {errors.last_name && <span className="field-error">{errors.last_name}</span>}
            </div>
            {/* Role */}
            <div className="field">
              <label className="field-label" htmlFor="inv-role">Role</label>
              <select id="inv-role" className="field-select"
                value={form.role} onChange={(e) => setField('role', e.target.value)}>
                <option value="Player">Player</option>
                <option value="Coach">Coach</option>
                <option value="Parent">Parent</option>
              </select>
            </div>
          </div>

          {/* Email + submit */}
          <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
            <div className="field" style={{ flex:1 }}>
              <label className="field-label" htmlFor="inv-email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><IcoMail /></span>
                <input id="inv-email" type="email"
                  className={`field-input${errors.email ? ' error' : ''}`}
                  value={form.email} placeholder="player@example.com"
                  onChange={(e) => setField('email', e.target.value)} />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <button
              type="submit"
              className={`btn btn-primary${sending ? ' btn-loading' : ''}`}
              disabled={sending}
              style={{ flexShrink:0, height:48 }}
            >
              {!sending && <><IcoMail /> Send Invite</>}
            </button>
          </div>
        </form>
      </div>

      {/* ── Invitation List ───────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['pending','accepted','expired'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'5px 14px', borderRadius:'var(--radius-md)', cursor:'pointer',
            fontFamily:'var(--font-display)', fontSize:'0.75rem',
            fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
            border:`1px solid ${filter === s ? 'var(--accent)' : 'var(--border-default)'}`,
            background: filter === s ? 'var(--accent-subtle)' : 'transparent',
            color: filter === s ? 'var(--accent)' : 'var(--text-muted)',
            transition:'all 0.15s ease',
          }}>{s}</button>
        ))}
      </div>

      {listError && <ErrorBanner message={listError} onRetry={refetch} style={{ marginBottom:12 }} />}

      {listLoading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height:52, borderRadius:'var(--radius-md)' }} />
          ))}
        </div>
      ) : invitations?.length === 0 ? (
        <EmptyState icon={<IcoMail />} title={`No ${filter} invitations`}
          subtitle="Send an invitation above to get started." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {invitations.map((inv) => {
            const st   = inviteStatus(inv);
            const pill = STATUS_PILL[st];
            return (
              <div key={inv.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 14px',
                background:'var(--bg-elevated)',
                border:'1px solid var(--border-subtle)',
                borderRadius:'var(--radius-md)',
              }}>
                {/* Role dot */}
                <div style={{
                  width:8, height:8, borderRadius:'50%', flexShrink:0,
                  background: ROLE_BADGE[inv.role]?.color ?? 'var(--text-muted)',
                }} />

                {/* Name + email */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.875rem', fontWeight:500,
                    color:'var(--text-primary)' }}>
                    {inv.first_name} {inv.last_name}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)',
                    fontFamily:'var(--font-mono)' }}>
                    {inv.email}
                  </div>
                </div>

                {/* Role + status */}
                <RolePill role={inv.role} />
                <span style={{
                  padding:'2px 10px', borderRadius:99, fontSize:'0.7rem',
                  fontFamily:'var(--font-display)', fontWeight:700,
                  letterSpacing:'0.08em', textTransform:'uppercase',
                  background:pill.bg, color:pill.color,
                }}>
                  {pill.label}
                </span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                  color:'var(--text-muted)', whiteSpace:'nowrap', flexShrink:0 }}>
                  {fmtDT(inv.expires_at)}
                </span>

                {/* Revoke */}
                {st === 'pending' && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    disabled={revoking}
                    className="btn btn-ghost btn-sm"
                    style={{ color:'var(--danger)', padding:'4px 8px', minWidth:'auto' }}
                    title="Revoke invitation"
                  >
                    <IcoTrash />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// RESOURCE CALENDAR
// 7-day grid view of venue usage blocks
// ─────────────────────────────────────────────────────────────────

const VENUES = ['Pitch A', 'Pitch B', 'Indoor Gym', 'Weights Room', 'Court 1'];
const HOURS  = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

const BLOCK_COLORS = [
  { bg:'rgba(59,130,246,0.18)',  color:'#93C5FD',  border:'rgba(59,130,246,0.35)' },
  { bg:'rgba(16,185,129,0.18)', color:'#6EE7B7',  border:'rgba(16,185,129,0.35)' },
  { bg:'rgba(245,158,11,0.18)', color:'#FCD34D',  border:'rgba(245,158,11,0.35)' },
  { bg:'rgba(239,68,68,0.18)',  color:'#FCA5A5',  border:'rgba(239,68,68,0.35)'  },
  { bg:'rgba(168,85,247,0.18)', color:'#C084FC',  border:'rgba(168,85,247,0.35)' },
];

function ResourceCalendar() {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBlock, setNewBlock] = useState({ venue:'', label:'', date:'', start:'09:00', end:'11:00' });
  const [localBlocks, setLocalBlocks] = useState([]);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + weekOffset * 7 - today.getDay() + 1);

  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Fetch schedule events to populate calendar
  const { data: events, loading, error, refetch } = useApi(
    () => adminApi.getAllEvents({
      start: DAYS[0].toISOString(),
      end:   DAYS[6].toISOString(),
    }),
    [weekOffset],
    { fallback: [] }
  );

  // Map events to calendar blocks
  const allBlocks = [
    ...(events ?? []).map((ev, i) => ({
      id:     ev.id,
      venue:  ev.location || 'Unassigned',
      label:  ev.title,
      date:   new Date(ev.start_time).toDateString(),
      startH: new Date(ev.start_time).getHours(),
      startM: new Date(ev.start_time).getMinutes(),
      endH:   new Date(ev.end_time).getHours(),
      endM:   new Date(ev.end_time).getMinutes(),
      color:  BLOCK_COLORS[i % BLOCK_COLORS.length],
      source: 'event',
    })),
    ...localBlocks,
  ];

  function addBlock(e) {
    e.preventDefault();
    if (!newBlock.venue || !newBlock.label || !newBlock.date) return;
    const [sh, sm] = newBlock.start.split(':').map(Number);
    const [eh, em] = newBlock.end.split(':').map(Number);
    const date     = new Date(newBlock.date).toDateString();
    const colorIdx = localBlocks.length % BLOCK_COLORS.length;
    setLocalBlocks((p) => [...p, {
      id: `local-${Date.now()}`, venue: newBlock.venue, label: newBlock.label,
      date, startH: sh, startM: sm, endH: eh, endM: em,
      color: BLOCK_COLORS[colorIdx], source: 'local',
    }]);
    setNewBlock({ venue:'', label:'', date:'', start:'09:00', end:'11:00' });
    setShowAddForm(false);
  }

  function removeBlock(id) {
    setLocalBlocks((p) => p.filter((b) => b.id !== id));
  }

  const dayHeader = (d) => {
    const isToday = d.toDateString() === today.toDateString();
    return (
      <div key={d.toISOString()} style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'8px 4px',
        background: isToday ? 'var(--accent-subtle)' : 'transparent',
        borderRadius: isToday ? 'var(--radius-sm)' : 0,
      }}>
        <div style={{
          fontFamily:'var(--font-display)', fontSize:'0.7rem',
          fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
          color: isToday ? 'var(--accent)' : 'var(--text-muted)',
        }}>
          {d.toLocaleDateString('en-GB', { weekday:'short' })}
        </div>
        <div style={{
          fontFamily:'var(--font-display)', fontSize:'1.1rem',
          fontWeight:800,
          color: isToday ? 'var(--accent)' : 'var(--text-primary)',
        }}>
          {d.getDate()}
        </div>
      </div>
    );
  };

  return (
    <SectionCard
      title="Resource Allocation"
      subtitle="Training ground & venue usage"
      accentColor="var(--accent)"
      action={
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setWeekOffset(w => w - 1)}>‹</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'0.8rem',
            color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
            {DAYS[0].toLocaleDateString('en-GB', { day:'numeric', month:'short' })} –{' '}
            {DAYS[6].toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
          </span>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setWeekOffset(w => w + 1)}>›</button>
          <button className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(s => !s)}>
            <IcoPlus /> Block
          </button>
        </div>
      }
    >
      {error && <ErrorBanner message={error} onRetry={refetch} style={{ marginBottom:16 }} />}

      {/* Add block form */}
      {showAddForm && (
        <div style={{
          padding:16, borderRadius:'var(--radius-md)',
          background:'var(--bg-elevated)', border:'1px solid var(--border-accent)',
          marginBottom:20, animation:'fadeIn 0.2s ease',
        }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700,
            fontSize:'0.85rem', color:'var(--text-primary)', marginBottom:12 }}>
            Reserve Venue Time
          </div>
          <form onSubmit={addBlock} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div className="field">
                <label className="field-label">Venue</label>
                <select className="field-select" value={newBlock.venue}
                  onChange={e => setNewBlock(p => ({...p, venue: e.target.value}))}>
                  <option value="">Select venue</option>
                  {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Date</label>
                <input type="date" className="field-input" value={newBlock.date}
                  onChange={e => setNewBlock(p => ({...p, date: e.target.value}))} />
              </div>
              <div className="field">
                <label className="field-label">Label / Team</label>
                <input className="field-input" placeholder="e.g. U16 Training"
                  value={newBlock.label}
                  onChange={e => setNewBlock(p => ({...p, label: e.target.value}))} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
              <div className="field" style={{ flex:1 }}>
                <label className="field-label">Start</label>
                <input type="time" className="field-input" value={newBlock.start}
                  onChange={e => setNewBlock(p => ({...p, start: e.target.value}))} />
              </div>
              <div className="field" style={{ flex:1 }}>
                <label className="field-label">End</label>
                <input type="time" className="field-input" value={newBlock.end}
                  onChange={e => setNewBlock(p => ({...p, end: e.target.value}))} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ height:48 }}>
                Add Block
              </button>
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => setShowAddForm(false)} style={{ height:48 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:680 }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'60px repeat(7, 1fr)',
            gap:2, marginBottom:4 }}>
            <div />
            {DAYS.map(dayHeader)}
          </div>

          {loading ? (
            <div className="skeleton" style={{ height:300, borderRadius:'var(--radius-md)' }} />
          ) : (
            <div style={{ position:'relative' }}>
              {/* Hour rows */}
              {HOURS.map((h) => (
                <div key={h} style={{
                  display:'grid', gridTemplateColumns:'60px repeat(7, 1fr)',
                  gap:2, minHeight:40,
                  borderBottom:'1px solid var(--border-subtle)',
                }}>
                  {/* Hour label */}
                  <div style={{
                    fontFamily:'var(--font-mono)', fontSize:'0.65rem',
                    color:'var(--text-muted)', paddingRight:8, textAlign:'right',
                    paddingTop:4, flexShrink:0,
                  }}>
                    {String(h).padStart(2,'0')}:00
                  </div>
                  {/* Day cells */}
                  {DAYS.map((day) => {
                    const dayStr  = day.toDateString();
                    const cellBlocks = allBlocks.filter(
                      (b) => b.date === dayStr && b.startH === h
                    );
                    return (
                      <div key={day.toISOString()} style={{
                        position:'relative', minHeight:40,
                        background:'var(--bg-elevated)',
                        borderRadius:2,
                      }}>
                        {cellBlocks.map((b) => {
                          const duration = (b.endH - b.startH) + (b.endM - b.startM) / 60;
                          return (
                            <div key={b.id} style={{
                              position:'absolute', top:2, left:2, right:2,
                              minHeight: Math.max(duration * 40 - 4, 24),
                              borderRadius:4, padding:'3px 6px',
                              background:b.color.bg, border:`1px solid ${b.color.border}`,
                              fontSize:'0.68rem', fontWeight:600,
                              color:b.color.color, overflow:'hidden',
                              display:'flex', alignItems:'flex-start', gap:4,
                              justifyContent:'space-between',
                              zIndex:2,
                            }}>
                              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {b.label}
                              </span>
                              {b.source === 'local' && (
                                <button onClick={() => removeBlock(b.id)} style={{
                                  background:'none', border:'none', cursor:'pointer',
                                  color:b.color.color, padding:0, flexShrink:0,
                                  display:'flex', alignItems:'center',
                                }}>
                                  <IcoX />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Venue legend */}
      {!loading && (
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
          {VENUES.map((v, i) => (
            <div key={v} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                width:10, height:10, borderRadius:2, flexShrink:0,
                background:BLOCK_COLORS[i % BLOCK_COLORS.length].color,
              }} />
              <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD — LAYOUT
// ─────────────────────────────────────────────────────────────────

// ─── Quick stats fetcher ─────────────────────────────────────────

function AdminStats() {
  const { data: invitations } = useApi(
    () => adminApi.listInvitations(),
    [], { fallback: [] }
  );
  const accepted = (invitations || []).filter(i => i.accepted_at).length;
  const pending  = (invitations || []).filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 14, marginBottom: 28,
    }}>
      <StatCard
        label="Total Invitations"
        value={invitations?.length ?? '—'}
        icon={<IcoMail />}
        color="var(--role-admin)"
      />
      <StatCard
        label="Accepted"
        value={accepted}
        icon={<IcoCheck />}
        color="var(--success)"
      />
      <StatCard
        label="Pending"
        value={pending}
        icon={<IcoUsers />}
        color="var(--info)"
      />
      <StatCard
        label="Academy Status"
        value="Active"
        icon={<IcoShield />}
        color="var(--accent)"
      />
    </div>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        eyebrow="Admin Workspace"
        title="Academy Command"
        subtitle={`Managed by ${user?.first_name ?? ''} ${user?.last_name ?? ''}`}
        roleColor="var(--role-admin)"
      />

      {/* Stats overview */}
      <AdminStats />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <InvitePanel />
        <ResourceCalendar />
      </div>
    </div>
  );
}
