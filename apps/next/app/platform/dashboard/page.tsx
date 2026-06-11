'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformApi } from '@sams/api';
import type { PlatformStats, EnrollmentRequest } from '@sams/api';

function ShimmerBlock({ width = '100%', height = 20, radius = 6 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }} />
  );
}

const DARK_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
};

const KPIS = [
  {
    label: 'Total Academies',
    key: 'total_academies' as const,
    emoji: '🏫',
    iconBg: 'rgba(99,102,241,0.1)',
    iconBorder: 'rgba(99,102,241,0.22)',
    dot: '#6366F1',
    blob: 'rgba(99,102,241,0.18)',
  },
  {
    label: 'Active Academies',
    key: 'active_academies' as const,
    emoji: null,
    iconBg: 'rgba(16,185,129,0.1)',
    iconBorder: 'rgba(16,185,129,0.22)',
    dot: '#10B981',
    blob: 'rgba(16,185,129,0.18)',
  },
  {
    label: 'Pending Requests',
    key: 'pending_requests' as const,
    emoji: null,
    iconBg: 'rgba(245,158,11,0.1)',
    iconBorder: 'rgba(245,158,11,0.22)',
    dot: '#F59E0B',
    blob: 'rgba(245,158,11,0.18)',
  },
  {
    label: 'Approved This Month',
    key: 'approved_this_month' as const,
    emoji: '⚡',
    iconBg: 'rgba(139,92,246,0.1)',
    iconBorder: 'rgba(139,92,246,0.22)',
    dot: '#8B5CF6',
    blob: 'rgba(139,92,246,0.18)',
  },
];

export default function PlatformDashboardPage() {
  const router  = useRouter();
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [recent,  setRecent]  = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      <div>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 6, padding: '3px 10px',
            color: '#A78BFA',
            fontSize: '0.6rem', fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#8B5CF6',
              boxShadow: '0 0 6px #8B5CF6',
              display: 'inline-block',
            }} />
            PLATFORM ADMIN
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F1F5F9', margin: 0, letterSpacing: -0.8 }}>
            Control Plane
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', marginTop: 5 }}>
            Manage academies, review enrollment requests, and provision new tenants.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {KPIS.map(kpi => (
            <div key={kpi.label} style={{ ...DARK_CARD, padding: 22, position: 'relative', overflow: 'hidden' }}>
              {/* Ambient glow blob */}
              <div style={{
                position: 'absolute', top: -32, right: -32,
                width: 110, height: 110, borderRadius: '50%',
                background: `radial-gradient(circle, ${kpi.blob} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Icon row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: kpi.iconBg,
                  border: `1px solid ${kpi.iconBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: kpi.emoji ? '1.15rem' : undefined,
                }}>
                  {kpi.key === 'active_academies' ? (
                    <span style={{
                      width: 13, height: 13, borderRadius: '50%',
                      background: '#10B981',
                      boxShadow: '0 0 10px #10B981, 0 0 20px rgba(16,185,129,0.4)',
                      display: 'inline-block',
                    }} />
                  ) : kpi.key === 'pending_requests' ? (
                    <span style={{ color: '#F59E0B', fontSize: '1.1rem', fontWeight: 900 }}>◆</span>
                  ) : (
                    <span>{kpi.emoji}</span>
                  )}
                </div>
                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: kpi.dot,
                  boxShadow: `0 0 8px ${kpi.dot}, 0 0 16px ${kpi.dot}44`,
                }} />
              </div>

              {/* Value */}
              {loading ? (
                <div style={{ marginBottom: 10 }}>
                  <ShimmerBlock height={38} radius={8} width="55%" />
                </div>
              ) : (
                <div style={{
                  fontSize: '2.2rem', fontWeight: 900,
                  color: '#F1F5F9', letterSpacing: -1.2,
                  lineHeight: 1, marginBottom: 8,
                }}>
                  {String(stats?.[kpi.key] ?? 0)}
                </div>
              )}

              {/* Label */}
              <div style={{
                fontSize: '0.63rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.32)',
              }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pending queue table */}
        <div style={{ ...DARK_CARD, padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            padding: '18px 26px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.9rem', margin: 0 }}>
                Pending Enrollment Requests
              </p>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.32)', marginTop: 3 }}>
                Academies waiting for provisioning
              </p>
            </div>
            <button
              onClick={() => router.push('/platform/requests')}
              style={{
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.22)',
                borderRadius: 8, padding: '6px 14px',
                cursor: 'pointer', fontSize: '0.78rem',
                fontWeight: 700, color: '#A78BFA',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.1)'; }}
            >
              View all →
            </button>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
            padding: '10px 26px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {['ACADEMY', 'CONTACT', 'SPORT', 'SUBMITTED'].map(h => (
              <span key={h} style={{
                fontSize: '0.6rem', fontWeight: 800,
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.28)',
                textTransform: 'uppercase',
              }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                  <ShimmerBlock height={13} radius={4} />
                  <ShimmerBlock height={13} radius={4} />
                  <ShimmerBlock height={13} radius={4} />
                  <ShimmerBlock height={13} radius={4} />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ padding: '60px 26px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', margin: '0 auto 14px',
                boxShadow: '0 0 24px rgba(16,185,129,0.12)',
              }}>✓</div>
              <p style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.9rem', margin: 0 }}>
                All caught up
              </p>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', marginTop: 5 }}>
                No pending enrollment requests.
              </p>
            </div>
          ) : (
            recent.map(req => (
              <div
                key={req.id}
                onClick={() => router.push(`/platform/requests/${req.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                  padding: '14px 26px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', transition: 'background 0.12s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
                    {req.academy_name}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>
                    {req.contact_email}
                  </p>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                  {req.contact_name}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                  {req.sport || '—'}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', margin: 0 }}>
                  {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
