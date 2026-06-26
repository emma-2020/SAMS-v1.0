'use client';

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@sams/api';
import type { PlayerDetail } from '@sams/api';
import {
  TrendAreaChart, SkeletonCard,
  SUCCESS, WARNING, DANGER, BRAND, INFO,
} from '@sams/ui/src/charts/analytics';

interface Props {
  playerId: string | null;
  onClose:  () => void;
}

function wColor(score: number) {
  return score >= 70 ? SUCCESS : score >= 45 ? WARNING : DANGER;
}

export function PlayerDetailModal({ playerId, onClose }: Props) {
  const [data,    setData]    = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!playerId) { setData(null); return; }
    setLoading(true); setError('');
    analyticsApi.getPlayerDetail(playerId)
      .then(setData)
      .catch(() => setError('Could not load player details.'))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (!playerId) return null;

  const att   = data?.attendance;
  const well  = data?.wellness;
  const wrk   = data?.workouts;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface,#fff)',
          borderRadius: 20, width: '100%', maxWidth: 560,
          boxShadow: '0 24px 80px rgba(15,23,42,0.22)',
          maxHeight: '90vh', overflowY: 'auto',
          animation: 'card-in 0.2s ease both',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${BRAND},${INFO})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem', flexShrink: 0 }}>
              {data?.name?.charAt(0) ?? '?'}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{data?.name ?? 'Loading…'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Player detail</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-elevated,#F1F5F9)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.1rem', flexShrink: 0 }}
          >✕</button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SkeletonCard height={72} />
              <SkeletonCard height={72} />
              <SkeletonCard height={160} />
            </div>
          ) : error ? (
            <div style={{ padding: '14px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.875rem' }}>
              {error}
            </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Attendance */}
              {att ? (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Attendance</div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: att.rate >= 70 ? SUCCESS : DANGER, lineHeight: 1 }}>{att.rate}%</div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{att.present} of {att.total} sessions attended</div>
                      <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, background: att.gfaEligible ? '#DCFCE7' : '#FEE2E2', color: att.gfaEligible ? '#16A34A' : '#DC2626' }}>
                        {att.gfaEligible === true ? 'GFA Eligible ✓' : att.gfaEligible === false ? 'At Risk ✗' : 'No data'}
                      </span>
                    </div>
                    <div style={{ flex: 1, height: 8, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden', alignSelf: 'center' }}>
                      <div style={{ width: `${att.rate}%`, height: '100%', borderRadius: 99, background: att.rate >= 70 ? SUCCESS : DANGER, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No attendance data</div>
              )}

              {/* Workouts */}
              {wrk && (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Workouts</div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: wrk.rate >= 70 ? SUCCESS : wrk.rate >= 45 ? WARNING : DANGER, lineHeight: 1 }}>{wrk.rate}%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{wrk.done} of {wrk.total} exercises completed</div>
                    <div style={{ flex: 1, height: 8, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden', alignSelf: 'center' }}>
                      <div style={{ width: `${wrk.rate}%`, height: '100%', borderRadius: 99, background: wrk.rate >= 70 ? SUCCESS : wrk.rate >= 45 ? WARNING : DANGER, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Wellness trend */}
              {well ? (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle,#F1F5F9)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Wellness (60 days)</div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {[['Avg', well.avgScore], ['Latest', well.latestScore]].map(([l, v]) => (
                        <div key={l as string} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: wColor(v as number), lineHeight: 1 }}>{v}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>{l}</div>
                        </div>
                      ))}
                      {well.flagCount > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: DANGER, lineHeight: 1 }}>{well.flagCount}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>Flags</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {well.trend.length > 2 ? (
                    <TrendAreaChart
                      data={well.trend}
                      dataKeys={[{ key: 'score', color: wColor(well.avgScore), label: 'Wellness' }]}
                      xAxisKey="date"
                      height={140}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Not enough data for trend</div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--bg-elevated,#F8FAFC)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No wellness logs yet</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
