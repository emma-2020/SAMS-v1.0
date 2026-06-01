// src/pages/auth/LoginPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { login as loginApi } from '../../services/auth.api';

const IconMail     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>;
const IconLock     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconBuilding = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconEye      = ({ off }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">{off ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>;
const IconArrow    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

const ROLE_DASHBOARD = {
  Admin:  '/dashboard/admin',
  Coach:  '/dashboard/coach',
  Player: '/dashboard/player',
  Parent: '/dashboard/parent',
};

const ROLES = [
  { role: 'Admin',  color: '#7C3AED', desc: 'Manage the full academy'    },
  { role: 'Coach',  color: '#2563EB', desc: 'Run training & track rosters'},
  { role: 'Player', color: '#059669', desc: 'View schedule & log wellness' },
  { role: 'Parent', color: '#D97706', desc: 'Monitor your athlete'         },
];

export default function LoginPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const loginStore = useAuthStore(s => s.login);

  const [form, setForm]           = useState({ email: '', password: '', academy_id: '' });
  const [showPassword, setShowPw] = useState(false);
  const [errors, setErrors]       = useState({});
  const [apiError, setApiError]   = useState('');
  const [loading, setLoading]     = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  }, [errors, apiError]);

  function validate() {
    const e = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required.';
    if (!form.password) e.password = 'Password required.';
    if (!form.academy_id.trim()) e.academy_id = 'Academy ID required.';
    return e;
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      const { session, profile } = await loginApi({
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        academy_id: form.academy_id.trim(),
      });
      loginStore(session, profile);
      const from = location.state?.from?.pathname;
      navigate(from || ROLE_DASHBOARD[profile.role] || '/dashboard', { replace: true });
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, location, loginStore, navigate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F6FA' }}>

      {/* Left: Brand panel (dark navy) */}
      <div style={{
        flex: '0 0 42%', background: '#0D1B3E',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(32px, 5vw, 72px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <span style={{ fontWeight: 900, fontSize: '1rem', color: 'white' }}>S</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', letterSpacing: '0.1em' }}>SAMS</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>Sports Academy</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
          fontWeight: 900, lineHeight: 1.1,
          color: 'white', marginBottom: 20,
          letterSpacing: '-0.02em',
        }}>
          The Command<br />Centre for<br />
          <span style={{ color: '#818CF8' }}>Elite Academies.</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem',
          lineHeight: 1.7, maxWidth: 340, marginBottom: 44,
        }}>
          Unified scheduling, attendance tracking, health monitoring,
          and team communications — all in one platform.
        </p>

        {/* Role list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROLES.map(({ role, color, desc }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${color}25`, border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color, letterSpacing: '0.04em' }}>
                  {role}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 52, paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)',
        }}>
          SAMS v1.0 · Base Model MVP
        </div>
      </div>

      {/* Right: Login form (light) */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 64px)',
        background: '#F4F6FA',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#6366F1', marginBottom: 10,
            }}>
              Welcome back
            </div>
            <h2 style={{
              fontSize: '1.75rem', fontWeight: 800,
              color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 6,
            }}>
              Sign in to your Academy
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Enter your credentials and Academy ID to access your workspace.
            </p>
          </div>

          {apiError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span style={{ fontSize: '0.875rem' }}>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Academy ID */}
            <div className="field">
              <label className="field-label" htmlFor="academy_id">Academy ID</label>
              <div className="input-wrapper">
                <span className="input-icon"><IconBuilding /></span>
                <input id="academy_id" name="academy_id" type="text"
                  value={form.academy_id} onChange={handleChange}
                  placeholder="Your academy UUID"
                  className={`field-input${errors.academy_id ? ' error' : ''}`}
                  disabled={loading} />
              </div>
              {errors.academy_id && <span className="field-error">{errors.academy_id}</span>}
            </div>

            {/* Email */}
            <div className="field">
              <label className="field-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><IconMail /></span>
                <input id="email" name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="you@academy.com"
                  className={`field-input${errors.email ? ' error' : ''}`}
                  disabled={loading} />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon"><IconLock /></span>
                <input id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className={`field-input${errors.password ? ' error' : ''}`}
                  style={{ paddingRight: 48 }}
                  disabled={loading} />
                <button type="button" className="input-action"
                  onClick={() => setShowPw(p => !p)}>
                  <IconEye off={showPassword} />
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button type="submit"
              className={`btn btn-primary btn-xl btn-full${loading ? ' btn-loading' : ''}`}
              disabled={loading} style={{ marginTop: 4 }}>
              {!loading && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Access Academy <IconArrow />
                </span>
              )}
            </button>
          </form>

          <div style={{
            marginTop: 28, textAlign: 'center', paddingTop: 20,
            borderTop: '1px solid #E2E8F0',
            color: '#94A3B8', fontSize: '0.8rem',
          }}>
            Contact your Academy Administrator if you need access.
          </div>
        </div>
      </div>
    </div>
  );
}
