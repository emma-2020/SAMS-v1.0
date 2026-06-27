'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { MyWellnessAnalytics, MyAttendanceAnalytics } from '@sams/api';
import {
  StatCard, TrendAreaChart, SectionCard, SkeletonCard, PeriodToggle,
  WellnessGauge, SkillRadarChart, AnimatedBarChart, DonutBreakdown,
  ANALYTICS_CSS, SUCCESS, WARNING, DANGER, BRAND, INFO, ACCENT,
} from '@sams/ui/src/charts/analytics';

const PERIOD_OPTS = [
  { label: '30d', value: '30' },
  { label: '60d', value: '60' },
  { label: '90d', value: '90' },
];

const TABS = [
  { id: 'wellness',    label: 'Wellness'    },
  { id: 'performance', label: 'Performance' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Performance tab ────────────────────────────────────────────────────────────

function PerformanceTab({
  wellness,
  attendance,
  attLoading,
  days,
}: {
  wellness:   MyWellnessAnalytics | null;
  attendance: MyAttendanceAnalytics | null;
  attLoading: boolean;
  days:       string;
}) {
  if (!wellness || wellness.kpis.totalLogs === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 20, border: '1.5px dashed var(--border-default,#CBD5E1)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📈</div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, fontSize: '1.05rem' }}>No performance data yet</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Submit wellness check-ins to start seeing your performance breakdown.
        </div>
      </div>
    );
  }

  // ── Radar data — average each metric over the trend window ──────────────────
  const trend = wellness.trend;
  const avgEnergy   = trend.length ? Math.round(trend.reduce((s, r) => s + r.energy,   0) / trend.length) : 0;
  const avgSleep    = trend.length ? Math.round(trend.reduce((s, r) => s + r.sleep,    0) / trend.length) : 0;
  const avgRecovery = trend.length ? Math.round(trend.reduce((s, r) => s + r.recovery, 0) / trend.length) : 0;
  const consistency = Math.min(100, Math.round((wellness.kpis.totalLogs / Number(days)) * 100));
  const overall     = wellness.kpis.avgScore;

  const radarData = [
    { subject: 'Energy',      value: avgEnergy,   fullMark: 100 },
    { subject: 'Sleep',       value: avgSleep,    fullMark: 100 },
    { subject: 'Recovery',    value: avgRecovery, fullMark: 100 },
    { subject: 'Consistency', value: consistency, fullMark: 100 },
    { subject: 'Overall',     value: overall,     fullMark: 100 },
  ];

  // ── Multi-metric line data ─────────────────────────────────────────────────
  // Downsample to at most 20 points for readability
  const step       = Math.max(1, Math.floor(trend.length / 20));
  const chartData  = trend.filter((_, i) => i % step === 0 || i === trend.length - 1);

  return (
    <>
      {/* ── Performance KPI row ── */}
      <div className="analytics-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Avg Energy"    value={avgEnergy}   color={SUCCESS} subtitle={`Last ${days} days`} />
        <StatCard label="Avg Sleep"     value={avgSleep}    color={INFO}    subtitle={`Last ${days} days`} />
        <StatCard label="Avg Recovery"  value={avgRecovery} color={WARNING} subtitle={`Last ${days} days`} />
        <StatCard label="Consistency"   value={consistency} color={ACCENT}  subtitle="Days logged %" />
      </div>

      {/* ── Radar + Attendance ── */}
      <div className="analytics-2col" style={{ marginBottom: 14 }}>

        {/* Skill radar */}
        <SectionCard
          title="Performance Profile"
          subtitle={`Averaged over last ${days} days`}
          accent={`linear-gradient(90deg,${BRAND},${ACCENT})`}
        >
          <SkillRadarChart data={radarData} color={BRAND} size={240} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' }}>
            {radarData.map(r => (
              <div key={r.subject} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: BRAND, opacity: r.value / 100 + 0.2 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {r.subject} <strong style={{ color: 'var(--text-primary)' }}>{r.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Attendance donut */}
        <SectionCard
          title="Attendance"
          subtitle="Sessions present, late, absent"
          accent={`linear-gradient(90deg,${SUCCESS},${INFO})`}
        >
          {attLoading ? (
            <SkeletonCard height={200} />
          ) : !attendance || attendance.kpis.total === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No attendance records yet
            </div>
          ) : (
            <>
              {/* Rate badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: attendance.kpis.rate >= 70 ? SUCCESS : attendance.kpis.rate >= 50 ? WARNING : DANGER, lineHeight: 1 }}>
                    {attendance.kpis.rate}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {attendance.kpis.present + attendance.kpis.late} / {attendance.kpis.total} sessions
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                  background: attendance.kpis.gfaEligible ? '#ECFDF5' : '#FEF2F2',
                  color:      attendance.kpis.gfaEligible ? '#059669' : '#DC2626',
                  border: `1px solid ${attendance.kpis.gfaEligible ? '#A7F3D0' : '#FECACA'}`,
                }}>
                  {attendance.kpis.gfaEligible === null ? 'No data' : attendance.kpis.gfaEligible ? 'GFA Eligible' : 'Below threshold'}
                </span>
              </div>
              {attendance.breakdown.length > 0 && (
                <DonutBreakdown
                  data={attendance.breakdown}
                  centerLabel={`${attendance.kpis.rate}%`}
                  centerSub="rate"
                  size={140}
                />
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Multi-metric trend chart ── */}
      {chartData.length > 1 && (
        <SectionCard
          title="Energy · Sleep · Recovery Trend"
          subtitle={`Individual metric breakdown over the last ${days} days`}
          accent={`linear-gradient(90deg,${SUCCESS},${INFO},${WARNING})`}
        >
          <TrendAreaChart
            data={chartData}
            dataKeys={[
              { key: 'energy',   color: SUCCESS, label: 'Energy'   },
              { key: 'sleep',    color: INFO,    label: 'Sleep'    },
              { key: 'recovery', color: WARNING, label: 'Recovery' },
            ]}
            xAxisKey="date"
            height={240}
          />
          <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Energy',   color: SUCCESS, desc: 'Inverted fatigue score'      },
              { label: 'Sleep',    color: INFO,    desc: 'Sleep quality rating'         },
              { label: 'Recovery', color: WARNING, desc: 'Inverted muscle soreness'    },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: m.color }} />
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: m.color }}>{m.label}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 4 }}>{m.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Monthly attendance bar ── */}
      {!attLoading && attendance && attendance.monthlyTrend.some(m => m.present + m.absent + m.late > 0) && (
        <SectionCard
          title="Monthly Attendance"
          subtitle="Sessions present vs absent by month"
          accent={`linear-gradient(90deg,${SUCCESS},${DANGER})`}
        >
          <AnimatedBarChart
            data={attendance.monthlyTrend}
            dataKeys={[
              { key: 'present', color: SUCCESS, label: 'Present' },
              { key: 'late',    color: WARNING, label: 'Late'    },
              { key: 'absent',  color: DANGER,  label: 'Absent'  },
            ]}
            xAxisKey="month"
            height={220}
            showLegend
          />
        </SectionCard>
      )}
    </>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export function PlayerAnalyticsScreen() {
  const [tab,        setTab]        = useState<'wellness' | 'performance'>('wellness');
  const [data,       setData]       = useState<MyWellnessAnalytics | null>(null);
  const [attendance, setAttendance] = useState<MyAttendanceAnalytics | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [attLoading, setAttLoading] = useState(true);
  const [error,      setError]      = useState('');
  const [days,       setDays]       = useState('60');

  useEffect(() => {
    setLoading(true);
    analyticsApi.getMyWellnessAnalytics(Number(days))
      .then(setData)
      .catch(() => setError('Failed to load your wellness data.'))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    setAttLoading(true);
    analyticsApi.getMyAttendanceAnalytics()
      .then(setAttendance)
      .catch(() => {})
      .finally(() => setAttLoading(false));
  }, []);

  const latest     = data?.kpis.latestScore ?? 0;
  const gaugeColor = latest >= 70 ? SUCCESS : latest >= 45 ? WARNING : DANGER;
  const gaugeLabel = latest >= 70 ? 'Fully Fit' : latest >= 45 ? 'Moderate' : 'Needs Rest';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{ANALYTICS_CSS}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
            My Progress
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Wellness trends, performance profile and attendance
          </p>
        </div>
        <PeriodToggle options={PERIOD_OPTS} value={days} onChange={setDays} />
      </div>

      {/* ── Tab nav ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 10, padding: 4, border: '1px solid var(--border-subtle,#E2E8F0)', marginBottom: 20, width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            style={{
              padding: '7px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.15s',
              background: tab === t.id ? BRAND : 'transparent',
              color:      tab === t.id ? '#fff'  : 'var(--text-secondary,#475569)',
              boxShadow:  tab === t.id ? `0 2px 10px ${BRAND}40` : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── Wellness Tab ── */}
      {tab === 'wellness' && (
        loading ? (
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

            {/* ── Recent check-ins (compact table) ── */}
            {data.recentLogs.length > 0 && (
              <SectionCard
                title="Recent Check-ins"
                subtitle="Your last 5 wellness submissions"
                accent={`linear-gradient(90deg,${BRAND},${WARNING})`}
              >
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 72px 72px 72px', gap: 12, padding: '0 4px 10px', borderBottom: '1px solid var(--border-subtle,#F1F5F9)', marginBottom: 4 }}>
                  <span />
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</span>
                  {[['Energy', SUCCESS], ['Recovery', WARNING], ['Sleep', INFO]].map(([lbl, col]) => (
                    <span key={lbl} style={{ fontSize: '0.62rem', fontWeight: 700, color: col as string, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{lbl}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.recentLogs.map((log, i) => {
                    const c        = log.score >= 70 ? SUCCESS : log.score >= 45 ? WARNING : DANGER;
                    const label    = log.score >= 70 ? 'Fit' : log.score >= 45 ? 'Mod' : 'Low';
                    const energy   = Math.round(((5 - log.fatigue)      / 4) * 100);
                    const recovery = Math.round(((5 - log.soreness)     / 4) * 100);
                    const sleep    = Math.round(((log.sleep - 1)        / 4) * 100);
                    const isLast   = i === data.recentLogs.length - 1;

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr 72px 72px 72px',
                          gap: 12,
                          padding: '10px 4px',
                          borderBottom: isLast ? 'none' : '1px solid var(--border-subtle,#F1F5F9)',
                          alignItems: 'center',
                        }}
                      >
                        {/* Score bubble */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: `${c}12`, border: `2px solid ${c}40`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: c, lineHeight: 1 }}>{log.score}</span>
                          <span style={{ fontSize: '0.48rem', fontWeight: 700, color: c, opacity: 0.7, lineHeight: 1, marginTop: 1 }}>{label}</span>
                        </div>

                        {/* Date + optional note */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {fmtDate(log.date)}
                          </div>
                          {log.notes && (
                            <div style={{
                              fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic',
                              marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              "{log.notes}"
                            </div>
                          )}
                        </div>

                        {/* Energy chip */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: SUCCESS, marginBottom: 3 }}>{energy}%</div>
                          <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
                            <div style={{ width: `${energy}%`, height: '100%', borderRadius: 99, background: SUCCESS, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>

                        {/* Recovery chip */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: WARNING, marginBottom: 3 }}>{recovery}%</div>
                          <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
                            <div style={{ width: `${recovery}%`, height: '100%', borderRadius: 99, background: WARNING, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>

                        {/* Sleep chip */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: INFO, marginBottom: 3 }}>{sleep}%</div>
                          <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated,#F1F5F9)', overflow: 'hidden' }}>
                            <div style={{ width: `${sleep}%`, height: '100%', borderRadius: 99, background: INFO, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
          </>
        )
      )}

      {/* ── Performance Tab ── */}
      {tab === 'performance' && (
        loading ? (
          <>
            <div className="analytics-kpi-grid">
              {[1,2,3,4].map(i => <SkeletonCard key={i} height={120} />)}
            </div>
            <div className="analytics-2col">
              <SkeletonCard height={320} />
              <SkeletonCard height={320} />
            </div>
            <SkeletonCard height={280} />
          </>
        ) : (
          <PerformanceTab
            wellness={data}
            attendance={attendance}
            attLoading={attLoading}
            days={days}
          />
        )
      )}
    </div>
  );
}
