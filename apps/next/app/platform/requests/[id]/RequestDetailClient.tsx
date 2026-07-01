'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { platformApi } from '@sams/api';
import type { EnrollmentRequest } from '@sams/api';

const NAVY = '#0D1B3E';

export default function RequestDetailClient() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [request,       setRequest]       = useState<EnrollmentRequest | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason,  setRejectReason]  = useState('');
  const [showReject,    setShowReject]    = useState(false);
  const [toast,         setToast]         = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    platformApi.getEnrollmentRequest(id)
      .then(setRequest)
      .catch(() => router.replace('/platform/requests'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function showToast(type: 'success'|'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleApprove() {
    if (!request) return;
    const confirmed = window.confirm(
      `Provision "${request.academy_name}" and send a login invite to ${request.contact_email}?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await platformApi.approveEnrollmentRequest(id);
      showToast('success', `Academy "${request.academy_name}" provisioned. Invite email sent to ${request.contact_email}.`);
      setTimeout(() => router.push('/platform/requests'), 2000);
    } catch (err: any) {
      showToast('error', err?.message || 'Approval failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      showToast('error', 'Please provide a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await platformApi.rejectEnrollmentRequest(id, rejectReason.trim());
      showToast('success', 'Request rejected.');
      setTimeout(() => router.push('/platform/requests'), 1500);
    } catch (err: any) {
      showToast('error', err?.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return (
    <div style={{ padding: 40, color: '#94A3B8' }}>Loading request…</div>
  );

  if (!request) return null;

  const isPending = request.status === 'pending';

  const detailRows = [
    { label: 'Academy Name',       value: request.academy_name },
    { label: 'Contact Name',       value: request.contact_name },
    { label: 'Contact Email',      value: request.contact_email },
    { label: 'Sport / Discipline', value: request.sport || '—' },
    { label: 'Estimated Players',  value: request.estimated_players ? String(request.estimated_players) : '—' },
    { label: 'Submitted',          value: new Date(request.created_at).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) },
    { label: 'Status',             value: request.status.toUpperCase() },
  ];

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 1000,
          padding: '14px 20px', borderRadius: 12,
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
          color: toast.type === 'success' ? '#065F46' : '#991B1B',
          fontSize: '0.875rem', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push('/platform/requests')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '0.85rem', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to Requests
      </button>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: NAVY, margin: 0, letterSpacing: -0.5 }}>
          {request.academy_name}
        </h1>
        <span style={{
          padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          background: isPending ? '#FEF3C7' : request.status === 'approved' ? '#ECFDF5' : '#FEF2F2',
          color:      isPending ? '#D97706' : request.status === 'approved' ? '#059669' : '#EF4444',
        }}>
          {request.status}
        </span>
      </div>

      {/* Detail card */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #F1F5F9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden', marginBottom: 20,
      }}>
        <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #F1F5F9' }}>
          <p style={{ fontWeight: 700, color: NAVY, fontSize: '0.9rem', margin: 0 }}>Enrollment Details</p>
        </div>
        {detailRows.map(row => (
          <div key={row.label} style={{
            display: 'grid', gridTemplateColumns: '200px 1fr',
            padding: '13px 24px', borderBottom: '1px solid #F9FAFB',
            alignItems: 'start',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {row.label}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#1E293B', fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
        {request.message && (
          <div style={{ padding: '16px 24px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Message from Academy
            </p>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, background: '#F8FAFC', borderRadius: 10, padding: '12px 16px', margin: 0 }}>
              {request.message}
            </p>
          </div>
        )}
      </div>

      {/* Action panel — only for pending */}
      {isPending && (
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #F1F5F9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #F1F5F9' }}>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: '0.9rem', margin: 0 }}>Action</p>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
              Approving will create the academy and send a login invite to {request.contact_email}.
            </p>
          </div>
          <div style={{ padding: '20px 24px' }}>

            {!showReject ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{
                    padding: '11px 28px', borderRadius: 10, border: 'none',
                    background: actionLoading ? '#6B7280' : '#059669',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 800,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {actionLoading ? 'Processing…' : '✅ Approve & Provision'}
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  disabled={actionLoading}
                  style={{
                    padding: '11px 28px', borderRadius: 10,
                    border: '1.5px solid #FECACA',
                    background: 'transparent', color: '#EF4444',
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ✕ Reject
                </button>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this request is being rejected…"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1.5px solid #E5E7EB', fontSize: '0.875rem',
                    resize: 'vertical', boxSizing: 'border-box',
                    outline: 'none', marginBottom: 12,
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 24px', borderRadius: 10, border: 'none',
                      background: '#EF4444', color: '#fff',
                      fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setRejectReason(''); }}
                    style={{
                      padding: '10px 24px', borderRadius: 10,
                      border: '1.5px solid #E5E7EB', background: 'transparent',
                      color: '#64748B', fontSize: '0.875rem', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approved/Rejected summary */}
      {!isPending && request.reviewed_at && (
        <div style={{
          background: request.status === 'approved' ? '#F0FDF4' : '#FFF5F5',
          border: `1px solid ${request.status === 'approved' ? '#BBF7D0' : '#FECACA'}`,
          borderRadius: 12, padding: '16px 20px',
        }}>
          <p style={{ fontWeight: 700, color: request.status === 'approved' ? '#065F46' : '#991B1B', margin: 0, fontSize: '0.875rem' }}>
            {request.status === 'approved' ? '✅ Approved and provisioned' : '✕ Rejected'}
          </p>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
            {new Date(request.reviewed_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            {request.rejection_reason && ` · "${request.rejection_reason}"`}
          </p>
        </div>
      )}
    </div>
  );
}
