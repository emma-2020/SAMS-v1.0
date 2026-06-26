'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { FeeAnalytics, TeamComparison } from '@sams/api';
import {
  StatCard, AnimatedBarChart, DonutBreakdown, TrendAreaChart,
  HorizontalPlayerBar, SectionCard, StatusBadge, SkeletonCard, PeriodToggle,
  ExportButton, downloadCsv,
  ANALYTICS_CSS, BRAND, SUCCESS, DANGER, WARNING, INFO, ACCENT,
} from '@sams/ui/src/charts/analytics';
import { PlayerDetailModal } from '../../components/PlayerDetailModal';

type AdminTab = 'fees' | 'teams';
type DateRange = 'all' | 'this-month' | 'last-month' | 'this-quarter';

function fmt(n: number) { return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

function getDateBounds(range: DateRange): { startDate?: string; endDate?: string } {
  if (range === 'all') return {};
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth(); // 0-indexed
  if (range === 'this-month') {
    return { startDate: new Date(y, m, 1).toISOString(), endDate: new Date(y, m + 1, 0, 23, 59, 59).toISOString() };
  }
  if (range === 'last-month') {
    return { startDate: new Date(y, m - 1, 1).toISOString(), endDate: new Date(y, m, 0, 23, 59, 59).toISOString() };
  }
  if (range === 'this-quarter') {
    const qStart = Math.floor(m / 3) * 3;
    return { startDate: new Date(y, qStart, 1).toISOString(), endDate: new Date(y, qStart + 3, 0, 23, 59, 59).toISOString() };
  }
  return {};
}

const METHOD_COLORS: Record<string, string> = {
  MoMo:   '#7C3AED',
  Cash:   '#10B981',
  Bank:   '#2563EB',
  Online: '#0891B2',
  Other:  '#94A3B8',
};

const TEAM_PALETTE = [BRAND, SUCCESS, WARNING, INFO, ACCENT, DANGER, '#8B5CF6', '#EC4899'];

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: 'All Time',     value: 'all'          },
  { label: 'This Month',   value: 'this-month'   },
  { label: 'Last Month',   value: 'last-month'   },
  { label: 'This Quarter', value: 'this-quarter' },
];

export function AdminAnalyticsScreen() {
  const [tab, setTab] = useState<AdminTab>('fees');

  const [data,      setData]      = useState<FeeAnalytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const [teams,        setTeams]        = useState<TeamComparison | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [modalPlayerId, setModalPlayerId] = useState<string | null>(null);

  // Reload fees when date range changes
  useEffect(() => {
    setLoading(true);
    const bounds = getDateBounds(dateRange);
    analyticsApi.getFeeAnalytics(bounds)
      .then(setData)
      .catch(() => setError('Failed to load analytics. Please try again.'))
      .finally(() => setLoading(false));
  }, [dateRange]);

  useEffect(() => {
    if (tab !== 'teams' || teams) return;
    setTeamsLoading(true);
    analyticsApi.getTeamComparison()
      .then(setTeams)
      .catch(() => setError('Failed to load team data.'))
      .finally(() => setTeamsLoading(false));
  }, [tab]);

  const donutData = data?.methodBreakdown.map(m => ({
    name:  m.name,
    value: m.value,
    color: METHOD_COLORS[m.name] ?? '#94A3B8',
  })) ?? [];

  function exportFees() {
    if (!data) return;
    const headers = ['Player', 'Amount Paid (GHS)', 'Method', 'Date', 'Status'];
    const rows = data.recentPayments.map(p => [p.player, p.amount, p.method, fmtDate(p.date), p.status]);
    downloadCsv(headers, rows, 'fee-payments.csv');
  }

  function exportOutstanding() {
    if (!data) return;
    const headers = ['Player', 'Outstanding Balance (GHS)'];
    const rows = data.topOutstanding.map(p => [p.name, p.balance]);
    downloadCsv(headers, rows, 'outstanding-balances.csv');
  }

  function exportTeams() {
    if (!teams) return;
    const headers = ['Team', 'Division', 'Sport', 'Squad Size', 'Attendance %', 'Wellness Score', 'Fee Collection %'];
    const rows = teams.teams.map(t => [t.name, t.division, t.sport, t.squad, t.attRate, t.wellness, t.feeRate]);
    downloadCsv(headers, rows, 'team-comparison.csv');
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{ANALYTICS_CSS}</style>

      <PlayerDetailModal playerId={modalPlayerId} onClose={() => setModalPlayerId(null)} />

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
            {tab === 'fees' ? 'Fee Analytics' : 'Team Comparison'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {tab === 'fees' ? 'Collection trends, outstanding balances, and payment breakdowns' : 'Side-by-side team attendance, wellness, and fee performance'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {tab === 'fees' && !loading && data && (
            <ExportButton onClick={exportFees} label="Export CSV" />
          )}
          {tab === 'teams' && !teamsLoading && teams && teams.teams.length > 0 && (
            <ExportButton onClick={exportTeams} label="Export Teams" />
          )}
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 10, padding: 4, border: '1px solid var(--border-subtle,#E2E8F0)' }}>
            {([['fees','Fees'],['teams','Teams']] as [AdminTab,string][]).map(([t, label]) => (
              <button key={t} onClick={() => { setError(''); setTab(t); }}
                style={{
                  padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
                  background: tab === t ? BRAND : 'transparent',
                  color:      tab === t ? '#fff' : 'var(--text-muted,#64748B)',
                  boxShadow:  tab === t ? `0 2px 8px ${BRAND}40` : 'none',
                }}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ══════════════ TEAMS TAB ══════════════ */}
      {tab === 'teams' && (
        <>
          {teamsLoading ? (
            <>
              <div className="analytics-kpi-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}</div>
              <SkeletonCard height={320} />
            </>
          ) : !teams || teams.teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-elevated,#F8FAFC)', borderRadius: 20, border: '1.5px dashed var(--border-default,#CBD5E1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No teams yet</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Create teams and add players to see comparison data.</div>
            </div>
          ) : (
            <>
              <div className="analytics-kpi-grid">
                <StatCard label="Total Teams"        value={teams.teams.length}                                                                                                          color={BRAND}   subtitle="Active squads" />
                <StatCard label="Avg Attendance"     value={Math.round(teams.teams.reduce((s,t)=>s+t.attRate,0)/teams.teams.length)}   format={(n) => `${n}%`}          color={SUCCESS} subtitle="Academy-wide" />
                <StatCard label="Avg Wellness"       value={Math.round(teams.teams.reduce((s,t)=>s+t.wellness,0)/teams.teams.length)}                                    color={WARNING} subtitle="Last 30 days" />
                <StatCard label="Avg Fee Collection" value={Math.round(teams.teams.reduce((s,t)=>s+t.feeRate,0)/teams.teams.length)}   format={(n) => `${n}%`}          color={INFO}    subtitle="Collection rate" />
              </div>

              <SectionCard title="Attendance Rate by Team" subtitle="Percentage of sessions attended" accent={`linear-gradient(90deg,${SUCCESS},${BRAND})`}>
                <AnimatedBarChart
                  data={teams.teams.map(t => ({ name: t.name, rate: t.attRate }))}
                  dataKeys={[{ key: 'rate', color: SUCCESS, label: 'Attendance %' }]}
                  xAxisKey="name"
                  height={220}
                />
              </SectionCard>

              <div className="analytics-2col">
                <SectionCard title="Avg Wellness Score" subtitle="Last 30 days" accent={`linear-gradient(90deg,${WARNING},${BRAND})`}>
                  <AnimatedBarChart
                    data={teams.teams.map(t => ({ name: t.name, score: t.wellness }))}
                    dataKeys={[{ key: 'score', color: WARNING, label: 'Wellness' }]}
                    xAxisKey="name"
                    height={200}
                  />
                </SectionCard>
                <SectionCard title="Fee Collection Rate" subtitle="Amount paid vs. owed per team" accent={`linear-gradient(90deg,${INFO},${ACCENT})`}>
                  <AnimatedBarChart
                    data={teams.teams.map(t => ({ name: t.name, rate: t.feeRate }))}
                    dataKeys={[{ key: 'rate', color: INFO, label: 'Collection %' }]}
                    xAxisKey="name"
                    height={200}
                  />
                </SectionCard>
              </div>

              <SectionCard title="Team Scorecard" subtitle="All metrics at a glance" accent={`linear-gradient(90deg,${BRAND},${ACCENT})`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {teams.teams.map((t, i) => {
                    const c = TEAM_PALETTE[i % TEAM_PALETTE.length];
                    return (
                      <div key={t.id} style={{ padding: '16px', borderRadius: 14, border: `2px solid ${c}30`, background: `${c}08`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${c},${c}80)` }} />
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12 }}>{t.division !== '—' ? `${t.division} · ` : ''}{t.sport !== '—' ? t.sport : 'Football'} · {t.squad} players</div>
                        {[
                          { label: 'Attendance', value: `${t.attRate}%`,     color: t.attRate  >= 70 ? SUCCESS : DANGER  },
                          { label: 'Wellness',   value: `${t.wellness}/100`, color: t.wellness >= 70 ? SUCCESS : WARNING  },
                          { label: 'Fees',       value: `${t.feeRate}%`,     color: t.feeRate  >= 80 ? SUCCESS : t.feeRate >= 50 ? WARNING : DANGER },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{row.label}</span>
                            <span style={{ fontSize: '0.73rem', fontWeight: 800, color: row.color }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* ══════════════ FEES TAB ══════════════ */}
      {tab === 'fees' && (<>

        {/* Date range filter */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <PeriodToggle
            options={DATE_RANGE_OPTIONS}
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRange)}
          />
        </div>

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

        {loading ? (
          <div className="analytics-2col">
            <SkeletonCard height={260} />
            <SkeletonCard height={260} />
          </div>
        ) : data && (
          <div className="analytics-2col">
            <SectionCard
              title="Outstanding Balances"
              subtitle="Click a player name to view their full profile"
              accent={`linear-gradient(90deg,${DANGER},${WARNING})`}
              action={data.topOutstanding.length > 0 ? <ExportButton onClick={exportOutstanding} label="Export" /> : undefined}
            >
              {data.topOutstanding.length > 0 ? (
                <HorizontalPlayerBar
                  rows={data.topOutstanding.map(p => ({
                    id:    p.id,
                    name:  p.name,
                    value: p.balance,
                    max:   data.topOutstanding[0]?.balance ?? 1,
                    color: DANGER,
                    badge: fmt(p.balance),
                  }))}
                  max={data.topOutstanding[0]?.balance ?? 1}
                  unit=""
                  onRowClick={(id) => setModalPlayerId(id)}
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

        {!loading && data && data.monthlyTrend.length > 0 && (
          <SectionCard
            title="6-Month Collection Trend"
            subtitle="Monthly collected and owed amounts"
            accent={`linear-gradient(90deg,${BRAND},${SUCCESS})`}
            style={{ marginTop: 0 }}
          >
            <TrendAreaChart
              data={data.monthlyTrend}
              dataKeys={[
                { key: 'collected', color: SUCCESS, label: 'Collected'  },
                { key: 'owed',      color: BRAND,   label: 'Total Owed' },
              ]}
              xAxisKey="month"
              height={200}
            />
          </SectionCard>
        )}
      </>)}
    </div>
  );
}
