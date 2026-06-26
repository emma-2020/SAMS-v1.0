'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { MyWellnessAnalytics } from '@sams/api';
import {
  StatCard, TrendAreaChart, SectionCard, SkeletonCard, PeriodToggle,
  WellnessGauge, ANALYTICS_CSS, SUCCESS, WARNING, DANGER, BRAND, INFO,
} from '@sams/ui/src/charts/analytics';

const PERIOD_OPTS = [
  { label: '30d', value: '30' },
  { label: '60d', value: '60' },
  { label: '90d', value: '90' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// fatigue/soreness: 1=good, 5=bad (invert). sleep: 1=poor, 5=excellent (direct).
function metricBar(label: string, raw: number, color: string, invert = true) {
  const pct = invert
    ? Math.round(((5 - raw) / 4) * 100)
    : Math.round(((raw - 1) / 4) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary,#475569)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
    </div>
  );
}

export function PlayerAnalyticsScreen() {
  const [data,    setData]    = useState<MyWellnessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [days,    setDays]    = useState('60');

  useEffect(() => {
    setLoading(true);
    analyticsApi.getMyWellnessAnalytics(Number(days))
      .then(setData)
      .catch(() => setError('Failed to load your wellness data.'))
      .finally(() => setLoading(false));
  }, [days]);

  const latest = data?.kpis.latestScore ?? 0;
  const gaugeColor = latest >= 70 ? SUCCESS : latest >= 45 ? WARNING : DANGER;
  const gaugeLabel = latest >= 70 ? 'Fully Fit' : latest >= 45 ? 'Moderate' : 'Needs Rest';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{ANALYTICS_CSS}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
            My Progress
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Personal wellness trend and check-in history
          </p>
        </div>
        <PeriodToggle options={PERIOD_OPTS} value={days} onChange={setDays} />
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <>
          <div className="analytics-kpi-grid">
            {[1,2,3].map(i => <SkeletonCard key={i} height={130} />)}
          </div>
          <SkeletonCard height={300} />
        </>
      ) : error ? null : !data || data.kpis.totalLogs === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 20, border: '1.5px dashed var(--border-default,#CBD5E1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, fontSize: '1.05rem' }}>No wellness data yet</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Submit your daily wellness check-in to start tracking your progress.
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI row ── */}
          <div className="analytics-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <StatCard
              label="Latest Score"
              value={data.kpis.latestScore}
              color={gaugeColor}
              subtitle={gaugeLabel}
            />
            <StatCard
              label={`Avg Score (${days}d)`}
              value={data.kpis.avgScore}
              color={data.kpis.avgScore >= 70 ? SUCCESS : data.kpis.avgScore >= 45 ? WARNING : DANGER}
              subtitle="Overall average"
              sparkline={data.kpis.sparkline}
            />
            <StatCard
              label="Check-ins Logged"
              value={data.kpis.totalLogs}
              color={BRAND}
              subtitle={`In the last ${days} days`}
            />
          </div>

          {/* ── Gauge + Trend ── */}
          <div className="analytics-3col">
            {/* Gauge card */}
            <SectionCard
              title="Current Wellness Status"
              subtitle="Your most recent check-in score"
              accent={`linear-gradient(90deg,${gaugeColor},${gaugeColor}80)`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            >
              <WellnessGauge
                value={latest}
                size={200}
                label={gaugeLabel}
                sublabel="/ 100"
              />
              <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: 'Fit',      color: SUCCESS, range: '70–100' },
                  { label: 'Moderate', color: WARNING, range: '45–69'  },
                  { label: 'Rest',     color: DANGER,  range: '0–44'   },
                ].map(z => (
                  <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {z.label} <span style={{ color: 'var(--text-secondary)' }}>{z.range}</span>
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Trend chart */}
            <SectionCard
              title="Wellness Trend"
              subtitle={`Your score over the last ${days} days`}
              accent={`linear-gradient(90deg,${BRAND},${SUCCESS})`}
            >
              {data.trend.length > 1 ? (
                <TrendAreaChart
                  data={data.trend}
                  dataKeys={[{ key: 'score', color: gaugeColor, label: 'Wellness Score' }]}
                  xAxisKey="date"
                  height={220}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Log more check-ins to see your trend
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Recent check-ins ── */}
          {data.recentLogs.length > 0 && (
            <SectionCard
              title="Recent Check-ins"
              subtitle="Your last 5 wellness submissions"
              accent={`linear-gradient(90deg,${BRAND},${WARNING})`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.recentLogs.map((log, i) => {
                  const c = log.score >= 70 ? SUCCESS : log.score >= 45 ? WARNING : DANGER;
                  return (
                    <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{fmtDate(log.date)}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: c }}>{log.score}<span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>/100</span></span>
                      </div>
                      {metricBar('Energy',   log.fatigue,  SUCCESS, true)}
                      {metricBar('Recovery', log.soreness, WARNING, true)}
                      {metricBar('Sleep',    log.sleep,    INFO,    false)}
                      {log.notes && (
                        <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle,#F1F5F9)', paddingTop: 8 }}>
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
