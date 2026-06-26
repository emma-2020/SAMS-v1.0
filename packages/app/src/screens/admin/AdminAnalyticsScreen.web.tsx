'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { FeeAnalytics } from '@sams/api';
import {
  StatCard, AnimatedBarChart, DonutBreakdown, TrendAreaChart,
  HorizontalPlayerBar, SectionCard, StatusBadge, SkeletonCard, PeriodToggle,
  ANALYTICS_CSS, BRAND, SUCCESS, DANGER, WARNING, INFO,
} from '@sams/ui/src/charts/analytics';

function fmt(n: number) { return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

const METHOD_COLORS: Record<string, string> = {
  MoMo:   '#7C3AED',
  Cash:   '#10B981',
  Bank:   '#2563EB',
  Online: '#0891B2',
  Other:  '#94A3B8',
};

export function AdminAnalyticsScreen() {
  const [data,    setData]    = useState<FeeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    analyticsApi.getFeeAnalytics()
      .then(setData)
      .catch(() => setError('Failed to load analytics. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const donutData = data?.methodBreakdown.map(m => ({
    name:  m.name,
    value: m.value,
    color: METHOD_COLORS[m.name] ?? '#94A3B8',
  })) ?? [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{ANALYTICS_CSS}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
          Fee Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Collection trends, outstanding balances, and payment breakdowns
        </p>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="analytics-kpi-grid">
          {[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}
        </div>
      ) : data && (
        <div className="analytics-kpi-grid">
          <StatCard
            label="Total Collected"
            value={data.kpis.totalCollected}
            format={fmt}
            color={SUCCESS}
            sparkline={data.kpis.sparkline}
            subtitle={`${data.kpis.collectionRate}% collection rate`}
          />
          <StatCard
            label="Total Owed"
            value={data.kpis.totalOwed}
            format={fmt}
            color={BRAND}
            subtitle="All fee records combined"
          />
          <StatCard
            label="Outstanding"
            value={data.kpis.outstanding}
            format={fmt}
            color={data.kpis.outstanding > 0 ? DANGER : SUCCESS}
            subtitle="Unpaid balance due"
          />
          <StatCard
            label="Overdue Records"
            value={data.kpis.overdueCount}
            color={WARNING}
            subtitle="Players with balance > 0"
          />
        </div>
      )}

      {/* ── Collection Flow + Method Breakdown ── */}
      {loading ? (
        <div className="analytics-3col">
          <SkeletonCard height={280} />
          <SkeletonCard height={280} />
        </div>
      ) : data && (
        <div className="analytics-3col">
          <SectionCard
            title="Fee Collection Flow"
            subtitle="Monthly collected vs. outstanding (GHS)"
            accent={`linear-gradient(90deg,${SUCCESS},${BRAND})`}
          >
            <AnimatedBarChart
              data={data.monthlyTrend}
              dataKeys={[
                { key: 'collected',   color: SUCCESS, label: 'Collected'   },
                { key: 'outstanding', color: DANGER,  label: 'Outstanding' },
              ]}
              xAxisKey="month"
              height={220}
              showLegend
            />
          </SectionCard>

          <SectionCard
            title="Payment Method Mix"
            subtitle="Breakdown by payment channel"
            accent={`linear-gradient(90deg,${BRAND},${INFO})`}
          >
            {donutData.length > 0 ? (
              <DonutBreakdown
                data={donutData}
                centerLabel={fmt(data.kpis.totalCollected)}
                centerSub="collected"
                size={150}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No payment data yet
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Outstanding by Player + Recent Payments ── */}
      {loading ? (
        <div className="analytics-2col">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>
      ) : data && (
        <div className="analytics-2col">
          <SectionCard
            title="Outstanding Balances"
            subtitle="Players with highest unpaid balance"
            accent={`linear-gradient(90deg,${DANGER},${WARNING})`}
          >
            {data.topOutstanding.length > 0 ? (
              <HorizontalPlayerBar
                rows={data.topOutstanding.map(p => ({
                  name:  p.name,
                  value: p.balance,
                  max:   data.topOutstanding[0]?.balance ?? 1,
                  color: DANGER,
                  badge: fmt(p.balance),
                }))}
                max={data.topOutstanding[0]?.balance ?? 1}
                unit=""
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No outstanding balances — great work!
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Recent Payments"
            subtitle="Latest fee payment activity"
            accent={`linear-gradient(90deg,${SUCCESS},${INFO})`}
          >
            {data.recentPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No payments recorded yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {data.recentPayments.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0',
                      borderBottom: i < data.recentPayments.length - 1 ? '1px solid var(--border-subtle,#F1F5F9)' : 'none',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${METHOD_COLORS[p.method] ?? '#94A3B8'}15`, border: `1.5px solid ${METHOD_COLORS[p.method] ?? '#94A3B8'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: METHOD_COLORS[p.method] ?? '#64748B' }}>
                        {p.player.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.player}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmtDate(p.date)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: SUCCESS }}>{fmt(p.amount)}</div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Collection Trend over time ── */}
      {!loading && data && data.monthlyTrend.length > 0 && (
        <SectionCard
          title="6-Month Collection Trend"
          subtitle="Monthly collected, owed, and outstanding amounts"
          accent={`linear-gradient(90deg,${BRAND},${SUCCESS})`}
          style={{ marginTop: 0 }}
        >
          <TrendAreaChart
            data={data.monthlyTrend}
            dataKeys={[
              { key: 'collected',   color: SUCCESS, label: 'Collected'   },
              { key: 'owed',        color: BRAND,   label: 'Total Owed'  },
            ]}
            xAxisKey="month"
            height={200}
          />
        </SectionCard>
      )}
    </div>
  );
}
