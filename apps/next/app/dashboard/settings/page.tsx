'use client';

import { useState } from 'react';
import { useAuthStore } from '@sams/store';
import { useTheme } from '@/lib/theme/provider';
import { authApi } from '@sams/api';

type Density = 'comfortable' | 'compact' | 'spacious';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme, density, setDensity } = useTheme();
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', email: user?.email ?? '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Settings</h1>

      {/* Profile */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)' }}>Profile</h2>
        {msg && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { key: 'first_name', label: 'First Name' },
            { key: 'last_name', label: 'Last Name' },
            { key: 'email', label: 'Email', type: 'email' },
          ].map(({ key, label, type }) => (
            <div key={key} className="field" style={{ gridColumn: key === 'email' ? '1 / -1' : undefined }}>
              <label className="field-label">{label}</label>
              <div className="input-wrapper">
                <input className="field-input" style={{ paddingLeft: 14 }} type={type ?? 'text'}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 99, background: 'var(--bg-elevated)' }}>
            Role: {user?.role}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 99, background: 'var(--bg-elevated)' }}>
            Academy ID: {user?.academy_id?.slice(0, 8)}…
          </span>
        </div>
      </div>

      {/* Appearance */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-primary)' }}>Appearance</h2>

        {/* Theme */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Theme</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} onClick={() => theme !== t && toggleTheme()}
                style={{ padding: '10px 20px', borderRadius: 12, border: `2px solid ${theme === t ? '#6366F1' : 'var(--border-default)'}`, background: theme === t ? '#6366F110' : 'transparent', color: theme === t ? '#6366F1' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Interface Density</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['comfortable', 'compact', 'spacious'] as Density[]).map((d) => (
              <button key={d} onClick={() => setDensity(d)}
                style={{ padding: '10px 16px', borderRadius: 12, border: `2px solid ${density === d ? '#6366F1' : 'var(--border-default)'}`, background: density === d ? '#6366F110' : 'transparent', color: density === d ? '#6366F1' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
