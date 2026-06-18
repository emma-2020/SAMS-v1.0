'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Mail, CalendarDays, ChevronDown, Check, Trash2,
  Zap, Trophy, UserCircle, CheckCircle2, Link, Copy,
  AlertCircle, RefreshCw,
} from 'lucide-react';
import { adminApi } from '@sams/api';
import type { InvitationRecord } from '@sams/api';

// ── Helpers ───────────────────────────────────────────────────────
function inviteStatus(inv: InvitationRecord): 'pending' | 'accepted' | 'expired' {
  if (inv.status === 'accepted' || inv.accepted_at) return 'accepted';
  if (inv.status === 'expired' || inv.status === 'revoked') return 'expired';
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Role metadata ─────────────────────────────────────────────────
const ROLES = [
  { value: 'Player', label: 'Player', icon: Zap,       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { value: 'Coach',  label: 'Coach',  icon: Trophy,     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { value: 'Parent', label: 'Parent', icon: UserCircle, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
];

const STATUS = {
  pending:  { label: 'Pending',  color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  accepted: { label: 'Accepted', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  expired:  { label: 'Expired',  color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
};

// ── Custom role select ────────────────────────────────────────────
function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = ROLES.find(r => r.value === value) || ROLES[0];
  const SelIcon  = selected.icon;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(p => !p)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px', height: 42, background: '#FFFFFF',
        border: `1.5px solid ${open ? '#8B5CF6' : '#E2E8F0'}`, borderRadius: 10,
        boxShadow: open ? '0 0 0 3px rgba(139,92,246,0.12)' : '0 1px 3px rgba(15,23,42,0.05)',
        cursor: 'pointer', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: selected.bg, border: `1px solid ${selected.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected.color, flexShrink: 0 }}>
          <SelIcon size={13} />
        </div>
        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem', fontWeight: 500, color: '#1E293B' }}>{selected.label}</span>
        <ChevronDown size={15} style={{ color: '#94A3B8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200, background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 12, boxShadow: '0 8px 28px rgba(15,23,42,0.10)', overflow: 'hidden', padding: '4px', animation: 'fadeIn 0.12s ease' }}>
          {ROLES.map(role => {
            const RIcon   = role.icon;
            const isActive = role.value === value;
            return (
              <button key={role.value} type="button"
                onClick={() => { onChange(role.value); setOpen(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, background: isActive ? `${role.color}0D` : 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: role.bg, border: `1px solid ${role.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: role.color, flexShrink: 0 }}>
                  <RIcon size={14} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, color: '#1E293B' }}>{role.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>
                    {role.value === 'Player' ? 'Athletic team member' : role.value === 'Coach' ? 'Team coach & trainer' : 'Guardian / caregiver'}
                  </div>
                </div>
                {isActive && <Check size={14} style={{ color: role.color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Field components ──────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em', marginBottom: 6, display: 'block' }}>
      {children}
      {required && <span style={{ color: '#EC4899', marginLeft: 3 }}>*</span>}
    </label>
  );
}

function FieldInput({ error, icon, ...props }: { error?: string; icon?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused ? '#8B5CF6' : '#CBD5E1', transition: 'color 0.15s', pointerEvents: 'none', display: 'flex' }}>
          {icon}
        </div>
      )}
      <input {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: '100%', height: 42, padding: icon ? '0 12px 0 38px' : '0 12px',
          background: '#FFFFFF',
          border: `1.5px solid ${error ? '#FECACA' : focused ? '#8B5CF6' : '#E2E8F0'}`,
          borderRadius: 10, outline: 'none', color: '#1E293B', fontSize: '0.875rem',
          boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.09)' : focused ? '0 0 0 3px rgba(139,92,246,0.12)' : '0 1px 3px rgba(15,23,42,0.05)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...props.style,
        }} />
    </div>
  );
}

// ── Avatar initials tile ──────────────────────────────────────────
function InitialsTile({ firstName = '', lastName = '', role }: { firstName?: string; lastName?: string; role: string }) {
  const meta = ROLES.find(r => r.value === role) || { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' };
  const init = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  return (
    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.02em' }}>
      {init || '?'}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
const EMPTY = { email: '', role: 'Player', first_name: '', last_name: '' };

export default function InvitationsPage() {
  const [form,       setForm]       = useState(EMPTY);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [filter,     setFilter]     = useState<'pending' | 'accepted' | 'expired'>('pending');
  const [sentMsg,    setSentMsg]    = useState('');
  const [sentEmail,  setSentEmail]  = useState('');
  const [regLink,    setRegLink]    = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [listErr,    setListErr]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [sendErr,    setSendErr]    = useState('');
  const [revoking,   setRevoking]   = useState(false);

  async function load() {
    setLoading(true);
    setListErr('');
    try { setInvitations(await adminApi.getInvitations()); }
    catch (e: unknown) { setListErr(e instanceof Error ? e.message : 'Failed to load'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function setField(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    if (sendErr) setSendErr('');
    if (sentMsg) { setSentMsg(''); setRegLink(''); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email address.';
    if (!form.first_name.trim()) e.first_name = 'First name is required.';
    if (!form.last_name.trim())  e.last_name  = 'Last name is required.';
    return e;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    setSendErr('');
    const captured = form.email.trim();
    try {
      const result = await adminApi.sendInvitation({
        email:      form.email.trim().toLowerCase(),
        role:       form.role,
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
      });
      setSentEmail(captured);
      const data = result as unknown as { email_sent?: boolean; registration_url?: string };
      setSentMsg(data.email_sent ? 'email' : 'link');
      setRegLink(data.registration_url || '');
      setForm(EMPTY);
      load();
    } catch (err: unknown) {
      setSendErr(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally { setSending(false); }
  }

  function copyRegLink() {
    navigator.clipboard.writeText(regLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2200);
  }

  async function handleRevoke(id: string) {
    if (!window.confirm('Revoke this invitation?')) return;
    setRevoking(true);
    try { await adminApi.revokeInvitation(id); load(); }
    catch (_) {}
    setRevoking(false);
  }

  const allInvitations = invitations || [];
  const filtered = allInvitations.filter(i => inviteStatus(i) === filter);
  const filterCounts = {
    pending:  allInvitations.filter(i => inviteStatus(i) === 'pending').length,
    accepted: allInvitations.filter(i => inviteStatus(i) === 'accepted').length,
    expired:  allInvitations.filter(i => inviteStatus(i) === 'expired').length,
  };
  const filterLabels = { pending: 'Pending', accepted: 'Accepted', expired: 'Expired' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>
            Member Invitations
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginTop: 6 }}>
            Invite coaches, players, and parents to join your academy
          </p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="sidebar-content-grid">

        {/* LEFT: Send Invitation card — no overflow:hidden so role dropdown isn't clipped */}
        <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20, boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #EC4899, #8B5CF6)', borderRadius: '20px 20px 0 0' }} />
          <div style={{ padding: '22px 24px 0' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Send New Invitation</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3, marginBottom: 22 }}>Invite a new member via email link</div>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {/* Success banner */}
            {sentMsg && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#065F46' }}>
                      {sentMsg === 'email' ? `Invitation sent to ${sentEmail}` : `Invitation created for ${sentEmail}`}
                    </div>
                    {sentMsg === 'link' && (
                      <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 2 }}>Copy the link below to share manually</div>
                    )}
                  </div>
                </div>
                {regLink && (
                  <div style={{ marginTop: 8, background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#CBD5E1', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Link size={10} /> Registration Link
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#64748B', wordBreak: 'break-all' as const, lineHeight: 1.5 }}>{regLink}</span>
                      <button onClick={copyRegLink} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: linkCopied ? '#ECFDF5' : '#FFFFFF', border: `1px solid ${linkCopied ? '#A7F3D0' : '#E2E8F0'}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: linkCopied ? '#059669' : '#64748B' }}>
                        {linkCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {sendErr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 16 }}>
                <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.83rem', color: '#B91C1C' }}>{sendErr}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-grid-2">
                <div>
                  <FieldLabel required>First Name</FieldLabel>
                  <FieldInput value={form.first_name} placeholder="Jordan" error={errors.first_name}
                    onChange={e => setField('first_name', e.target.value)} />
                  {errors.first_name && <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 5 }}>{errors.first_name}</p>}
                </div>
                <div>
                  <FieldLabel required>Last Name</FieldLabel>
                  <FieldInput value={form.last_name} placeholder="Ellis" error={errors.last_name}
                    onChange={e => setField('last_name', e.target.value)} />
                  {errors.last_name && <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 5 }}>{errors.last_name}</p>}
                </div>
              </div>

              <div>
                <FieldLabel required>Role</FieldLabel>
                <RoleSelect value={form.role} onChange={v => setField('role', v)} />
              </div>

              <div>
                <FieldLabel required>Email Address</FieldLabel>
                <FieldInput type="email" value={form.email} placeholder="member@example.com"
                  error={errors.email} icon={<Mail size={15} />}
                  onChange={e => setField('email', e.target.value)} />
                {errors.email && <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 5 }}>{errors.email}</p>}
              </div>

              <button type="submit" disabled={sending} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', height: 44, marginTop: 4,
                background: sending ? '#E2E8F0' : 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                border: 'none', borderRadius: 11,
                color: sending ? '#94A3B8' : '#fff', fontWeight: 700, fontSize: '0.9rem',
                cursor: sending ? 'not-allowed' : 'pointer',
                boxShadow: sending ? 'none' : '0 4px 14px rgba(168,85,247,0.35)',
                transition: 'all 0.2s',
              }}>
                {sending
                  ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#94A3B8' }} /> Sending…</>
                  : <><Send size={15} /> Send Invitation</>}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Invitation history */}
        <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20, boxShadow: '0 4px 24px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '20px 22px 16px', borderBottom: '1px solid #F8FAFC' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Invitation History</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>Track all sent invitations</div>
            </div>

            {/* Pill tab filter — scrollable on mobile */}
            <div style={{ display: 'flex', gap: 3, background: '#F1F5F9', borderRadius: 10, padding: 3, overflowX: 'auto', flexShrink: 0 }}>
              {(['pending', 'accepted', 'expired'] as const).map(s => {
                const isActive = filter === s;
                const meta = STATUS[s];
                const count = filterCounts[s];
                return (
                  <button key={s} onClick={() => setFilter(s)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 8,
                    background: isActive ? '#FFFFFF' : 'transparent', border: 'none', cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 4px rgba(15,23,42,0.10)' : 'none',
                    fontSize: '0.8rem', fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1E293B' : '#94A3B8', transition: 'all 0.18s',
                    whiteSpace: 'nowrap' as const, flexShrink: 0,
                  }}>
                    {filterLabels[s]}
                    {count > 0 && (
                      <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 800, background: isActive ? meta.bg : '#E2E8F0', color: isActive ? meta.color : '#94A3B8', border: `1px solid ${isActive ? meta.border : '#E2E8F0'}` }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error banner */}
          {listErr && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} style={{ color: '#EF4444' }} />
                <span style={{ fontSize: '0.83rem', color: '#B91C1C' }}>{listErr}</span>
              </div>
              <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #FECACA', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#EF4444' }}>
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton" style={{ width: '45%', height: 12 }} />
                    <div className="skeleton" style={{ width: '65%', height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 56, height: 22, borderRadius: 99 }} />
                  <div className="skeleton" style={{ width: 64, height: 22, borderRadius: 99 }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Mail size={28} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#475569' }}>
                No {filterLabels[filter].toLowerCase()} invitations
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: 6 }}>
                {filter === 'pending' ? 'Use the form on the left to send your first invitation.' : `No ${filterLabels[filter].toLowerCase()} invitations found.`}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Member', 'Role', 'Status', 'Expires', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 16px', textAlign: 'left', background: '#FAFAFA', fontSize: '0.68rem', fontWeight: 700, color: '#CBD5E1', letterSpacing: '0.08em', textTransform: 'uppercase' as const, borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' as const }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => {
                    const st      = inviteStatus(inv);
                    const stMeta  = STATUS[st];
                    const roleMeta = ROLES.find(r => r.value === inv.role);
                    const lastRow  = idx === filtered.length - 1;
                    return (
                      <tr key={inv.id} style={{ borderBottom: lastRow ? 'none' : '1px solid #F8FAFC' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FAFAFE'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <InitialsTile firstName={inv.first_name} lastName={inv.last_name} role={inv.role} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B', lineHeight: 1.3 }}>
                                {inv.first_name && inv.last_name ? `${inv.first_name} ${inv.last_name}` : inv.email}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                {inv.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' as const }}>
                          {roleMeta ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: roleMeta.bg, border: `1px solid ${roleMeta.border}`, fontSize: '0.72rem', fontWeight: 600, color: roleMeta.color }}>
                              <roleMeta.icon size={11} />{inv.role}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{inv.role}</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' as const }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: stMeta.bg, border: `1px solid ${stMeta.border}`, fontSize: '0.72rem', fontWeight: 600, color: stMeta.color }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: stMeta.color, flexShrink: 0 }} />
                            {stMeta.label}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' as const }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CalendarDays size={12} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>{fmtDate(inv.expires_at)}</span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {st === 'pending' && (
                            <button onClick={() => handleRevoke(inv.id)} disabled={revoking} title="Revoke invitation"
                              style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid transparent', color: '#CBD5E1', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#EF4444'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#CBD5E1'; }}>
                              <Trash2 size={14} />
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
    </div>
  );
}
