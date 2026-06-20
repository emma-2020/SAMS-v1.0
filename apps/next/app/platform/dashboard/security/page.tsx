'use client';

import { useState } from 'react';
import { platformApi } from '@sams/api';

type SetupState = 'idle' | 'scanning' | 'confirming' | 'done'| 'recovery';

export default function PlatformSecurityPage() {
  const [state,    setState]    = useState<SetupState>('idle');
  const [qrCode,   setQrCode]   = useState('');
  const [secret,   setSecret]   = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [copied,        setCopied]        = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied,   setCodesCopied]   = useState(false);

  async function handleSetup() {
    setError('');
    setLoading(true);
    try {
      const { qrCode: qr, secret: s } = await platformApi.setupPlatformMfa();
      setQrCode(qr);
      setSecret(s);
      setState('scanning');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Setup failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { recovery_codes } = await platformApi.enablePlatformMfa(totpCode.trim());
      setRecoveryCodes(recovery_codes);
      setState('recovery');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Invalid code. Try again.');
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#F1F5F9', fontSize: '1.5rem', fontWeight: 700,
    letterSpacing: '0.35em', textAlign: 'center',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 65% 30%, #1a0533 0%, #08091C 55%, #060B14 100%)',
      padding: '48px 24px', display: 'flex', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.28)',
            borderRadius: 6, padding: '3px 10px', color: '#A78BFA',
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em',
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6', boxShadow: '0 0 6px #8B5CF6', display: 'inline-block' }} />
            Security Settings
          </div>
          <h1 style={{ color: '#F1F5F9', fontSize: '1.6rem', fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
            Two-Factor Authentication
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', marginTop: 8 }}>
            Protect the platform admin account with a time-based authenticator app.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(8,12,28,0.88)', backdropFilter: 'blur(32px)',
          borderRadius: 20, border: '1px solid rgba(139,92,246,0.18)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>

          {/* ── IDLE ── */}
          {state === 'idle' && (
            <div style={{ padding: '36px 40px' }}>
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12, padding: '16px 20px', marginBottom: 28,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  MFA is <strong style={{ color: '#F87171' }}>not enabled</strong>. Anyone with your password can access the platform. Enable MFA to require a second verification step at every login.
                </p>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 10, padding: '12px 16px', color: '#F87171', fontSize: '0.85rem', marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSetup}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  background: loading ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #BE185D 100%)',
                  color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
                  border: 'none', borderRadius: 12, fontSize: '0.92rem', fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 36px rgba(109,40,217,0.45)',
                }}
              >
                {loading ? 'Generating…' : 'Set Up Two-Factor Authentication'}
              </button>
            </div>
          )}

          {/* ── SCANNING ── */}
          {state === 'scanning' && (
            <div style={{ padding: '36px 40px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: 0, marginBottom: 24, lineHeight: 1.7 }}>
                <strong style={{ color: '#A78BFA' }}>Step 1:</strong> Open <strong style={{ color: '#F1F5F9' }}>Google Authenticator</strong>, <strong style={{ color: '#F1F5F9' }}>Authy</strong>, or any TOTP app and scan the QR code below.
              </p>

              {/* QR code */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'inline-block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" width={200} height={200} />
                </div>
              </div>

              {/* Manual entry */}
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', textAlign: 'center', marginBottom: 8 }}>
                Can't scan? Enter this key manually:
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center',
                gap: 10, marginBottom: 28,
              }}>
                <code style={{ color: '#A78BFA', fontSize: '0.8rem', letterSpacing: '0.1em', flex: 1, wordBreak: 'break-all' }}>
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  style={{ background: 'none', border: 'none', color: copied ? '#10B981' : 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <button
                onClick={() => setState('confirming')}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #BE185D 100%)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 8px 36px rgba(109,40,217,0.45)',
                }}
              >
                I've scanned the QR code →
              </button>
            </div>
          )}

          {/* ── CONFIRMING ── */}
          {state === 'confirming' && (
            <form onSubmit={handleEnable} style={{ padding: '36px 40px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: 0, marginBottom: 24, lineHeight: 1.7 }}>
                <strong style={{ color: '#A78BFA' }}>Step 2:</strong> Enter the 6-digit code from your authenticator app to confirm and activate MFA.
              </p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 10, padding: '12px 16px', color: '#F87171', fontSize: '0.85rem', marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                style={inputStyle}
              />

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                style={{
                  width: '100%', padding: '14px', marginTop: 20,
                  background: (loading || totpCode.length !== 6) ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #BE185D 100%)',
                  color: (loading || totpCode.length !== 6) ? 'rgba(255,255,255,0.3)' : '#fff',
                  border: 'none', borderRadius: 12, fontSize: '0.92rem', fontWeight: 800,
                  cursor: (loading || totpCode.length !== 6) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Verifying…' : 'Activate MFA'}
              </button>

              <button
                type="button"
                onClick={() => { setState('scanning'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', cursor: 'pointer', marginTop: 12, padding: 0, display: 'block', width: '100%', textAlign: 'center' }}
              >
                ← Back to QR code
              </button>
            </form>
          )}

          {/* ── RECOVERY CODES ── */}
          {state === 'recovery' && (
            <div style={{ padding: '36px 40px' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔑</div>
                <h2 style={{ color: '#F1F5F9', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px' }}>
                  Save Your Recovery Codes
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
                  These codes let you log in if you lose your authenticator app.<br />
                  <strong style={{ color: '#F87171' }}>Each code can only be used once. Store them safely.</strong>
                </p>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px',
              }}>
                {recoveryCodes.map(code => (
                  <code key={code} style={{
                    color: '#A78BFA', fontSize: '0.9rem', fontFamily: 'monospace',
                    letterSpacing: '0.12em', fontWeight: 700,
                  }}>
                    {code}
                  </code>
                ))}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join('\n'));
                  setCodesCopied(true);
                  setTimeout(() => setCodesCopied(false), 2000);
                }}
                style={{
                  width: '100%', padding: '11px', marginBottom: 12,
                  background: codesCopied ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.1)',
                  border: `1px solid ${codesCopied ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.25)'}`,
                  color: codesCopied ? '#10B981' : '#A78BFA',
                  borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {codesCopied ? '✓ Copied to clipboard' : 'Copy all codes'}
              </button>

              <button
                onClick={() => setState('done')}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #BE185D 100%)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 8px 36px rgba(109,40,217,0.45)',
                }}
              >
                I've saved my codes →
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {state === 'done' && (
            <div style={{ padding: '36px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
              <h2 style={{ color: '#10B981', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 12px' }}>
                MFA Enabled
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', lineHeight: 1.7, margin: '0 0 28px' }}>
                Two-factor authentication is now active. Every login will require your authenticator code after your password.
              </p>
              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
                borderRadius: 12, padding: '14px 18px', fontSize: '0.82rem',
                color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, textAlign: 'left',
              }}>
                🔑 <strong style={{ color: '#6EE7B7' }}>Recovery codes saved:</strong> If you ever lose your authenticator app, use one of your 8 recovery codes to log in. Each code works once.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
