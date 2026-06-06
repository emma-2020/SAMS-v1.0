'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@sams/store';
import { authApi } from '@sams/api';
import { useRouter } from 'solito/navigation';
import { ROLE_COLOR, ACCENT, NAVY_DARK } from '@sams/ui';
import { ROLE_DASHBOARD } from '../navigation/config';

const ROLES = [
  { role: 'Admin'  as const, desc: 'Manage the full academy'      },
  { role: 'Coach'  as const, desc: 'Run training & track rosters'  },
  { role: 'Player' as const, desc: 'View schedule & log wellness'   },
  { role: 'Parent' as const, desc: 'Monitor your athlete'           },
];

interface FormState { email: string; password: string; academy_id: string; }

export function LoginScreen() {
  const router     = useRouter();
  const loginStore = useAuthStore((s) => s.login);

  const [form,     setForm]     = useState<FormState>({ email: '', password: '', academy_id: '' });
  const [errors,   setErrors]   = useState<Partial<FormState>>({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    if (apiError) setApiError('');
  }

  function validate(): Partial<FormState> {
    const e: Partial<FormState> = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required.';
    if (!form.password)                                           e.password = 'Password required.';
    if (!form.academy_id.trim())                                  e.academy_id = 'Academy ID required.';
    return e;
  }

  const handleSubmit = useCallback(async () => {
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
      router.push(ROLE_DASHBOARD[profile.role] ?? '/dashboard');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, loginStore, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Brand panel (desktop only) ── */}
      <div
        className="hidden md:flex flex-col justify-center px-16 py-20 flex-none relative overflow-hidden"
        style={{ width: '42%', backgroundColor: NAVY_DARK }}
      >
        {/* Decorative rings */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
          style={{ backgroundColor: `${ACCENT}14` }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ backgroundColor: `${ACCENT}0A` }} />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: ACCENT, boxShadow: `0 4px 12px ${ACCENT}66` }}>
            <span className="font-black text-lg text-white">S</span>
          </div>
          <div>
            <p className="font-extrabold text-base text-white" style={{ letterSpacing: 4 }}>SAMS</p>
            <p className="text-[10px] text-white/40" style={{ letterSpacing: 2 }}>Sports Academy</p>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-black text-[36px] leading-tight text-white mb-4" style={{ letterSpacing: -0.5 }}>
          The Command<br />Centre for<br />
          <span style={{ color: '#818CF8' }}>Elite Academies.</span>
        </h1>

        <p className="text-white/55 text-sm leading-relaxed max-w-xs mb-10">
          Unified scheduling, attendance tracking, health monitoring, and team communications.
        </p>

        {/* Role list */}
        <div className="flex flex-col gap-3">
          {ROLES.map(({ role, desc }) => {
            const color = ROLE_COLOR[role];
            return (
              <div key={role} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border"
                  style={{ backgroundColor: `${color}25`, borderColor: `${color}40` }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <div>
                  <p className="font-bold text-[13px]" style={{ color, letterSpacing: 0.4 }}>{role}</p>
                  <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-14 pt-5 text-[11px] text-white/20 font-mono"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          SAMS v1.0 · Base Model MVP
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-16 py-10">
        <div className="w-full" style={{ maxWidth: 420 }}>

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-[9px] flex items-center justify-center"
              style={{ backgroundColor: ACCENT }}>
              <span className="font-black text-base text-white">S</span>
            </div>
            <span className="font-extrabold text-lg text-slate-900" style={{ letterSpacing: 1 }}>SAMS</span>
          </div>

          <p className="text-[11px] font-bold uppercase mb-2.5" style={{ color: ACCENT, letterSpacing: 4 }}>
            Welcome back
          </p>
          <h2 className="font-extrabold text-[26px] text-slate-900 tracking-tight mb-1.5">
            Sign in to your Academy
          </h2>
          <p className="text-slate-500 text-sm mb-7">
            Enter your credentials and Academy ID to access your workspace.
          </p>

          {apiError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-red-500 text-sm font-medium flex-1">{apiError}</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Field
              label="Academy ID"
              placeholder="Your academy UUID"
              value={form.academy_id}
              onChange={(v) => update('academy_id', v)}
              error={errors.academy_id}
              autoComplete="off"
            />
            <Field
              label="Email Address"
              placeholder="you@academy.com"
              value={form.email}
              onChange={(v) => update('email', v)}
              error={errors.email}
              type="email"
              autoComplete="email"
            />
            <Field
              label="Password"
              placeholder="••••••••"
              value={form.password}
              onChange={(v) => update('password', v)}
              error={errors.password}
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              onToggleShow={() => setShowPw((p) => !p)}
              showToggle
              showPw={showPw}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full font-bold text-base text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: ACCENT, height: 52 }}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Access Academy →'}
            </button>
          </div>

          <p className="text-center text-slate-400 text-xs mt-7 pt-5 border-t border-slate-200">
            Contact your Academy Administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, placeholder, value, onChange, error, type = 'text',
  autoComplete, showToggle, showPw, onToggleShow,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  showToggle?: boolean;
  showPw?: boolean;
  onToggleShow?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase text-slate-400" style={{ letterSpacing: '0.12em' }}>
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={[
            'w-full h-12 px-3.5 bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors',
            'placeholder:text-slate-400 focus:border-indigo-500',
            'border-[1.5px]',
            error ? 'border-red-400' : 'border-slate-200',
            showToggle ? 'pr-10' : '',
          ].join(' ')}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors text-xs font-medium"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}
