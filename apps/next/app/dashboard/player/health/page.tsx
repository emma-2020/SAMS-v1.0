'use client';

import { useEffect, useState } from 'react';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';
import { HealthMeter, WellnessSlider } from '@sams/ui';
import { ROLE_COLOR } from '@sams/ui';

export default function PlayerHealthPage() {
  const [history, setHistory] = useState<HealthEntry[]>([]);
  const [form, setForm] = useState({ energy: 3, sleep: 3, muscle_soreness: 3, stress: 3, notes: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    healthApi.getMyHealth().then(setHistory).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try { await healthApi.submitHealth(form); await load(); } catch (_) {}
    setSubmitting(false);
  }

  const latest = history[0];
  const healthPct = latest?.overall_score ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Wellness Check-in</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Current status */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Today's Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
            <HealthMeter score={healthPct} size={96} />
            <div style={{ flex: 1 }}>
              {latest && (
                <>
                  <WellnessSlider label="Energy"    value={latest.energy}          max={5} color={ROLE_COLOR.Player} />
                  <WellnessSlider label="Sleep"     value={latest.sleep}           max={5} color="#6366F1" />
                  <WellnessSlider label="Soreness"  value={latest.muscle_soreness} max={5} color="#F97316" />
                  <WellnessSlider label="Stress"    value={latest.stress}          max={5} color="#EF4444" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Submit form */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Log Today's Wellness</div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'energy', label: 'Energy' },
              { key: 'sleep', label: 'Sleep Quality' },
              { key: 'muscle_soreness', label: 'Muscle Soreness' },
              { key: 'stress', label: 'Stress Level' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', width: 120, flexShrink: 0 }}>{label}</label>
                <input type="range" min={1} max={5} value={(form as Record<string, number>)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) }))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#6366F1', width: 20, textAlign: 'right' }}>{(form as Record<string, number>)[key]}</span>
              </div>
            ))}
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical', minHeight: 60 }} />
            <button type="submit" disabled={submitting} className={`btn btn-primary${submitting ? ' btn-loading' : ''}`}>
              Submit Check-in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
