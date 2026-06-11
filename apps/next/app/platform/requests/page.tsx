'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformApi } from '@sams/api';
import type { EnrollmentRequest } from '@sams/api';

const NAVY = '#0D1B3E';

const TABS = [
  { key: 'pending',  label: 'Pending',  color: '#D97706', bg: '#FEF3C7' },
  { key: 'approved', label: 'Approved', color: '#059669', bg: '#ECFDF5' },
  { key: 'rejected', label: 'Rejected', color: '#EF4444', bg: '#FEF2F2' },
];

export default function RequestsPage() {
  const router = useRouter();
  const [tab,      setTab]      = useState<'pending'|'approved'|'rejected'>('pending');
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApi.getEnrollmentRequests(tab)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const activeTab = TABS.find(t => t.key === tab)!;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: NAVY, margin: 0, letterSpacing: -0.5 }}>
          Enrollment Requests
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 4 }}>
          Review, approve, or reject academy enrollment requests.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: '8px 18px', borderRadius: 99, border: 'none',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
              transition: 'all 0.15s',
              background: tab === t.key ? t.bg : '#F1F5F9',
              color:      tab === t.key ? t.color : '#64748B',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #F1F5F9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: tab === 'pending' ? '2fr 1.5fr 1fr 1fr 1fr' : '2fr 1.5fr 1fr 1fr 1.2fr',
          padding: '10px 24px', background: '#F8FAFC',
          borderBottom: '1px solid #F1F5F9',
        }}>
          {['ACADEMY', 'CONTACT', 'SPORT', 'SUBMITTED',
            tab === 'pending' ? 'ACTIONS' : tab === 'approved' ? 'PROVISIONED' : 'REASON'
          ].map(h => (
            <span key={h} style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '28px 24px', color: '#94A3B8', fontSize: '0.875rem' }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', margin: 0 }}>
              No {tab} requests
            </p>
          </div>
        ) : (
          requests.map(req => (
            <div
              key={req.id}
              style={{
                display: 'grid',
                gridTemplateColumns: tab === 'pending' ? '2fr 1.5fr 1fr 1fr 1fr' : '2fr 1.5fr 1fr 1fr 1.2fr',
                padding: '14px 24px', borderBottom: '1px solid #F1F5F9',
                alignItems: 'center', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Academy */}
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, margin: 0 }}>
                  {req.academy_name}
                </p>
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
                  {req.contact_email}
                </p>
              </div>

              {/* Contact */}
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{req.contact_name}</p>

              {/* Sport */}
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{req.sport || '—'}</p>

              {/* Date */}
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
                {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              {/* Last col */}
              {tab === 'pending' ? (
                <button
                  onClick={() => router.push(`/platform/requests/${req.id}`)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: NAVY, color: '#fff',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Review →
                </button>
              ) : tab === 'approved' ? (
                <span style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 99,
                  background: '#ECFDF5', color: '#059669',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>Provisioned ✓</span>
              ) : (
                <span style={{
                  fontSize: '0.78rem', color: '#64748B',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {req.rejection_reason || '—'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
