'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformApi } from '@sams/api';
import type { EnrollmentRequest } from '@sams/api';

const DARK_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
};

const TABS = [
  {
    key: 'pending',
    label: 'Pending',
    activeBg:     'rgba(245,158,11,0.1)',
    activeBorder: 'rgba(245,158,11,0.25)',
    activeColor:  '#FBBF24',
  },
  {
    key: 'approved',
    label: 'Approved',
    activeBg:     'rgba(16,185,129,0.1)',
    activeBorder: 'rgba(16,185,129,0.25)',
    activeColor:  '#34D399',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    activeBg:     'rgba(239,68,68,0.1)',
    activeBorder: 'rgba(239,68,68,0.25)',
    activeColor:  '#F87171',
  },
];

export default function RequestsPage() {
  const router = useRouter();
  const [tab,      setTab]      = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApi.getEnrollmentRequests(tab)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const emptyIcons: Record<string, string> = {
    pending:  '📋',
    approved: '✓',
    rejected: '✕',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#F1F5F9', margin: 0, letterSpacing: -0.8 }}>
          Enrollment Requests
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', marginTop: 5 }}>
          Review, approve, or reject academy enrollment requests.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              style={{
                padding: '8px 20px', borderRadius: 99,
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                transition: 'all 0.15s',
                background: active ? t.activeBg : 'rgba(255,255,255,0.05)',
                color:      active ? t.activeColor : 'rgba(255,255,255,0.38)',
                border:     active ? `1px solid ${t.activeBorder}` : '1px solid rgba(255,255,255,0.08)',
                boxShadow:  active ? `0 0 12px ${t.activeBg}` : 'none',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ ...DARK_CARD, padding: 0, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: tab === 'pending' ? '2fr 1.5fr 1fr 1fr 1fr' : '2fr 1.5fr 1fr 1fr 1.2fr',
          padding: '11px 26px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {['ACADEMY', 'CONTACT', 'SPORT', 'SUBMITTED',
            tab === 'pending' ? 'ACTIONS' : tab === 'approved' ? 'PROVISIONED' : 'REASON',
          ].map(h => (
            <span key={h} style={{
              fontSize: '0.6rem', fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.28)',
              textTransform: 'uppercase',
            }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '28px 26px', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
            Loading…
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '70px 26px', textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', margin: '0 auto 16px',
            }}>
              {emptyIcons[tab]}
            </div>
            <p style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.9rem', margin: 0 }}>
              No {tab} requests
            </p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', marginTop: 6 }}>
              {tab === 'pending'
                ? 'New enrollment submissions will appear here.'
                : tab === 'approved'
                ? 'Approved academies will be listed here.'
                : 'Rejected requests will be listed here.'}
            </p>
          </div>
        ) : (
          requests.map(req => (
            <div
              key={req.id}
              style={{
                display: 'grid',
                gridTemplateColumns: tab === 'pending' ? '2fr 1.5fr 1fr 1fr 1fr' : '2fr 1.5fr 1fr 1fr 1.2fr',
                padding: '14px 26px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'center',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Academy */}
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
                  {req.academy_name}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>
                  {req.contact_email}
                </p>
              </div>

              {/* Contact */}
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                {req.contact_name}
              </p>

              {/* Sport */}
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                {req.sport || '—'}
              </p>

              {/* Date */}
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', margin: 0 }}>
                {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              {/* Last column */}
              {tab === 'pending' ? (
                <button
                  onClick={() => router.push(`/platform/requests/${req.id}`)}
                  style={{
                    padding: '7px 14px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(109,40,217,0.45)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(109,40,217,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(109,40,217,0.45)'; }}
                >
                  Review →
                </button>
              ) : tab === 'approved' ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 99,
                  background: 'rgba(16,185,129,0.12)',
                  color: '#34D399',
                  border: '1px solid rgba(16,185,129,0.25)',
                  fontSize: '0.72rem', fontWeight: 700,
                  boxShadow: '0 0 10px rgba(16,185,129,0.25)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block', boxShadow: '0 0 4px #34D399' }} />
                  Provisioned
                </span>
              ) : (
                <span style={{
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.38)',
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
