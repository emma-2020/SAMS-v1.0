'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { ParentAnalytics } from '@sams/api';
import {
  StatCard, TrendAreaChart, SectionCard, SkeletonCard,
  ANALYTICS_CSS, SUCCESS, WARNING, DANGER, BRAND, INFO,
} from '@sams/ui/src/charts/analytics';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    paid:    { bg: '#DCFCE7', color: '#16A34A' },
    partial: { bg: '#FEF9C3', color: '#CA8A04' },
    overdue: { bg: '#FEE2E2', color: '#DC2626' },
  };
  const s = map[status] ?? { bg: '#F1F5F9', color: '#64748B' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function GfaBadge({ eligible }: { eligible: boolean | null }) {
  if (eligible === null) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No data</span>;
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
      background: eligible ? '#DCFCE7' : '#FEE2E2',
      color: eligible ? '#16A34A' : '#DC2626',
    }}>
      {eligible ? 'GFA Eligible ✓' : 'At Risk ✗'}
    </span>
  );
}

export function ParentAnalyticsScreen() {
  const [data,    setData]    = useState<ParentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    analyticsApi.getParentAnalytics()
      .then(setData)
      .catch(() => setError('Failed to load your child\'s data.'))
      .finally(() => setLoading(false));
  }, []);

  const wellness      = data?.wellness;
  const attendance    = data?.attendance;
  const fees          = data?.fees;
  const wColor        = wellness ? (wellness.latestScore >= 70 ? SUCCESS : wellness.latestScore >= 45 ? WARNING : DANGER) : BRAND;
  const wLabel        = wellness ? (wellness.latestScore >= 70 ? 'Fully Fit' : wellness.latestScore >= 45 ? 'Moderate' : 'Needs Rest') : '';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{ANALYTICS_CSS}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
          My Child's Progress
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Attendance, wellness, and fee summary
        </p>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <>
          <div className="analytics-kpi-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}</div>
          <div className="analytics-2col"><SkeletonCard height={260} /><SkeletonCard height={260} /></div>
        </>
      ) : error ? null : !data?.linked ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 20, border: '1.5px dashed var(--border-default,#CBD5E1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, fontSize: '1.05rem' }}>No child linked</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Ask your academy admin to link your account to your child's roster entry.
          </div>
        </div>
      ) : (
        <>
          {/* ── Child banner ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
            borderRadius: 16, background: `linear-gradient(135deg,${BRAND}15,${INFO}10)`,
            border: `1.5px solid ${BRAND}30`, marginBottom: 24,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg,${BRAND},${INFO})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>
              {data.child!.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{data.child!.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Team: {data.child!.team}</div>
            </div>
            {attendance && (
              <div style={{ marginLeft: 'auto' }}>
                <GfaBadge eligible={attendance.gfaEligible} />
              </div>
            )}
          </div>

          {/* ── KPI row ── */}
          <div className="analytics-kpi-grid">
            <StatCard
              label="Attendance Rate"
              value={attendance?.rate ?? 0}
              format={(n) => `${n}%`}
              color={attendance && attendance.rate >= 70 ? SUCCESS : DANGER}
              subtitle={attendance ? `${attendance.present} of ${attendance.total} sessions` : 'No data'}
            />
            <StatCard
              label="Wellness Score"
              value={wellness?.latestScore ?? 0}
              color={wColor}
              subtitle={wLabel || 'No logs yet'}
              sparkline={wellness?.trend.map(t => ({ v: t.score }))}
            />
            <StatCard
              label="Avg Wellness"
              value={wellness?.avgScore ?? 0}
              color={wellness && wellness.avgScore >= 70 ? SUCCESS : WARNING}
              subtitle={`Over ${wellness?.totalLogs ?? 0} check-ins`}
            />
            <StatCard
              label="Outstanding Fees"
              value={fees?.outstanding ?? 0}
              format={(n) => `GHS ${n.toFixed(2)}`}
              color={fees && fees.outstanding > 0 ? DANGER : SUCCESS}
              subtitle={fees ? `GHS ${fees.totalPaid.toFixed(2)} paid` : 'No data'}
            />
          </div>

          {/* ── Wellness + Attendance ── */}
          <div className="analytics-2col">
            <SectionCard
              title="Wellness Trend"
              subtitle="Last 60 days check-in scores"
              accent={`linear-gradient(90deg,${wColor},${wColor}80)`}
            >
              {wellness && wellness.trend.length > 1 ? (
                <TrendAreaChart
                  data={wellness.trend}
                  dataKeys={[{ key: 'score', color: wColor, label: 'Wellness Score' }]}
                  xAxisKey="date"
                  height={200}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {wellness?.totalLogs === 0 ? 'No wellness check-ins logged yet' : 'Need more data to show trend'}
                </div>
              )}

              {/* Health flags */}
              {wellness && wellness.flagCount > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600 }}>
                    {wellness.flagCount} wellness flag{wellness.flagCount > 1 ? 's' : ''} in the last 60 days
                  </span>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Attendance Summary"
              subtitle="Session attendance this season"
              accent={`linear-gradient(90deg,${BRAND},${INFO})`}
            >
              {attendance && attendance.total > 0 ? (
                <>
                  {/* Big rate display */}
                  <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 900, color: attendance.rate >= 70 ? SUCCESS : DANGER, lineHeight: 1 }}>
                      {attendance.rate}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      {attendance.present} attended out of {attendance.total} sessions
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <GfaBadge eligible={attendance.gfaEligible} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      GFA requires ≥70% to be eligible for matches
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 8, padding: '0 8px' }}>
                    <div style={{ height: 12, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${attendance.rate}%`, height: '100%', borderRadius: 99,
                        background: attendance.rate >= 70
                          ? `linear-gradient(90deg,${SUCCESS},#34D399)`
                          : `linear-gradient(90deg,${DANGER},#F87171)`,
                        transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>0%</span><span style={{ color: WARNING }}>70% threshold</span><span>100%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No attendance records yet
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Fee history ── */}
          {fees && (
            <SectionCard
              title="Fee Status"
              subtitle="Payment history and outstanding balance"
              accent={`linear-gradient(90deg,${fees.outstanding > 0 ? DANGER : SUCCESS},${BRAND})`}
            >
              {/* Summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Owed',     value: `GHS ${fees.totalOwed.toFixed(2)}`,    color: 'var(--text-primary)' },
                  { label: 'Total Paid',     value: `GHS ${fees.totalPaid.toFixed(2)}`,    color: SUCCESS               },
                  { label: 'Outstanding',    value: `GHS ${fees.outstanding.toFixed(2)}`,  color: fees.outstanding > 0 ? DANGER : SUCCESS },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Collection progress */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span>Collection rate</span><span style={{ fontWeight: 700 }}>{fees.collectionRate}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
                  <div style={{ width: `${fees.collectionRate}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${SUCCESS},#34D399)`, transition: 'width 1s ease' }} />
                </div>
              </div>

              {/* Recent transactions */}
              {fees.recentPayments.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Recent</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fees.recentPayments.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.description}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(p.date)}{p.method ? ` · ${p.method}` : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>GHS {p.amount.toFixed(2)}</span>
                          <StatusPill status={p.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
