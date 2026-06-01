// src/pages/auth/LoginPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { login as loginApi } from '../../services/auth.api';

// ─── Inline SVG icons (no external icon lib dependency) ──────────
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 9h1v1H9zM14 9h1v1h-1zM9 14h1v1H9zM14 14h1v1h-1z" fill="currentColor" stroke="none"/>
  </svg>
);
const IconEye = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    )}
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────

const ROLE_DASHBOARD = {
  Admin:  '/dashboard/admin',
  Coach:  '/dashboard/coach',
  Player: '/dashboard/player',
  Parent: '/dashboard/parent',
};

// ─────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const loginStore = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ email: '', password: '', academy_id: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  // ── Field handlers ──────────────────────────────────────────────

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  }, [errors, apiError]);

  // ── Client-side validation ──────────────────────────────────────

  function validate() {
    const errs = {};
    if (!form.email.trim())                  errs.email      = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email   = 'Enter a valid email.';
    if (!form.password)                      errs.password   = 'Password is required.';
    if (!form.academy_id.trim())             errs.academy_id = 'Academy ID is required.';
    return errs;
  }

  // ── Submit ──────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');

    try {
      const { session, profile } = await loginApi({
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        academy_id: form.academy_id.trim(),
      });

      loginStore(session, profile);

      // Redirect: back to originally requested URL, or role default dashboard
      const from    = location.state?.from?.pathname;
      const roleDest = ROLE_DASHBOARD[profile.role] || '/dashboard';
      navigate(from || roleDest, { replace: true });

    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, location, loginStore, navigate]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div style={styles.page}>

      {/* Ambient background grid */}
      <div style={styles.grid} aria-hidden="true" />

      {/* Glowing orb accent */}
      <div style={styles.orb} aria-hidden="true" />

      <div style={styles.layout}>

        {/* ── Left panel: brand + tagline ─────────────────────── */}
        <div style={styles.brandPanel} className="animate-fade-in">

          <div style={styles.wordmark}>
            <span style={styles.wordmarkS}>S</span>
            <span style={styles.wordmarkRest}>AMS</span>
          </div>

          <h1 style={styles.tagline}>
            The Command<br />Centre for<br />Elite Academies
          </h1>

          <p style={styles.taglineSub}>
            Unified scheduling, attendance, health monitoring,
            and team communications — all in one tactical platform.
          </p>

          {/* Role indicators */}
          <div style={styles.roleList}>
            {[
              { role: 'Admin',  desc: 'Manage your full academy',    color: 'var(--role-admin)'  },
              { role: 'Coach',  desc: 'Run training & track rosters', color: 'var(--role-coach)'  },
              { role: 'Player', desc: 'View schedule & log wellness', color: 'var(--role-player)' },
              { role: 'Parent', desc: 'Monitor your athlete',         color: 'var(--role-parent)' },
            ].map(({ role, desc, color }) => (
              <div key={role} style={styles.roleRow}>
                <div style={{ ...styles.roleDot, background: color }} />
                <div>
                  <div style={{ ...styles.roleTitle, color }}>{role}</div>
                  <div style={styles.roleDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.versionTag}>SAMS v1.0 · Base Model MVP</div>
        </div>

        {/* ── Right panel: login form ──────────────────────────── */}
        <div style={styles.formPanel}>
          <div style={styles.formCard} className="animate-fade-in">

            <div style={styles.formHeader}>
              <div style={styles.formEyebrow}>SECURE ACCESS</div>
              <h2 style={styles.formTitle}>Sign in to your Academy</h2>
              <p style={styles.formSubtitle}>
                Enter your credentials and Academy ID to continue.
              </p>
            </div>

            {/* API Error Alert */}
            {apiError && (
              <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.75" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={styles.form}>

              {/* Academy ID */}
              <div className="field">
                <label className="field-label" htmlFor="academy_id">
                  Academy ID
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconBuilding /></span>
                  <input
                    id="academy_id"
                    name="academy_id"
                    type="text"
                    value={form.academy_id}
                    onChange={handleChange}
                    placeholder="e.g. riverside-fc or UUID"
                    className={`field-input${errors.academy_id ? ' error' : ''}`}
                    autoComplete="organization"
                    disabled={loading}
                  />
                </div>
                {errors.academy_id && (
                  <span className="field-error">{errors.academy_id}</span>
                )}
              </div>

              {/* Email */}
              <div className="field">
                <label className="field-label" htmlFor="email">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconMail /></span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@academy.com"
                    className={`field-input${errors.email ? ' error' : ''}`}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <span className="field-error">{errors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className="field">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconLock /></span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`field-input${errors.password ? ' error' : ''}`}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    <IconEye off={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <span className="field-error">{errors.password}</span>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`btn btn-primary btn-lg btn-full${loading ? ' btn-loading' : ''}`}
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                {!loading && (
                  <>
                    Access Academy
                    <IconChevronRight />
                  </>
                )}
              </button>

            </form>

            <div style={styles.formFooter}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Contact your Academy Administrator if you need access.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles — scoped inline objects to avoid CSS file bloat for a
// single page, keeping components self-contained.
// ─────────────────────────────────────────────────────────────────

const styles = {
  page: {
    position:       'relative',
    minHeight:      '100vh',
    background:     'var(--bg-base)',
    display:        'flex',
    alignItems:     'stretch',
    overflow:       'hidden',
  },

  grid: {
    position:   'fixed',
    inset:      0,
    opacity:    0.03,
    backgroundImage: `
      linear-gradient(var(--border-default) 1px, transparent 1px),
      linear-gradient(90deg, var(--border-default) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents:  'none',
  },

  orb: {
    position:     'fixed',
    top:          '-20%',
    right:        '-10%',
    width:        '60vw',
    height:       '60vw',
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  layout: {
    display:       'flex',
    width:         '100%',
    minHeight:     '100vh',
    position:      'relative',
    zIndex:        1,
  },

  // ── Brand panel ────────────────────────────────────────────────
  brandPanel: {
    flex:          '0 0 45%',
    display:       'flex',
    flexDirection: 'column',
    justifyContent:'center',
    padding:       'clamp(32px, 5vw, 80px)',
    borderRight:   '1px solid var(--border-subtle)',
    background:    'linear-gradient(160deg, var(--bg-base) 0%, var(--bg-surface) 100%)',
  },

  wordmark: {
    fontFamily:    'var(--font-display)',
    fontWeight:    800,
    fontSize:      '1rem',
    letterSpacing: '0.3em',
    marginBottom:  '48px',
    display:       'flex',
    alignItems:    'baseline',
    gap:           0,
  },

  wordmarkS: {
    color:          'var(--accent)',
    fontSize:       '1.1rem',
  },

  wordmarkRest: {
    color: 'var(--text-secondary)',
  },

  tagline: {
    fontFamily:    'var(--font-display)',
    fontSize:      'clamp(2.2rem, 3.5vw, 3.5rem)',
    fontWeight:    800,
    lineHeight:    1.05,
    color:         'var(--text-primary)',
    marginBottom:  '20px',
    letterSpacing: '-0.01em',
  },

  taglineSub: {
    color:         'var(--text-secondary)',
    fontSize:      '0.95rem',
    lineHeight:    1.7,
    maxWidth:      380,
    marginBottom:  '48px',
  },

  roleList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '16px',
    marginBottom:  '48px',
  },

  roleRow: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        '14px',
  },

  roleDot: {
    width:        '8px',
    height:       '8px',
    borderRadius: '50%',
    marginTop:    '5px',
    flexShrink:   0,
  },

  roleTitle: {
    fontFamily:    'var(--font-display)',
    fontWeight:    700,
    fontSize:      '0.95rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },

  roleDesc: {
    color:     'var(--text-muted)',
    fontSize:  '0.82rem',
    marginTop: '2px',
  },

  versionTag: {
    fontFamily:    'var(--font-mono)',
    fontSize:      '0.7rem',
    color:         'var(--text-muted)',
    letterSpacing: '0.05em',
    borderTop:     '1px solid var(--border-subtle)',
    paddingTop:    '20px',
  },

  // ── Form panel ─────────────────────────────────────────────────
  formPanel: {
    flex:           '1',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        'clamp(24px, 4vw, 64px)',
    background:     'var(--bg-base)',
  },

  formCard: {
    width:     '100%',
    maxWidth:  '440px',
    padding:   '40px',
    background:'var(--bg-surface)',
    border:    '1px solid var(--border-default)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-lg)',
  },

  formHeader: {
    marginBottom: '28px',
  },

  formEyebrow: {
    fontFamily:    'var(--font-display)',
    fontSize:      '0.72rem',
    fontWeight:    700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color:         'var(--accent)',
    marginBottom:  '10px',
  },

  formTitle: {
    fontFamily:   'var(--font-display)',
    fontSize:     '1.75rem',
    fontWeight:   800,
    color:        'var(--text-primary)',
    marginBottom: '8px',
    letterSpacing:'-0.01em',
  },

  formSubtitle: {
    color:    'var(--text-secondary)',
    fontSize: '0.875rem',
  },

  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '18px',
  },

  formFooter: {
    marginTop:  '20px',
    textAlign:  'center',
    paddingTop: '20px',
    borderTop:  '1px solid var(--border-subtle)',
  },
};
