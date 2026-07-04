'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@sams/api';
import { useAuthStore } from '@sams/store';

// ─── Role → dashboard path ──────────────────────────────────────────
const ROLE_DASHBOARD: Record<string, string> = {
  Admin:  '/dashboard/admin',
  Coach:  '/dashboard/coach',
  Player: '/dashboard/player',
  Parent: '/dashboard/parent',
};

// ─── Role list for brand panel ──────────────────────────────────────
const ROLES = [
  { role: 'Admin',  color: '#7C3AED', desc: 'Manage the full academy'       },
  { role: 'Coach',  color: '#2563EB', desc: 'Run training & track rosters'   },
  { role: 'Player', color: '#059669', desc: 'View schedule & log wellness'   },
  { role: 'Parent', color: '#D97706', desc: 'Monitor your athlete'            },
];

// ─── Icon components ────────────────────────────────────────────────
const IconMail     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
const IconLock     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconBuilding = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconArrow    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconEyeOn    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ─── Login Page ──────────────────────────────────────────────────────
export default function LoginPage() {
  const router     = useRouter();
  const loginStore = useAuthStore((s) => s.login);

  const [form, setForm]           = useState({ email: '', password: '', academy_id: '' });
  const [showPassword, setShowPw] = useState(false);
  const [inactiveBanner, setInactiveBanner] = useState(false);

  // Pre-fill from URL search params; detect inactivity logout reason
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const aid = p.get('academy_id');
    const em  = p.get('email');
    if (aid || em) {
      setForm(prev => ({
        ...prev,
        ...(aid ? { academy_id: aid } : {}),
        ...(em  ? { email: em }       : {}),
      }));
    }
    if (p.get('reason') === 'inactive') setInactiveBanner(true);
  }, []);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [apiError, setApiError]   = useState('');
  const [loading, setLoading]     = useState(false);

  // Forgot password inline flow
  const [showForgot,    setShowForgot]    = useState(false);
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotError,   setForgotError]   = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required.';
    if (!form.password)        e.password = 'Password required.';
    if (!form.academy_id.trim()) e.academy_id = 'Academy ID required.';
    return e;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      const { session, profile } = await authApi.login({
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        academy_id: form.academy_id.trim(),
      });
      loginStore(session, profile);
      const dest = ROLE_DASHBOARD[profile.role] ?? '/dashboard/admin';
      router.replace(dest);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loginStore, router]);

  return (
    <div className="login-root" style={{ display: 'flex', minHeight: '100vh', background: '#F4F6FA' }}>

      {/* ── Responsive styles ── */}
      <style>{`
        .login-brand-panel {
          flex: 0 0 42%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-input {
          width: 100%;
          height: 48px;
          padding: 0 14px 0 46px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          color: #0F172A;
          font-family: inherit;
          font-size: 0.9rem;
          transition: border-color 120ms ease, box-shadow 120ms ease;
          outline: none;
          appearance: none;
        }
        .login-input::placeholder { color: #94A3B8; }
        .login-input:hover { border-color: #CBD5E1; }
        .login-input:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .login-input:disabled { background: #F8FAFC; opacity: 0.65; cursor: not-allowed; }
        .login-input.error { border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        .login-input-pw { padding-right: 48px; }
        .login-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          display: flex;
          pointer-events: none;
        }
        @media (max-width: 767px) {
          .login-brand-panel {
            flex: none !important;
            width: 100% !important;
            padding: 40px 28px 36px !important;
          }
          .login-brand-headline { font-size: 1.8rem !important; }
          .login-form-panel {
            flex: none !important;
            width: 100% !important;
            padding: 36px 24px 48px !important;
            align-items: flex-start !important;
          }
          .login-root {
            flex-direction: column !important;
          }
          .login-role-list { display: none !important; }
          .login-version-bar { display: none !important; }
        }
      `}</style>

      {/* ── Left: Brand panel (dark navy) ── */}
      <div className="login-brand-panel" style={{
        background: '#0D1B3E',
        padding: 'clamp(32px, 5vw, 72px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <img src="/brand/sams-icon.svg" alt="PlaySAMS" width={40} height={40} style={{ borderRadius: 10, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', letterSpacing: '0.1em' }}>PLAYSAMS</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>Sports Academy Management</div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="login-brand-headline" style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.1, color: 'white', marginBottom: 20, letterSpacing: '-0.02em' }}>
          The Command<br />Centre for<br />
          <span style={{ color: '#818CF8' }}>Elite Academies.</span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 340, marginBottom: 44 }}>
          Unified scheduling, attendance tracking, health monitoring, and team communications — all in one platform.
        </p>

        {/* Role list */}
        <div className="login-role-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROLES.map(({ role, color, desc }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${color}25`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color, letterSpacing: '0.04em' }}>{role}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="login-version-bar" style={{ marginTop: 52, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>
          SAMS v1.0 · Base Model MVP
        </div>
      </div>

      {/* ── Right: Login form panel ── */}
      <div className="login-form-panel" style={{ padding: 'clamp(24px, 4vw, 64px)', background: '#F4F6FA' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6366F1', marginBottom: 10 }}>
              Welcome back
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Sign in to your Academy
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Enter your credentials and Academy ID to access your workspace.
            </p>
          </div>

          {/* Inactivity logout notice */}
          {inactiveBanner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: '0.875rem', color: '#9A3412', fontWeight: 500 }}>
                You were logged out after 30 minutes of inactivity.
              </span>
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span style={{ fontSize: '0.875rem' }}>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Academy ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }} htmlFor="academy_id">Academy ID</label>
              <div style={{ position: 'relative' }}>
                <span className="login-icon"><IconBuilding /></span>
                <input id="academy_id" name="academy_id" type="text"
                  value={form.academy_id} onChange={handleChange}
                  placeholder="Your academy UUID"
                  className={`login-input${errors.academy_id ? ' error' : ''}`}
                  disabled={loading} autoComplete="off" />
              </div>
              {errors.academy_id && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.academy_id}</span>}
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }} htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <span className="login-icon"><IconMail /></span>
                <input id="email" name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="you@academy.com"
                  className={`login-input${errors.email ? ' error' : ''}`}
                  disabled={loading} autoComplete="email" />
              </div>
              {errors.email && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.email}</span>}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }} htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <span className="login-icon"><IconLock /></span>
                <input id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className={`login-input login-input-pw${errors.password ? ' error' : ''}`}
                  disabled={loading} autoComplete="current-password" />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 4 }}
                >
                  {showPassword ? <IconEyeOff /> : <IconEyeOn />}
                </button>
              </div>
              {errors.password && <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500 }}>{errors.password}</span>}

              {/* Forgot password link */}
              <div style={{ textAlign: 'right', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowForgot(f => !f); setForgotSent(false); setForgotError(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontSize: '0.78rem', fontWeight: 600, padding: 0, textDecoration: 'underline' }}
                >
                  {showForgot ? 'Cancel' : 'Forgot password?'}
                </button>
              </div>
            </div>

            {/* ── Inline forgot-password panel ────────────────────────────────── */}
            {showForgot && (
              <div style={{
                background: '#F8F7FF', border: '1.5px solid #C7D2FE',
                borderRadius: 12, padding: '18px 20px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730A3', marginBottom: 2 }}>
                  Reset your password
                </div>

                {forgotSent ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 14px', fontSize: '0.82rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Check your inbox — we've sent a password reset link to <strong>{forgotEmail}</strong>. It expires in 1 hour.</span>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                      Enter the email address on your account and we'll send you a reset link.
                    </p>
                    {forgotError && (
                      <div style={{ fontSize: '0.78rem', color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>
                        {forgotError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                        placeholder="you@academy.com"
                        disabled={forgotLoading}
                        style={{
                          flex: 1, height: 40, padding: '0 12px',
                          border: '1.5px solid #C7D2FE', borderRadius: 8,
                          fontSize: '0.875rem', color: '#0F172A',
                          background: '#FFFFFF', outline: 'none', fontFamily: 'inherit',
                        }}
                        onKeyDown={async e => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) { setForgotError('Please enter a valid email address.'); return; }
                          setForgotLoading(true);
                          try { await authApi.forgotPassword(forgotEmail.trim().toLowerCase()); setForgotSent(true); } catch { setForgotError('Something went wrong. Please try again.'); }
                          setForgotLoading(false);
                        }}
                      />
                      <button
                        type="button"
                        disabled={forgotLoading}
                        onClick={async () => {
                          if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) { setForgotError('Please enter a valid email address.'); return; }
                          setForgotLoading(true);
                          try { await authApi.forgotPassword(forgotEmail.trim().toLowerCase()); setForgotSent(true); } catch { setForgotError('Something went wrong. Please try again.'); }
                          setForgotLoading(false);
                        }}
                        style={{
                          padding: '0 16px', height: 40, borderRadius: 8, border: 'none',
                          background: '#6366F1', color: 'white', fontWeight: 700, fontSize: '0.8rem',
                          cursor: forgotLoading ? 'not-allowed' : 'pointer', opacity: forgotLoading ? 0.7 : 1,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        {forgotLoading ? '…' : 'Send link'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-xl btn-full${loading ? ' btn-loading' : ''}`}
              disabled={loading}
              style={{ marginTop: 6, height: 52, fontSize: '0.96rem', borderRadius: 12 }}
            >
              {!loading && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Access Academy <IconArrow />
                </span>
              )}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: 'center', paddingTop: 20, borderTop: '1px solid #E2E8F0', color: '#94A3B8', fontSize: '0.8rem' }}>
            Contact your Academy Administrator if you need access.
          </div>
        </div>
      </div>
    </div>
  );
}
