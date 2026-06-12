'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { platformApi } from '@sams/api';

const SPORTS = [
  'Football', 'Basketball', 'Soccer', 'Baseball', 'Swimming',
  'Tennis', 'Track & Field', 'Rugby', 'Cricket', 'Volleyball',
  'Gymnastics', 'Wrestling', 'Ice Hockey', 'Other',
];

// ── Icon components ──────────────────────────────────────────────────
const IcoBuilding = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IcoUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
);
const IcoGlobe = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
    <path d="M2 12h20"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoArrowLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IcoArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

// ── Shared style constants ───────────────────────────────────────────
const FIELD: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7 };

const LABEL: React.CSSProperties = {
  fontSize: '0.68rem', fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.38)',
};

const ICON_SLOT: React.CSSProperties = {
  position: 'absolute', left: 14,
  color: 'rgba(255,255,255,0.3)',
  pointerEvents: 'none',
  display: 'flex', alignItems: 'center',
};

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px 13px 42px',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 12,
  color: '#F1F5F9',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.18s, box-shadow 0.18s',
};

const ERR: React.CSSProperties = { fontSize: '0.72rem', color: '#F87171', marginTop: 1 };

// ── Page ────────────────────────────────────────────────────────────
export default function EnrollPage() {
  const [form, setForm] = useState({
    academy_name:      '',
    contact_name:      '',
    contact_email:     '',
    sport:             '',
    estimated_players: '',
  });
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused,   setFocused]   = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.academy_name.trim())  e.academy_name  = 'Academy name is required.';
    if (!form.contact_name.trim())  e.contact_name  = 'Contact name is required.';
    if (!form.contact_email.trim() || !/\S+@\S+\.\S+/.test(form.contact_email))
      e.contact_email = 'Valid business email required.';
    if (!form.sport) e.sport = 'Please select a sport type.';
    return e;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      await platformApi.submitEnrollment({
        academy_name:      form.academy_name.trim(),
        contact_name:      form.contact_name.trim(),
        contact_email:     form.contact_email.trim().toLowerCase(),
        sport:             form.sport || undefined,
        estimated_players: form.estimated_players ? parseInt(form.estimated_players, 10) : undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function fieldStyle(name: string): React.CSSProperties {
    const hasError  = !!errors[name];
    const isFocused = focused === name;
    return {
      ...INPUT_BASE,
      border: `1px solid ${hasError ? '#F87171' : isFocused ? '#7C3AED' : 'rgba(255,255,255,0.09)'}`,
      boxShadow: isFocused && !hasError ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
    };
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B14', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Floating header ── */}
      <header style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 100,
        height: 64,
        background: 'rgba(6,11,20,0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 4vw, 40px)',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(124,58,237,0.45)',
          }}>
            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#fff' }}>S</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#F1F5F9', letterSpacing: '0.09em' }}>SAMS</div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em', marginTop: 1 }}>
              Sports Academy Management
            </div>
          </div>
        </Link>

        {/* Back link */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.78rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.42)',
          textDecoration: 'none',
          padding: '7px 15px', borderRadius: 99,
          border: '1px solid rgba(255,255,255,0.09)',
          background: 'rgba(255,255,255,0.04)',
          letterSpacing: '0.01em',
          transition: 'color 0.15s',
        }}>
          <IcoArrowLeft /> Back to home
        </Link>
      </header>

      {/* ── Body ── */}
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '100px clamp(16px, 4vw, 40px) 64px',
      }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 28,
            padding: submitted ? '56px 44px 52px' : '44px 44px 40px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.07)',
            transition: 'padding 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}>

            {/* ── Success screen ── */}
            {submitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
                <div style={{
                  width: 76, height: 76, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.09)',
                  border: '1px solid rgba(16,185,129,0.24)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#34D399',
                  boxShadow: '0 0 40px rgba(16,185,129,0.12)',
                  marginBottom: 4,
                }}>
                  <IcoCheck />
                </div>

                <div>
                  <h2 style={{
                    fontSize: '1.55rem', fontWeight: 900,
                    color: '#F1F5F9', margin: '0 0 14px',
                    letterSpacing: '-0.025em',
                  }}>
                    Application Received
                  </h2>
                  <p style={{
                    fontSize: '0.9rem', lineHeight: 1.75,
                    color: 'rgba(255,255,255,0.48)',
                    margin: 0, maxWidth: 370,
                  }}>
                    Thank you! Your academy request has been logged. Our platform team will review your application and email your owner activation link shortly.
                  </p>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  marginTop: 8,
                  padding: '9px 20px', borderRadius: 99,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  fontSize: '0.7rem', fontWeight: 800,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#A78BFA',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', display: 'inline-block', boxShadow: '0 0 6px #A78BFA' }} />
                  Review typically takes 24–48 hours
                </div>
              </div>

            ) : (
              /* ── Form ── */
              <>
                {/* Form header */}
                <div style={{ marginBottom: 30 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 99, marginBottom: 18,
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.22)',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block', boxShadow: '0 0 7px #8B5CF6' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#A78BFA' }}>
                      Academy Enrollment
                    </span>
                  </div>
                  <h1 style={{
                    fontSize: 'clamp(1.55rem, 3vw, 1.85rem)', fontWeight: 900,
                    lineHeight: 1.15, letterSpacing: '-0.03em',
                    margin: '0 0 10px',
                    color: '#F1F5F9',
                  }}>
                    Launch Your Academy<br />
                    <span style={{
                      background: 'linear-gradient(135deg, #C4B5FD 20%, #7C3AED)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      on the Platform
                    </span>
                  </h1>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.65 }}>
                    Tell us about your academy and we'll have your workspace ready.
                  </p>
                </div>

                {/* API error banner */}
                {apiError && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 12, marginBottom: 22,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#FCA5A5', fontSize: '0.83rem',
                  }}>
                    <span style={{ flexShrink: 0 }}><IcoX /></span>
                    {apiError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Academy Name */}
                  <div style={FIELD}>
                    <label style={LABEL}>Academy Name</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={ICON_SLOT}><IcoBuilding /></span>
                      <input
                        name="academy_name" type="text"
                        value={form.academy_name} onChange={handleChange}
                        onFocus={() => setFocused('academy_name')}
                        onBlur={() => setFocused(null)}
                        placeholder="e.g. Elite FC Academy"
                        style={fieldStyle('academy_name')}
                        disabled={loading} autoComplete="organization"
                      />
                    </div>
                    {errors.academy_name && <span style={ERR}>{errors.academy_name}</span>}
                  </div>

                  {/* Contact Name */}
                  <div style={FIELD}>
                    <label style={LABEL}>Contact Name</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={ICON_SLOT}><IcoUser /></span>
                      <input
                        name="contact_name" type="text"
                        value={form.contact_name} onChange={handleChange}
                        onFocus={() => setFocused('contact_name')}
                        onBlur={() => setFocused(null)}
                        placeholder="Your full name"
                        style={fieldStyle('contact_name')}
                        disabled={loading} autoComplete="name"
                      />
                    </div>
                    {errors.contact_name && <span style={ERR}>{errors.contact_name}</span>}
                  </div>

                  {/* Business Email */}
                  <div style={FIELD}>
                    <label style={LABEL}>Business Email</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={ICON_SLOT}><IcoMail /></span>
                      <input
                        name="contact_email" type="email"
                        value={form.contact_email} onChange={handleChange}
                        onFocus={() => setFocused('contact_email')}
                        onBlur={() => setFocused(null)}
                        placeholder="director@youracademy.com"
                        style={fieldStyle('contact_email')}
                        disabled={loading} autoComplete="email"
                      />
                    </div>
                    {errors.contact_email && <span style={ERR}>{errors.contact_email}</span>}
                  </div>

                  {/* Sport + Roster (2-up) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                    {/* Sport Type */}
                    <div style={FIELD}>
                      <label style={LABEL}>Sport Type</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={ICON_SLOT}><IcoGlobe /></span>
                        <select
                          name="sport"
                          value={form.sport} onChange={handleChange}
                          onFocus={() => setFocused('sport')}
                          onBlur={() => setFocused(null)}
                          style={{ ...fieldStyle('sport'), cursor: 'pointer', appearance: 'none' as const }}
                          disabled={loading}
                        >
                          <option value="" style={{ background: '#0D1425' }}>Select…</option>
                          {SPORTS.map(s => (
                            <option key={s} value={s} style={{ background: '#0D1425' }}>{s}</option>
                          ))}
                        </select>
                      </div>
                      {errors.sport && <span style={ERR}>{errors.sport}</span>}
                    </div>

                    {/* Roster Size */}
                    <div style={FIELD}>
                      <label style={LABEL}>Est. Roster Size</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={ICON_SLOT}><IcoUsers /></span>
                        <input
                          name="estimated_players" type="number"
                          min="1" max="10000"
                          value={form.estimated_players} onChange={handleChange}
                          onFocus={() => setFocused('estimated_players')}
                          onBlur={() => setFocused(null)}
                          placeholder="e.g. 50"
                          style={fieldStyle('estimated_players')}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 10,
                      width: '100%', padding: '15px 24px',
                      borderRadius: 14, border: 'none',
                      background: loading
                        ? 'rgba(124,58,237,0.35)'
                        : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                      color: '#fff',
                      fontSize: '0.93rem', fontWeight: 800,
                      letterSpacing: '-0.01em',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 10px 32px rgba(109,40,217,0.52)',
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}
                    onMouseEnter={e => {
                      if (!loading) {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.025)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 44px rgba(109,40,217,0.68)';
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 10px 32px rgba(109,40,217,0.52)';
                    }}
                  >
                    {loading ? (
                      <span style={{
                        display: 'inline-block', width: 20, height: 20,
                        borderRadius: '50%',
                        border: '2.5px solid rgba(255,255,255,0.22)',
                        borderTopColor: '#fff',
                        animation: 'enroll-spin 0.65s linear infinite',
                      }} />
                    ) : (
                      <> Submit Application <IcoArrowRight /> </>
                    )}
                  </button>
                </form>

                <p style={{
                  textAlign: 'center', marginTop: 18,
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.2)',
                  lineHeight: 1.6,
                }}>
                  We only contact you about your application. No marketing, ever.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes enroll-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
