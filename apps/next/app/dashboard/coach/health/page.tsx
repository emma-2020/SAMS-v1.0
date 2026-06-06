'use client';

import { useEffect, useState } from 'react';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';
import { ScoreChip } from '@sams/ui';

export default function HealthPage() {
  const [logs, setLogs] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    healthApi.getHealthLogs().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Health Check-ins</h1>
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading health logs…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Player', 'Date', 'Energy', 'Sleep', 'Soreness', 'Stress', 'Score'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{log.player_id.slice(0, 8)}…</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.submitted_at).toLocaleDateString()}</td>
                  {[log.energy, log.sleep, log.muscle_soreness, log.stress].map((v, i) => (
                    <td key={i} style={{ padding: '12px 16px' }}><ScoreChip score={v} /></td>
                  ))}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: log.overall_score >= 75 ? '#10B981' : log.overall_score >= 50 ? '#FBBF24' : '#EF4444' }}>
                      {log.overall_score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
