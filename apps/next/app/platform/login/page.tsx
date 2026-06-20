'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformApi, setPlatformToken } from '@sams/api';

export default function PlatformLoginPage() {
  const router = useRouter();

  // Step 1: credentials  |  Step 2: TOTP code
  const [step,     setStep]     = useState<'credentials' | 'totp'>('credentials');
  const [mfaToken, setMfaToken] = useState('');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [totp,     setTotp]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await platformApi.loginPlatform(email.trim(), password);
      if ('mfa_required' in result && result.mfa_required) {
        setMfaToken(result.mfa_token);
        setStep('totp');
      } else {
        setPlatformToken((result as any).token);
        router.replace('/platform/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await platformApi.verifyPlatformMfa(mfaToken, totp.trim());
      setPlatformToken(token);
      router.replace('/platform/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Invalid code. Try again.');
      setTotp('');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = step === 'credentials' ? handleCredentials : handleTotp;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 65% 30%, #1a0533 0%, #08091C 55%, #060B14 100%)',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient orbs */}
      <div style={{
        position: 'fixed', top: '-8%', right: '-6%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 68%)',
        filter: 'blur(48px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.16) 0%, transparent 68%)',
        filter: 'blur(48px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', top: '55%', left: '28%',
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 68%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* Glassmorphic card */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(8,12,28,0.88)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: 24,
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 48px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '36px 40px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(124,58,237,0.28)',
            borderRadius: 6, padding: '3px 10px',
            color: '#A78BFA',
            fontSize: '0.6rem', fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#8B5CF6',
              boxShadow: '0 0 6px #8B5CF6',
              display: 'inline-block',
            }} />
            PLATFORM ADMIN
          </div>
          <h1 style={{
            color: '#F1F5F9', fontSize: '1.65rem',
            fontWeight: 900, margin: 0, letterSpacing: -0.6,
          }}>
            SAMS Control Plane
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', margin: '7px 0 0' }}>
            Platform operator access only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '34px 40px 38px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.28)',
              borderRadius: 10, padding: '12px 16px',
              color: '#F87171', fontSize: '0.85rem',
              marginBottom: 22,
            }}>
              {error}
            </div>
          )}

          {step === 'credentials' ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: '0.68rem', fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)', marginBottom: 8,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: '#F1F5F9', fontSize: '0.9rem',
                    outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.65)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.18)'; e.target.style.background = 'rgba(124,58,237,0.07)'; }}
                  onBlur={e =>  { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  placeholder="platform@sams.io"
                />
              </div>

              <div style={{ marginBottom: 30 }}>
                <label style={{
                  display: 'block', fontSize: '0.68rem', fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)', marginBottom: 8,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: '#F1F5F9', fontSize: '0.9rem',
                    outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.65)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.18)'; e.target.style.background = 'rgba(124,58,237,0.07)'; }}
                  onBlur={e =>  { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            /* ── TOTP step ── */
            <div style={{ marginBottom: 30 }}>
              <div style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.22)',
                borderRadius: 10, padding: '14px 16px', marginBottom: 22,
                fontSize: '0.83rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6,
              }}>
                Open your authenticator app and enter the 6-digit code for <strong style={{ color: '#A78BFA' }}>SAMS Platform</strong>.
              </div>
              <label style={{
                display: 'block', fontSize: '0.68rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.4)', marginBottom: 8,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Authentication Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totp}
                onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#F1F5F9', fontSize: '1.6rem', fontWeight: 700,
                  letterSpacing: '0.4em', textAlign: 'center',
                  outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.65)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.18)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setTotp(''); }}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                  fontSize: '0.75rem', cursor: 'pointer', marginTop: 12, padding: 0,
                }}
              >
                ← Back to login
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading
                ? 'rgba(255,255,255,0.07)'
                : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #BE185D 100%)',
              color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
              border: 'none', borderRadius: 12,
              fontSize: '0.92rem', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em', transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 8px 36px rgba(109,40,217,0.45)',
            }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.01)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 44px rgba(109,40,217,0.6)'; } }}
            onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 36px rgba(109,40,217,0.45)'; } }}
          >
            {loading
              ? 'Authenticating…'
              : step === 'credentials'
              ? 'Sign in to Control Plane'
              : 'Verify Code'}
          </button>

          <p style={{
            textAlign: 'center', fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.2)', marginTop: 22,
            letterSpacing: '0.02em',
          }}>
            This portal is restricted to authorised SAMS operators.
          </p>
        </form>
      </div>
    </div>
  );
}
