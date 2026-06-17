'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@sams/api';

// ─── Icon components ────────────────────────────────────────────────
const IconLock    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconEyeOn   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconCheck   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IconAlert   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

// ─── Reset Password Page ─────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenError,  setTokenError]  = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [apiError,    setApiError]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);

  // Parse access_token from URL hash (#access_token=xxx&type=recovery)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash   = window.location.hash.slice(1); // strip leading '#'
    const params = new URLSearchParams(hash);
    const token  = params.get('access_token');
    const type   = params.get('type');

    if (!token) {
      setTokenError('No reset token found. Please use the link from your password reset email.');
      return;
    }
    if (type && type !== 'recovery') {
      setTokenError('This link is not a password reset link. Please request a new one.');
      return;
    }
    setAccessToken(token);
  }, []);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!accessToken) return;

    setLoading(true);
    setApiError('');
    try {
      await authApi.resetPassword({ access_token: accessToken, new_password: password });
      setSuccess(true);
      // Redirect to login after 3 s
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Shared input styles ──────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 48px 0 46px',
    background: '#FFFFFF', border: '1.5px solid #E2E8F0',
    borderRadius: 10, color: '#0F172A',
    fontFamily: 'inherit', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
          }}>
            <IconCheck />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Password updated!</h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 24 }}>
            Your password has been reset successfully. Redirecting you to login…
          </p>
          <button
            onClick={() => router.replace('/login')}
            style={{
              padding: '12px 28px', borderRadius: 10, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Token error state ────────────────────────────────────────────────────────
  if (tokenError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 8px 24px rgba(239,68,68,0.35)', fontSize: '2rem',
          }}>
            ✕
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Invalid reset link</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: 24 }}>{tokenError}</p>
          <button
            onClick={() => router.replace('/login')}
            style={{
              padding: '12px 28px', borderRadius: 10, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA', padding: 24 }}>
      <style>{`
        .rp-input::placeholder { color: #94A3B8; }
        .rp-input:hover { border-color: #CBD5E1; }
        .rp-input:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .rp-input:disabled { background: #F8FAFC; opacity: 0.65; cursor: not-allowed; }
        .rp-input.error { border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px 36px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <span style={{ color: 'white', fontSize: '1.5rem' }}>🔑</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Set new password</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
            Choose a strong password for your SAMS account.
          </p>
        </div>

        {/* API error */}
        {apiError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#FEF2F2', border: '1.5px solid #FECACA',
            borderRadius: 10, padding: '12px 14px', marginBottom: 20, color: '#991B1B',
          }}>
            <span style={{ flexShrink: 0, color: '#EF4444' }}><IconAlert /></span>
            <span style={{ fontSize: '0.875rem' }}>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* New password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }} htmlFor="rp-password">
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', pointerEvents: 'none' }}>
                <IconLock />
              </span>
              <input
                id="rp-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                placeholder="Min. 8 characters"
                className={`rp-input${errors.password ? ' error' : ''}`}
                style={inputStyle}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 4 }}
              >
                {showPw ? <IconEyeOff /> : <IconEyeOn />}
              </button>
            </div>
            {errors.password && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.password}</span>}
          </div>

          {/* Confirm password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }} htmlFor="rp-confirm">
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', pointerEvents: 'none' }}>
                <IconLock />
              </span>
              <input
                id="rp-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }}
                placeholder="Repeat your password"
                className={`rp-input${errors.confirm ? ' error' : ''}`}
                style={inputStyle}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 4 }}
              >
                {showConfirm ? <IconEyeOff /> : <IconEyeOn />}
              </button>
            </div>
            {errors.confirm && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.confirm}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, height: 50, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: 'white', fontWeight: 700, fontSize: '0.96rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            {loading ? 'Updating password…' : 'Set New Password'}
          </button>
        </form>

        {/* Back to login */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => router.replace('/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
