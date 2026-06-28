'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  User, Phone, MapPin, Zap, AlertCircle, RefreshCw, FileText,
  Users, Heart, Shield, ExternalLink, Loader2,
} from 'lucide-react';
import { registrationApi } from '@sams/api';
import type { PlayerRegistration } from '@sams/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcAge(dob?: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

type StatusKey = 'submitted' | 'approved' | 'rejected';

const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  submitted: { label: 'Pending Review', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
  approved:  { label: 'Approved',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status as StatusKey] ?? STATUS_META.submitted;
  const Icon = meta.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: meta.bg, border: `1px solid ${meta.border}`, fontSize: '0.72rem', fontWeight: 600, color: meta.color }}>
      <Icon size={11} />{meta.label}
    </span>
  );
}

// ─── Initials avatar ──────────────────────────────────────────────────────────

function Initials({ firstName = '', lastName = '' }: { firstName?: string; lastName?: string }) {
  const init = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
  return (
    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.02em' }}>
      {init}
    </div>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
      <div style={{ minWidth: 170, fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: '#1E293B', flex: 1 }}>{value}</div>
    </div>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ onConfirm, onCancel, loading }: { onConfirm: (reason: string) => void; onCancel: () => void; loading: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: 6 }}>Reject Registration</div>
        <div style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Provide a reason so the player knows what to correct and resubmit.</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Date of birth doesn't match the birth certificate. Please upload a clearer copy of your birth certificate."
          autoFocus
          style={{ width: '100%', minHeight: 100, padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', color: '#1E293B', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason)}
            disabled={!reason.trim() || loading}
            style={{
              padding: '9px 18px', borderRadius: 9, border: 'none',
              background: !reason.trim() || loading ? '#F1F5F9' : '#DC2626',
              color: !reason.trim() || loading ? '#94A3B8' : '#fff',
              fontWeight: 700, fontSize: '0.875rem', cursor: !reason.trim() || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Rejecting…</> : 'Reject Registration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Registration detail panel ────────────────────────────────────────────────

function RegistrationDetail({
  reg,
  onApprove,
  onReject,
  actionLoading,
}: {
  reg: PlayerRegistration;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  const player = reg.users;
  const age = calcAge(reg.date_of_birth);

  const sections = [
    {
      title: 'Personal Details', icon: User, color: '#7C3AED',
      rows: [
        { label: 'Date of Birth', value: fmtDate(reg.date_of_birth) + (age ? ` (${age} years old)` : '') },
        { label: 'Phone', value: reg.phone },
        { label: 'Address', value: reg.address },
        { label: 'Nationality', value: reg.nationality },
        { label: 'Blood Group', value: reg.blood_group },
      ],
    },
    {
      title: 'Sport Details', icon: Zap, color: '#059669',
      rows: [
        { label: 'Position', value: reg.position },
        { label: 'Preferred Foot', value: reg.preferred_foot },
        { label: 'Previous Club', value: reg.previous_club },
        { label: 'Years of Experience', value: reg.years_of_experience != null ? `${reg.years_of_experience} year${reg.years_of_experience !== 1 ? 's' : ''}` : null },
      ],
    },
    {
      title: 'Emergency Contact', icon: Phone, color: '#DC2626',
      rows: [
        { label: 'Name', value: reg.emergency_contact_name },
        { label: 'Phone', value: reg.emergency_contact_phone },
        { label: 'Relationship', value: reg.emergency_contact_relationship },
      ],
    },
    {
      title: 'Parent / Guardian', icon: Users, color: '#D97706',
      rows: [
        { label: 'Name', value: reg.parent_guardian_name },
        { label: 'Phone', value: reg.parent_guardian_phone },
        { label: 'Relationship', value: reg.parent_guardian_relationship },
      ],
    },
    {
      title: 'Medical Information', icon: Heart, color: '#EF4444',
      rows: [
        { label: 'Medical Conditions', value: reg.medical_conditions },
        { label: 'Allergies', value: reg.allergies },
      ],
    },
  ];

  const documents = [
    { label: 'Birth Certificate', url: reg.birth_certificate_url },
    { label: 'Passport Photo', url: reg.passport_photo_url },
    { label: 'National ID', url: reg.national_id_url },
    { label: 'Parent Consent', url: reg.parent_consent_url },
  ].filter(d => d.url);

  return (
    <div>
      {/* Player header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <Initials firstName={player?.first_name} lastName={player?.last_name} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
            {player?.first_name} {player?.last_name}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>{player?.email}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill status={reg.status} />
        </div>
      </div>

      {/* Rejection reason if rejected */}
      {reg.status === 'rejected' && reg.rejection_reason && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9A3412', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Rejection Reason</div>
          <div style={{ fontSize: '0.875rem', color: '#7C2D12', lineHeight: 1.65 }}>{reg.rejection_reason}</div>
        </div>
      )}

      {/* Detail sections */}
      {sections.map(({ title, icon: Icon, color, rows }) => {
        const filled = rows.filter(r => r.value);
        if (!filled.length) return null;
        return (
          <div key={title} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                <Icon size={13} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{title}</div>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '4px 14px' }}>
              {rows.map(r => <DetailRow key={r.label} label={r.label} value={r.value} />)}
            </div>
          </div>
        );
      })}

      {/* Documents */}
      {documents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: '#2563EB15', border: '1px solid #2563EB30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
              <Shield size={13} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>Submitted Documents</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {documents.map(d => (
              <a key={d.label} href={d.url!} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                color: '#2563EB', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none',
              }}>
                <FileText size={12} />{d.label}<ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      )}
      {documents.length === 0 && (
        <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} /> No documents uploaded.
        </div>
      )}

      {/* Submission date */}
      {reg.submitted_at && (
        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: 20 }}>
          Submitted on {fmtDate(reg.submitted_at)}
          {reg.reviewed_at && ` · Reviewed on ${fmtDate(reg.reviewed_at)}`}
          {reg.reviewer && ` by ${reg.reviewer.first_name} ${reg.reviewer.last_name}`}
        </div>
      )}

      {/* Action buttons */}
      {reg.status === 'submitted' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onApprove}
            disabled={actionLoading}
            style={{
              flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '11px 20px', borderRadius: 10, border: 'none',
              background: actionLoading ? '#F1F5F9' : 'linear-gradient(135deg,#059669,#047857)',
              color: actionLoading ? '#94A3B8' : '#fff',
              fontWeight: 700, fontSize: '0.875rem', cursor: actionLoading ? 'not-allowed' : 'pointer',
              boxShadow: actionLoading ? 'none' : '0 4px 12px rgba(5,150,105,0.3)',
            }}
          >
            {actionLoading ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle2 size={15} />}
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={actionLoading}
            style={{
              flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '11px 20px', borderRadius: 10, border: '1.5px solid #FECACA',
              background: '#FEF2F2', color: '#DC2626',
              fontWeight: 700, fontSize: '0.875rem', cursor: actionLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <XCircle size={15} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminRegistrationsPage() {
  const [filter, setFilter] = useState<StatusKey>('submitted');
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailReg, setDetailReg] = useState<PlayerRegistration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListErr('');
    try {
      const all = await Promise.all([
        registrationApi.getRegistrations('submitted'),
        registrationApi.getRegistrations('approved'),
        registrationApi.getRegistrations('rejected'),
      ]);
      setRegistrations([...all[0], ...all[1], ...all[2]]);
    } catch (e: unknown) {
      setListErr(e instanceof Error ? e.message : 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setDetailReg(null); return; }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const detail = await registrationApi.getRegistration(id);
      setDetailReg(detail);
    } catch { setDetailReg(null); }
    setDetailLoading(false);
  }

  async function handleApprove(id: string) {
    setActionLoading(true);
    try {
      await registrationApi.approveRegistration(id);
      await load();
      setExpandedId(null);
      setDetailReg(null);
    } catch { }
    setActionLoading(false);
  }

  function startReject(id: string) {
    setRejectingId(id);
    setShowRejectModal(true);
  }

  async function handleReject(reason: string) {
    if (!rejectingId) return;
    setActionLoading(true);
    try {
      await registrationApi.rejectRegistration(rejectingId, reason);
      await load();
      setExpandedId(null);
      setDetailReg(null);
      setShowRejectModal(false);
      setRejectingId(null);
    } catch { }
    setActionLoading(false);
  }

  const filtered = registrations.filter(r => r.status === filter);
  const counts = {
    submitted: registrations.filter(r => r.status === 'submitted').length,
    approved:  registrations.filter(r => r.status === 'approved').length,
    rejected:  registrations.filter(r => r.status === 'rejected').length,
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.2, margin: '0 0 6px' }}>
            Player Registrations
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>
            Review and approve player registration submissions
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {([
          { key: 'submitted', label: 'Pending Review', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
          { key: 'approved',  label: 'Approved',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 },
          { key: 'rejected',  label: 'Rejected',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle },
        ] as const).map(({ key, label, color, bg, border, icon: Icon }) => (
          <div
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? bg : '#FFFFFF',
              border: `1.5px solid ${filter === key ? border : '#E2E8F0'}`,
              borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
              transition: 'all 0.15s', boxShadow: filter === key ? `0 0 0 3px ${color}15` : '0 1px 4px rgba(15,23,42,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon size={16} style={{ color }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{counts[key]}</div>
          </div>
        ))}
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20, boxShadow: '0 4px 24px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#EC4899,#8B5CF6)' }} />
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F8FAFC' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
            {STATUS_META[filter].label} ({counts[filter]})
          </div>
        </div>

        {listErr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
            <AlertCircle size={14} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: '0.83rem', color: '#B91C1C' }}>{listErr}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className="skeleton" style={{ width: '40%', height: 12 }} />
                  <div className="skeleton" style={{ width: '60%', height: 10 }} />
                </div>
                <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 99 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <ClipboardList size={32} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#475569' }}>
              No {STATUS_META[filter].label.toLowerCase()} registrations
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: 6 }}>
              {filter === 'submitted' ? 'No registrations are awaiting review.' : `No ${filter} registrations found.`}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((reg, idx) => {
              const player = reg.users;
              const isExpanded = expandedId === reg.id;
              const isLast = idx === filtered.length - 1;
              return (
                <div key={reg.id} style={{ borderBottom: isLast ? 'none' : '1px solid #F8FAFC' }}>
                  {/* Row */}
                  <div
                    onClick={() => handleExpand(reg.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px',
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: isExpanded ? '#FAFAFE' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = '#FAFAFE'; }}
                    onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <Initials firstName={player?.first_name} lastName={player?.last_name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B', lineHeight: 1.3 }}>
                        {player?.first_name} {player?.last_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player?.email}
                        {reg.position ? ` · ${reg.position}` : ''}
                        {reg.submitted_at ? ` · Submitted ${fmtDate(reg.submitted_at)}` : ''}
                      </div>
                    </div>
                    <StatusPill status={reg.status} />
                    <div style={{ color: '#CBD5E1', flexShrink: 0, marginLeft: 4 }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 22px 22px', borderTop: '1px solid #F1F5F9' }}>
                      {detailLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', gap: 10 }}>
                          <Loader2 size={18} style={{ color: '#7C3AED', animation: 'spin 0.7s linear infinite' }} />
                          <span style={{ fontSize: '0.83rem', color: '#94A3B8' }}>Loading details…</span>
                        </div>
                      ) : detailReg ? (
                        <div style={{ paddingTop: 18 }}>
                          <RegistrationDetail
                            reg={detailReg}
                            onApprove={() => handleApprove(reg.id)}
                            onReject={() => startReject(reg.id)}
                            actionLoading={actionLoading}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: '20px 0', fontSize: '0.83rem', color: '#94A3B8', textAlign: 'center' }}>
                          Failed to load registration details.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRejectModal && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => { setShowRejectModal(false); setRejectingId(null); }}
          loading={actionLoading}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
