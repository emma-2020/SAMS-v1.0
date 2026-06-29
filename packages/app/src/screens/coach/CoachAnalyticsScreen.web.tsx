'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { AttendanceAnalytics, WellnessAnalytics, WorkoutAnalytics } from '@sams/api';
import {
  StatCard, AnimatedBarChart, DonutBreakdown, TrendAreaChart,
  HorizontalPlayerBar, SectionCard, StatusBadge, SkeletonCard, PeriodToggle,
  ExportButton, downloadCsv,
  ANALYTICS_CSS, BRAND, SUCCESS, DANGER, WARNING, INFO, ACCENT,
} from '@sams/ui/src/charts/analytics';
import { PlayerDetailModal } from '../../components/PlayerDetailModal';

type Tab = 'attendance' | 'wellness' | 'workouts';

const WELLNESS_DAYS = [
  { label: '30d', value: '30' },
  { label: '60d', value: '60' },
  { label: '90d', value: '90' },
];

export function CoachAnalyticsScreen() {
  const [tab, setTab] = useState<Tab>('attendance');

  const [attendance, setAttendance] = useState<AttendanceAnalytics | null>(null);
  const [attLoading, setAttLoading] = useState(true);

  const [wellness,     setWellness]     = useState<WellnessAnalytics | null>(null);
  const [wellLoading,  setWellLoading]  = useState(false);
  const [wellnessDays, setWellnessDays] = useState('30');

  const [workouts,    setWorkouts]    = useState<WorkoutAnalytics | null>(null);
  const [workLoading, setWorkLoading] = useState(false);

  const [error, setError] = useState('');
  const [modalPlayerId, setModalPlayerId] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi.getAttendanceAnalytics()
      .then(setAttendance)
      .catch(() => setError('Failed to load attendance data.'))
      .finally(() => setAttLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'wellness') return;
    setWellLoading(true);
    analyticsApi.getWellnessAnalytics(Number(wellnessDays))
      .then(setWellness)
      .catch(() => setError('Failed to load wellness data.'))
      .finally(() => setWellLoading(false));
  }, [tab, wellnessDays]);

  useEffect(() => {
    if (tab !== 'workouts' || workouts) return;
    setWorkLoading(true);
    analyticsApi.getWorkoutAnalytics()
      .then(setWorkouts)
      .catch(() => setError('Failed to load workout data.'))
      .finally(() => setWorkLoading(false));
  }, [tab]);

  function exportAttendance() {
    if (!attendance) return;
    const headers = ['Player', 'Present', 'Late', 'Absent', 'Total', 'Rate %', 'GFA Eligible'];
    const rows = attendance.playerRates.map(p => [p.name, p.present, p.late, p.absent, p.total, p.rate, p.gfaEligible === true ? 'Yes' : p.gfaEligible === false ? 'No' : '']);
    downloadCsv(headers, rows, 'attendance-report.csv');
  }

  function exportWellness() {
    if (!wellness) return;
    const headers = ['Player', 'Avg Score', 'Status', 'Alerts'];
    const rows = wellness.playerRanking.map(p => [p.name, p.value, p.value >= 70 ? 'Fully Fit' : p.value >= 45 ? 'Moderate' : 'High Risk', p.alerts]);
    downloadCsv(headers, rows, 'wellness-report.csv');
  }

  function exportWorkouts() {
    if (!workouts) return;
    const headers = ['Player', 'Done', 'Total', 'Completion Rate %'];
    const rows = workouts.playerRanking.map(p => [p.name, p.done, p.total, p.rate]);
    downloadCsv(headers, rows, 'workout-completion-report.csv');
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{ANALYTICS_CSS}</style>

      <PlayerDetailModal playerId={modalPlayerId} onClose={() => setModalPlayerId(null)} />

      {/* ── Cliniva Hero ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', borderRadius: 20, padding: '28px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(124,58,237,0.30)' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 100, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Coach</div>
            <h1 style={{ fontSize: 'clamp(1.4rem,4vw,1.8rem)', fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Analytics</h1>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Player attendance rates, GFA compliance, and squad wellness</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {tab === 'attendance' && !attLoading && attendance && attendance.playerRates.length > 0 && (
              <ExportButton onClick={exportAttendance} />
            )}
            {tab === 'wellness' && !wellLoading && wellness && wellness.playerRanking.length > 0 && (
              <ExportButton onClick={exportWellness} />
            )}
            {tab === 'workouts' && !workLoading && workouts && workouts.playerRanking.length > 0 && (
              <ExportButton onClick={exportWorkouts} />
            )}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.2)' }}>
              {([['attendance','Attendance'],['wellness','Wellness'],['workouts','Workouts']] as [Tab,string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => { setError(''); setTab(t); }}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.15s',
                    background: tab === t ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color:      tab === t ? '#7C3AED' : 'rgba(255,255,255,0.75)',
                    boxShadow:  tab === t ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ══════════════ ATTENDANCE TAB ══════════════ */}
      {tab === 'attendance' && (
        <>
          {attLoading ? (
            <div className="analytics-kpi-grid">
              {[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}
            </div>
          ) : attendance && (
            <div className="analytics-kpi-grid">
              <StatCard
                label="Sessions Logged"
                value={attendance.kpis.totalSessions}
                color={BRAND}
                subtitle="Past sessions on record"
              />
              <StatCard
                label="Avg Attendance Rate"
                value={attendance.kpis.avgRate}
                format={n => `${n}%`}
                color={attendance.kpis.avgRate >= 70 ? SUCCESS : DANGER}
                subtitle="Across all players"
              />
              <StatCard
                label="GFA Eligible"
                value={attendance.kpis.gfaEligible}
                color={SUCCESS}
                subtitle="≥70% attendance rate"
              />
              <StatCard
                label="Below Threshold"
                value={attendance.kpis.belowThreshold}
                color={DANGER}
                subtitle="<70% — ineligible for matches"
              />
            </div>
          )}

          {attLoading ? (
            <div className="analytics-3col">
              <SkeletonCard height={280} />
              <SkeletonCard height={280} />
            </div>
          ) : attendance && (
            <div className="analytics-3col">
              <SectionCard
                title="Monthly Attendance Trend"
                subtitle="Present / late / absent breakdown per month"
                accent={`linear-gradient(90deg,${SUCCESS},${BRAND})`}
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

              <SectionCard
                title="Squad Availability"
                subtitle="Attendance consistency groupings"
                accent={`linear-gradient(90deg,${BRAND},${INFO})`}
              >
                {attendance.squadAvailability.length > 0 ? (
                  <DonutBreakdown
                    data={attendance.squadAvailability}
                    centerLabel={String(attendance.kpis.avgRate)}
                    centerSub="avg %"
                    size={150}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No attendance data yet
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {!attLoading && attendance && attendance.playerRates.length > 0 && (
            <SectionCard
              title="Player Attendance Ranking"
              subtitle="Click a player to view their full profile · GFA 70% threshold required"
              accent={`linear-gradient(90deg,${BRAND},${WARNING})`}
            >
              <HorizontalPlayerBar
                rows={attendance.playerRates.map(p => ({
                  id:    p.id,
                  name:  p.name,
                  value: p.rate,
                  color: p.rate >= 80 ? SUCCESS : p.rate >= 60 ? WARNING : DANGER,
                  badge: p.gfaEligible === true ? 'Eligible' : p.gfaEligible === false ? 'At Risk' : undefined,
                }))}
                max={100}
                unit="%"
                onRowClick={(id) => setModalPlayerId(id)}
              />
            </SectionCard>
          )}
        </>
      )}

      {/* ══════════════ WELLNESS TAB ══════════════ */}
      {tab === 'wellness' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <PeriodToggle
              options={WELLNESS_DAYS}
              value={wellnessDays}
              onChange={setWellnessDays}
            />
          </div>

          {wellLoading ? (
            <div className="analytics-kpi-grid">
              {[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}
            </div>
          ) : wellness && (
            <div className="analytics-kpi-grid">
              <StatCard
                label="Squad Avg Wellness"
                value={wellness.kpis.squadAvg}
                format={n => `${n}`}
                color={wellness.kpis.squadAvg >= 70 ? SUCCESS : wellness.kpis.squadAvg >= 45 ? WARNING : DANGER}
                subtitle="/ 100 overall score"
              />
              <StatCard label="Fully Fit"  value={wellness.kpis.fullyFit}  color={SUCCESS} subtitle="Score ≥ 70" />
              <StatCard label="Moderate"   value={wellness.kpis.moderate}   color={WARNING} subtitle="Score 45–69" />
              <StatCard label="High Risk"  value={wellness.kpis.highRisk}   color={DANGER}  subtitle="Score < 45" />
            </div>
          )}

          {wellLoading ? (
            <div className="analytics-3col">
              <SkeletonCard height={280} />
              <SkeletonCard height={280} />
            </div>
          ) : wellness && (
            <div className="analytics-3col">
              <SectionCard
                title="Team Wellness Trend"
                subtitle={`Daily average wellness score — last ${wellnessDays} days`}
                accent={`linear-gradient(90deg,${SUCCESS},${WARNING})`}
              >
                {wellness.wellnessTrend.length > 0 ? (
                  <TrendAreaChart
                    data={wellness.wellnessTrend}
                    dataKeys={[{ key: 'avg', color: SUCCESS, label: 'Avg Wellness' }]}
                    xAxisKey="date"
                    height={220}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No wellness data in this period
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Squad Availability"
                subtitle="Players by wellness status"
                accent={`linear-gradient(90deg,${BRAND},${SUCCESS})`}
              >
                {wellness.squadAvailability.length > 0 ? (
                  <DonutBreakdown
                    data={wellness.squadAvailability}
                    centerLabel={String(wellness.kpis.squadAvg)}
                    centerSub="avg score"
                    size={150}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No wellness submissions yet
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {!wellLoading && wellness && wellness.playerRanking.length > 0 && (
            <SectionCard
              title="Player Wellness Ranking"
              subtitle="Click a player to view their full profile · green ≥70, amber 45–69, red <45"
              accent={`linear-gradient(90deg,${SUCCESS},${DANGER})`}
            >
              <HorizontalPlayerBar
                rows={wellness.playerRanking.map(p => ({
                  id:    p.id,
                  name:  p.name,
                  value: p.value,
                  color: p.color,
                  badge: p.alerts > 0 ? `${p.alerts} alert${p.alerts > 1 ? 's' : ''}` : undefined,
                }))}
                max={100}
                unit=""
                onRowClick={(id) => setModalPlayerId(id)}
              />
            </SectionCard>
          )}
        </>
      )}

      {/* ══════════════ WORKOUTS TAB ══════════════ */}
      {tab === 'workouts' && (
        <>
          {workLoading ? (
            <>
              <div className="analytics-kpi-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}</div>
              <div className="analytics-2col"><SkeletonCard height={280} /><SkeletonCard height={280} /></div>
            </>
          ) : !workouts ? null : (
            <>
              <div className="analytics-kpi-grid">
                <StatCard label="Workouts Assigned" value={workouts.kpis.totalAssigned}  color={BRAND}    subtitle="All time" />
                <StatCard label="Exercises Total"   value={workouts.kpis.totalExercises} color={ACCENT}   subtitle="Across all workouts" />
                <StatCard label="Exercises Done"    value={workouts.kpis.totalDone}      color={SUCCESS}  subtitle="Completed by players" />
                <StatCard label="Overall Rate"      value={workouts.kpis.overallRate}    format={(n) => `${n}%`} color={workouts.kpis.overallRate >= 70 ? SUCCESS : WARNING} subtitle="Completion rate" />
              </div>

              <div className="analytics-2col">
                <SectionCard title="Assignment Volume" subtitle="Workouts created per month" accent={`linear-gradient(90deg,${BRAND},${ACCENT})`}>
                  {workouts.volumeTrend.some(m => m.assigned > 0) ? (
                    <AnimatedBarChart
                      data={workouts.volumeTrend}
                      dataKeys={[
                        { key: 'assigned',      color: BRAND,   label: 'Workouts'  },
                        { key: 'exerciseCount', color: ACCENT,  label: 'Exercises' },
                      ]}
                      xAxisKey="month"
                      height={200}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No workouts assigned yet</div>
                  )}
                </SectionCard>

                <SectionCard title="Recent Assignments" subtitle="Latest 10 workout assignments" accent={`linear-gradient(90deg,${ACCENT},${INFO})`}>
                  {workouts.recentAssignments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {workouts.recentAssignments.map((a, i) => {
                        const rColor = a.rate >= 80 ? SUCCESS : a.rate >= 50 ? WARNING : DANGER;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)' }}>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.title}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.team} · {a.exercises} exercise{a.exercises !== 1 ? 's' : ''}{a.dueDate ? ` · Due ${a.dueDate}` : ''}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 48, height: 6, borderRadius: 99, background: 'var(--bg-card,#E2E8F0)', overflow: 'hidden' }}>
                                <div style={{ width: `${a.rate}%`, height: '100%', background: rColor, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: rColor, minWidth: 34 }}>{a.rate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No assignments yet</div>
                  )}
                </SectionCard>
              </div>

              {workouts.playerRanking.length > 0 && (
                <SectionCard
                  title="Player Completion Ranking"
                  subtitle="Click a player to view their full profile · exercise completion rate"
                  accent={`linear-gradient(90deg,${SUCCESS},${WARNING})`}
                >
                  <HorizontalPlayerBar
                    rows={workouts.playerRanking.map(p => ({
                      id:    p.id,
                      name:  p.name,
                      value: p.rate,
                      color: p.rate >= 80 ? SUCCESS : p.rate >= 50 ? WARNING : DANGER,
                      badge: `${p.done}/${p.total}`,
                    }))}
                    max={100}
                    unit="%"
                    onRowClick={(id) => setModalPlayerId(id)}
                  />
                </SectionCard>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
