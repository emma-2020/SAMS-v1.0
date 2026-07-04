'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@sams/api';
import type { InviteDetails } from '@sams/api';
import { useAuthStore } from '@sams/store';

const ROLE_DASHBOARD: Record<string, string> = {
  Admin:  '/dashboard/admin',
  Coach:  '/dashboard/coach',
  Player: '/dashboard/player',
  Parent: '/dashboard/parent',
};

const ROLE_COLORS: Record<string, string> = { Admin: '#7C3AED', Coach: '#2563EB', Player: '#059669', Parent: '#D97706' };

const IconLock    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconEyeOn   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconArrow   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconCheck   = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25"><polyline points="20 6 9 17 4 12"/></svg>;
const IconWarning = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

type Phase = 'loading' | 'invalid' | 'form' | 'success';

export default function RegisterPage() {
  const router     = useRouter();
  const loginStore = useAuthStore((s) => s.login);

  const [token,       setToken]       = useState('');
  const [phase,       setPhase]       = useState<Phase>('loading');
  const [invite,      setInvite]      = useState<InviteDetails | null>(null);
  const [invalidMsg,  setInvalidMsg]  = useState('');

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [errors,      setErrors]      = useState<{ password?: string; confirm?: string }>({});

  // Read ?token= from the URL and validate the invitation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setInvalidMsg('No invitation token found in the URL. Please use the exact link from your invitation email.');
      setPhase('invalid');
      return;
    }
    setToken(t);
    authApi.validateInvite(t)
      .then(({ invite }) => { setInvite(invite); setPhase('form'); })
      .catch((err: unknown) => {
        setInvalidMsg(err instanceof Error ? err.message : 'Invalid or expired invitation.');
        setPhase('invalid');
      });
  }, []);

  function validate(): boolean {
    const e: typeof errors = {};
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const { session, profile } = await authApi.register({ token, password });
      loginStore(session, profile);
      setPhase('success');
      setTimeout(() => {
        const dest = ROLE_DASHBOARD[profile.role] ?? '/dashboard/admin';
        router.replace(dest);
      }, 1800);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, password, confirm]);

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', height: 48,
    padding: '0 14px 0 46px',
    background: '#FFFFFF',
    border: `1.5px solid ${hasError ? '#EF4444' : '#E2E8F0'}`,
    borderRadius: 10,
    color: '#0F172A', fontFamily: 'inherit', fontSize: '0.9rem',
    outline: 'none', appearance: 'none' as const,
    boxShadow: hasError ? '0 0 0 3px rgba(239,68,68,0.1)' : undefined,
  });

  const roleColor = ROLE_COLORS[invite?.role ?? ''] ?? '#6366F1';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
          <img src="/brand/sams-icon.svg" alt="PlaySAMS" width={38} height={38} style={{ borderRadius: 10, boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', letterSpacing: '0.08em' }}>PLAYSAMS</div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 40, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>

          {/* Verifying invitation */}
          {phase === 'loading' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 32, height: 32, margin: '0 auto 16px', border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'sp-spin 0.7s linear infinite' }} />
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Verifying your invitation…</p>
            </div>
          )}

          {/* Invalid / expired invitation */}
          {phase === 'invalid' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', margin: '0 auto 20px' }}>
                <IconWarning />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Invitation Problem</h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.65, margin: '0 0 24px' }}>
                {invalidMsg}
              </p>
              <button
                onClick={() => router.push('/login')}
                style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', margin: '0 auto 20px' }}>
                <IconCheck />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Welcome to {invite?.academy_name ?? 'the academy'}!</h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                Your account has been created. Taking you to your dashboard…
              </p>
            </div>
          )}

          {/* Registration form */}
          {phase === 'form' && invite && (
            <>
              <div style={{ marginBottom: 24 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: `${roleColor}15`, border: `1px solid ${roleColor}30`,
                  borderRadius: 99, padding: '3px 12px', marginBottom: 14,
                  fontSize: '0.72rem', fontWeight: 700, color: roleColor, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor }} />
                  {invite.role} Invitation
                </span>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', margin: '0 0 8px' }}>Set Your Password</h2>
                <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>
                  Joining <strong style={{ color: '#0F172A' }}>{invite.academy_name}</strong> as {invite.first_name} {invite.last_name} ({invite.email}).
                </p>
              </div>

              {apiError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 20, color: '#991B1B', fontSize: '0.875rem' }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}><IconWarning /></span>
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', pointerEvents: 'none' }}><IconLock /></span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); setApiError(''); }}
                      placeholder="Min. 8 characters"
                      style={{ ...inputStyle(!!errors.password), paddingRight: 48 }}
                      disabled={loading}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4 }}>
                      {showPw ? <IconEyeOff /> : <IconEyeOn />}
                    </button>
                  </div>
                  {errors.password && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.password}</span>}
                </div>

                {/* Confirm password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', pointerEvents: 'none' }}><IconLock /></span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }}
                      placeholder="Re-enter your password"
                      style={{ ...inputStyle(!!errors.confirm), paddingRight: 48 }}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4 }}>
                      {showConfirm ? <IconEyeOff /> : <IconEyeOn />}
                    </button>
                  </div>
                  {errors.confirm && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.confirm}</span>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  style={{
                    marginTop: 4, width: '100%', height: 52,
                    borderRadius: 12, border: 'none',
                    background: loading || !password || !confirm
                      ? '#E2E8F0'
                      : 'linear-gradient(135deg,#6366F1,#4F46E5)',
                    color: loading || !password || !confirm ? '#94A3B8' : '#fff',
                    fontSize: '0.96rem', fontWeight: 700, cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background 0.18s',
                  }}
                >
                  {loading
                    ? <span style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'sp-spin 0.65s linear infinite', display: 'inline-block' }} />
                    : <><span>Create Account & Enter Dashboard</span><IconArrow /></>
                  }
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: '#94A3B8' }}>
                Already have an account? <a href="/login" style={{ color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
              </p>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
