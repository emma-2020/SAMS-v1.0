// src/pages/auth/RegisterPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyInviteToken, registerByInvitation } from '../../services/auth.api';
import useAuthStore from '../../store/authStore';

const ROLE_COLORS = { Admin:'#7C3AED', Coach:'#2563EB', Player:'#059669', Parent:'#D97706' };

const IconLock  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconEye   = ({ off }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">{off ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;

const ROLE_DASHBOARD = { Admin:'/dashboard/admin', Coach:'/dashboard/coach', Player:'/dashboard/player', Parent:'/dashboard/parent' };

// ── Password strength meter ────────────────────────────────────────
function strengthOf(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', 'var(--danger)', 'var(--warning)', '#3B82F6', 'var(--success)'];

function StrengthBar({ password }) {
  const s = strengthOf(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= s ? STRENGTH_COLOR[s] : 'var(--border-default)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: '0.72rem', color: STRENGTH_COLOR[s], marginTop: 3, fontWeight: 600 }}>
        {STRENGTH_LABEL[s]}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function RegisterPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const loginStore      = useAuthStore(s => s.login);
  const token           = searchParams.get('token') || '';

  const [phase,    setPhase]    = useState('loading'); // loading | invalid | form | success
  const [invite,   setInvite]   = useState(null);
  const [errMsg,   setErrMsg]   = useState('');

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [pwErr,    setPwErr]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr,  setSubmitErr]  = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) { setPhase('invalid'); setErrMsg('No invitation token found in the URL.'); return; }
    verifyInviteToken(token)
      .then(data => { setInvite(data); setPhase('form'); })
      .catch(err => {
        const msg = err.response?.data?.error || err.message || 'Invalid or expired invitation.';
        setErrMsg(msg);
        setPhase('invalid');
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setPwErr('');
    setSubmitErr('');

    if (password.length < 8) { setPwErr('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setPwErr('Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      const result = await registerByInvitation({ token, password });

      if (result.session && result.profile) {
        loginStore({ session: result.session, profile: result.profile });
        setPhase('success');
        setTimeout(() => navigate(ROLE_DASHBOARD[result.profile.role] || '/dashboard', { replace: true }), 1800);
      } else {
        // Account created but no auto-login — send to login
        setPhase('success');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    } catch (err) {
      setSubmitErr(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const roleColor = ROLE_COLORS[invite?.role] || '#6366F1';

  // ── Shared card shell ──────────────────────────────────────────
  const Shell = ({ children }) => (
    <div style={{
      minHeight: '100vh', background: '#F4F6FA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#FFFFFF', borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header bar */}
        <div style={{ background: '#0D1B3E', padding: '28px 36px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
            }}>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: 'white' }}>S</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'white', letterSpacing: '0.1em' }}>SAMS</span>
          </div>
        </div>
        <div style={{ padding: '32px 36px 36px' }}>{children}</div>
      </div>
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28, borderTopColor: '#6366F1' }} />
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Verifying your invitation…</p>
        </div>
      </Shell>
    );
  }

  // ── Invalid / expired ──────────────────────────────────────────
  if (phase === 'invalid') {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Invitation Problem
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: 24 }}>
            {errMsg}
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block', padding: '10px 24px',
              background: '#6366F1', color: 'white', textDecoration: 'none',
              borderRadius: 10, fontWeight: 700, fontSize: '0.875rem',
            }}
          >
            Go to Login
          </a>
        </div>
      </Shell>
    );
  }

  // ── Success ────────────────────────────────────────────────────
  if (phase === 'success') {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: '#ECFDF5', border: '2px solid #6EE7B7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#059669',
          }}>
            <IconCheck />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Welcome to {invite?.academy_name || 'the academy'}!
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            Your account has been created. Redirecting you now…
          </p>
          <div className="spinner" style={{ margin: '20px auto 0', width: 22, height: 22, borderTopColor: '#6366F1' }} />
        </div>
      </Shell>
    );
  }

  // ── Registration form ──────────────────────────────────────────
  return (
    <Shell>
      {/* Role pill */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${roleColor}15`, border: `1px solid ${roleColor}30`,
          borderRadius: 99, padding: '3px 12px',
          fontSize: '0.72rem', fontWeight: 700, color: roleColor, letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor }} />
          {invite.role} Invitation
        </span>
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 4, letterSpacing: '-0.02em' }}>
        Set up your account
      </h1>
      <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: 24 }}>
        Joining <strong style={{ color: '#0F172A' }}>{invite.academy_name}</strong> as a {invite.role}.
      </p>

      {/* Read-only info */}
      <div style={{
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
        padding: '14px 16px', marginBottom: 22,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <Row label="Name"  value={`${invite.first_name} ${invite.last_name}`} />
        <Row label="Email" value={invite.email} mono />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>
          <div style={inputWrap}>
            <span style={iconStyle}><IconLock /></span>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setPwErr(''); setSubmitErr(''); }}
              placeholder="At least 8 characters"
              style={inputStyle}
              autoFocus
            />
            <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>
              <IconEye off={showPw} />
            </button>
          </div>
          <StrengthBar password={password} />
        </div>

        {/* Confirm */}
        <div>
          <label style={labelStyle}>Confirm Password</label>
          <div style={inputWrap}>
            <span style={iconStyle}><IconLock /></span>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setPwErr(''); setSubmitErr(''); }}
              placeholder="Repeat your password"
              style={inputStyle}
            />
          </div>
        </div>

        {pwErr && <div style={{ color: '#EF4444', fontSize: '0.82rem', marginTop: -8 }}>{pwErr}</div>}
        {submitErr && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
            padding: '10px 14px', color: '#B91C1C', fontSize: '0.85rem',
          }}>
            {submitErr}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 4,
            padding: '13px',
            background: submitting ? '#A5B4FC' : '#6366F1',
            color: 'white', border: 'none', borderRadius: 10,
            fontWeight: 700, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s',
          }}
        >
          {submitting ? (
            <><div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Creating account…</>
          ) : 'Create Account →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: '#94A3B8' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
      </p>
    </Shell>
  );
}

// ── Small helpers ──────────────────────────────────────────────────
function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: '#94A3B8', width: 44, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '0.85rem', color: '#0F172A', fontWeight: 500,
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>{value}</span>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputWrap  = { position: 'relative', display: 'flex', alignItems: 'center' };
const iconStyle  = { position: 'absolute', left: 12, color: '#9CA3AF', display: 'flex', pointerEvents: 'none' };
const inputStyle = { width: '100%', padding: '11px 42px', border: '1.5px solid #D1D5DB', borderRadius: 10, fontSize: '0.9rem', background: '#FAFAFA', color: '#111827', outline: 'none', boxSizing: 'border-box' };
const eyeBtn     = { position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 };
