'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformApi } from '@sams/api';
import type { PlatformStats, EnrollmentRequest } from '@sams/api';

const NAVY = '#0D1B3E';

export default function PlatformDashboardPage() {
  const router  = useRouter();
  const [stats,    setStats]    = useState<PlatformStats | null>(null);
  const [recent,   setRecent]   = useState<EnrollmentRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      platformApi.getPlatformStats(),
      platformApi.getEnrollmentRequests('pending'),
    ]).then(([s, r]) => {
      setStats(s);
      setRecent(r.slice(0, 5));
    }).catch(() => {})
     .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'Total Academies',    value: stats?.total_academies     ?? '…', icon: '🏫', bg: '#EFF6FF', accent: '#2563EB' },
    { label: 'Active Academies',   value: stats?.active_academies    ?? '…', icon: '✅', bg: '#ECFDF5', accent: '#059669' },
    { label: 'Pending Requests',   value: stats?.pending_requests    ?? '…', icon: '📋', bg: stats?.pending_requests ? '#FEF3C7' : '#F3F4F6', accent: stats?.pending_requests ? '#D97706' : '#6B7280' },
    { label: 'Approved This Month',value: stats?.approved_this_month ?? '…', icon: '🎉', bg: '#F5F3FF', accent: '#7C3AED' },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'inline-block',
          background: NAVY, color: 'rgba(255,255,255,0.8)',
          borderRadius: 6, padding: '3px 10px',
          fontSize: '0.62rem', fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>PLATFORM ADMIN</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: NAVY, margin: 0, letterSpacing: -0.5 }}>
          Control Plane
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 4 }}>
          Manage academies, review enrollment requests, and provision new tenants.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{
            background: '#fff', borderRadius: 16, padding: 20,
            border: '1px solid #F1F5F9',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: kpi.bg, fontSize: '1.2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>{kpi.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: NAVY, letterSpacing: -0.5 }}>
              {loading ? '…' : String(kpi.value)}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginTop: 4 }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Pending requests queue */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #F1F5F9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem', margin: 0 }}>
              Pending Enrollment Requests
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
              Academies waiting for provisioning
            </p>
          </div>
          <button
            onClick={() => router.push('/platform/requests')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: NAVY }}
          >
            View all →
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
          padding: '8px 24px', background: '#F8FAFC',
          borderBottom: '1px solid #F1F5F9',
        }}>
          {['ACADEMY', 'CONTACT', 'SPORT', 'SUBMITTED'].map(h => (
            <span key={h} style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '24px', color: '#94A3B8', fontSize: '0.875rem' }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✅</div>
            <p style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', margin: 0 }}>All caught up</p>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 4 }}>No pending enrollment requests.</p>
          </div>
        ) : (
          recent.map(req => (
            <div
              key={req.id}
              onClick={() => router.push(`/platform/requests/${req.id}`)}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                padding: '14px 24px', borderBottom: '1px solid #F1F5F9',
                cursor: 'pointer', transition: 'background 0.12s',
                alignItems: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, margin: 0 }}>{req.academy_name}</p>
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>{req.contact_email}</p>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{req.contact_name}</p>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{req.sport || '—'}</p>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
                {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
