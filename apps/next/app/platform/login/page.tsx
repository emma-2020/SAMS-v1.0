'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformApi } from '@sams/api';
import { setPlatformToken } from '@sams/api';

const NAVY = '#0D1B3E';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await platformApi.loginPlatform(email.trim(), password);
      setPlatformToken(token);
      router.replace('/platform/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, ${NAVY} 0%, #172B5E 60%, #1E3A7F 100%)`,
      padding: 24,
    }}>
      {/* decorative circles */}
      <div style={{ position: 'fixed', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: NAVY, padding: '32px 36px 28px' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '3px 10px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.62rem', fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>PLATFORM ADMIN</div>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
            SAMS Control Plane
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Platform operator access only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '32px 36px' }}>
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 10, padding: '12px 16px',
              color: '#DC2626', fontSize: '0.85rem',
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #E5E7EB', fontSize: '0.9rem',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = NAVY; }}
              onBlur={e =>  { e.target.style.borderColor = '#E5E7EB'; }}
              placeholder="platform@sams.io"
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #E5E7EB', fontSize: '0.9rem',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = NAVY; }}
              onBlur={e =>  { e.target.style.borderColor = '#E5E7EB'; }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#6B7280' : NAVY,
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: '0.95rem', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em', transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in to Control Plane'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#9CA3AF', marginTop: 20 }}>
            This portal is restricted to authorised SAMS operators.
          </p>
        </form>
      </div>
    </div>
  );
}
