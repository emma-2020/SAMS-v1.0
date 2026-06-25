'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { useAuthStore } from '@sams/store';
import { apiClient, authApi, chatApi, adminApi } from '@sams/api';
import type { AcademyAdminSettings, UserPreferences } from '@sams/api';
import { useTheme } from '@/lib/theme/provider';

type Density = 'comfortable' | 'compact' | 'spacious';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IcoUser    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoLock    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoPalette = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
const IcoBldg    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoShield  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoBell    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IcoSliders = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
const IcoMonitor = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IcoSun     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IcoMoon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IcoCheck   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoCopy    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

function IcoEye({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      {off
        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
    </svg>
  );
}

// ─── Role metadata ────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { color: string; hex: string; label: string }> = {
  Admin:  { color: 'var(--role-admin)',  hex: '#7C3AED', label: 'Administrator' },
  Coach:  { color: 'var(--role-coach)',  hex: '#2563EB', label: 'Head Coach'    },
  Player: { color: 'var(--role-player)', hex: '#059669', label: 'Player'        },
  Parent: { color: 'var(--role-parent)', hex: '#D97706', label: 'Parent'        },
};

function buildTabs(role: string) {
  const base = [
    { id: 'profile',       label: 'Profile',          icon: <IcoUser />    },
    { id: 'security',      label: 'Security',          icon: <IcoLock />    },
    { id: 'appearance',    label: 'Appearance',        icon: <IcoPalette /> },
    { id: 'notifications', label: 'Notifications',     icon: <IcoBell />    },
    { id: 'academy',       label: 'Academy',           icon: <IcoBldg />    },
    { id: 'privacy',       label: 'Privacy & Safety',  icon: <IcoShield />  },
  ];
  if (role === 'Coach' || role === 'Player' || role === 'Parent') {
    base.splice(4, 0, { id: 'preferences', label: 'Preferences', icon: <IcoSliders /> });
  }
  return base;
}

// ─── Reusable primitives ──────────────────────────────────────────────────────
function StyledInput({ value, onChange, placeholder, type = 'text', disabled, rightSlot }: {
  value: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; disabled?: boolean; rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: rightSlot ? '11px 44px 11px 14px' : '11px 14px',
          fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 500,
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          background: disabled ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border-default)'}`,
          borderRadius: 12, outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.10)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {rightSlot && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

function FormField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
      {description && <span style={{ fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.4 }}>{description}</span>}
    </div>
  );
}

function SaveButton({ children, loading, disabled, type = 'submit', onClick }: {
  children: React.ReactNode; loading?: boolean; disabled?: boolean;
  type?: 'submit' | 'button'; onClick?: () => void;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} style={{
      height: 42, padding: '0 26px',
      background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      color: '#FFFFFF', border: 'none', borderRadius: 12,
      fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.01em',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.65 : 1,
      display: 'flex', alignItems: 'center', gap: 7,
      boxShadow: '0 4px 12px rgba(99,102,241,0.32)',
      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    }}
      onMouseEnter={e => { if (!disabled && !loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(99,102,241,0.44)'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(99,102,241,0.32)'; }}
    >
      {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Saving…</> : children}
    </button>
  );
}

function SettingsCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'var(--accent-subtle)', border: '1px solid var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: '28px 28px 32px' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono, copyable, onCopy, copied }: {
  label: string; value?: string; mono?: boolean; copyable?: boolean; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1.5px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', fontSize: mono ? '0.82rem' : '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {value ?? '—'}
        </div>
      </div>
      {copyable && (
        <button onClick={onCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, background: copied ? 'var(--success-subtle)' : 'var(--bg-surface)', border: `1.5px solid ${copied ? 'var(--success-border)' : 'var(--border-default)'}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s', color: copied ? 'var(--success)' : 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {copied ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}
        </button>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled} aria-checked={checked} role="switch" style={{
      width: 48, height: 26, borderRadius: 99, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0,
      background: checked ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'var(--border-default)',
      position: 'relative', transition: 'background 0.25s', opacity: disabled ? 0.6 : 1,
      boxShadow: checked ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
        boxShadow: '0 1px 4px rgba(15,23,42,0.2)',
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string; description?: string; checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1.5px solid var(--border-subtle)' }}>
      <div style={{ flex: 1, paddingRight: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{description}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function ThemeCard({ value, label, description, current, onClick, preview }: {
  value: string; label: string; description: string; current: string; onClick: () => void;
  preview: { bg: string; border: string; bar: string; line: string; card: string };
}) {
  const active = current === value;
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '18px', background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)', border: `2px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`, borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', textAlign: 'left', boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none' }}>
      <div style={{ height: 80, borderRadius: 10, marginBottom: 14, background: preview.bg, border: `1px solid ${preview.border}`, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, background: '#0D1B3E' }} />
        <div style={{ marginLeft: 28, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 8, borderRadius: 4, background: preview.bar, width: '60%' }} />
          <div style={{ height: 5, borderRadius: 3, background: preview.line, width: '80%', opacity: 0.5 }} />
          <div style={{ height: 5, borderRadius: 3, background: preview.line, width: '45%', opacity: 0.5 }} />
          <div style={{ marginTop: 4, height: 24, borderRadius: 6, background: preview.card, border: `1px solid ${preview.border}` }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', display: 'flex' }}>
          {value === 'light' ? <IcoSun /> : <IcoMoon />}
        </span>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: active ? 'var(--accent-dim)' : 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 1 }}>{description}</div>
        </div>
        {active && (
          <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(99,102,241,0.4)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Default preferences ──────────────────────────────────────────────────────
function defaultPrefs(role: string): UserPreferences {
  const base: UserPreferences = {
    notifications: {
      new_messages: true,
      schedule_changes: true,
      upcoming_sessions: true,
    },
  };
  if (role === 'Admin')  return { ...base, notifications: { ...base.notifications, new_member_joined: true, fee_payment_received: true } };
  if (role === 'Coach')  return { ...base, notifications: { ...base.notifications, attendance_due: true, player_health_alerts: true }, default_session: { duration_minutes: 90, location: '' }, receive_player_health_alerts: true };
  if (role === 'Player') return { ...base, notifications: { ...base.notifications, fee_due_reminders: true, team_announcements: true }, health_sharing: { share_with_coaches: true, share_with_admin: true }, emergency_contact: { name: '', phone: '', relationship: '' } };
  if (role === 'Parent') return { ...base, notifications: { ...base.notifications, child_fee_reminders: true, child_health_updates: true }, fee_reminder_days: 3, default_child_id: null };
  return base;
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme, density, setDensity } = useTheme();
  const meta  = ROLE_META[user?.role ?? ''] ?? { color: 'var(--accent)', hex: '#6366F1', label: user?.role ?? '' };
  const role  = user?.role ?? '';
  const TABS  = buildTabs(role);

  const [activeTab, setActiveTab] = useState('profile');

  // ── Preferences state ──────────────────────────────────────────────────────
  const [prefs,        setPrefs]        = useState<UserPreferences>(() => defaultPrefs(role));
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving,  setPrefsSaving]  = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  useEffect(() => {
    setPrefsLoading(true);
    authApi.getPreferences()
      .then(p => setPrefs({ ...defaultPrefs(role), ...p }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [role]);

  async function savePrefs(patch: UserPreferences) {
    setPrefsSaving(true);
    try {
      const updated = await authApi.updatePreferences(patch);
      setPrefs(prev => ({ ...prev, ...updated }));
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } catch { /* ignore */ }
    finally { setPrefsSaving(false); }
  }

  function toggleNotif(key: string) {
    const next = { ...prefs, notifications: { ...(prefs.notifications ?? {}), [key]: !(prefs.notifications as Record<string,boolean>)?.[key] } };
    setPrefs(next);
    savePrefs({ notifications: next.notifications });
  }

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(null);
  const [avatarFile,      setAvatarFile]      = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError,     setAvatarError]     = useState('');
  const [avatarSuccess,   setAvatarSuccess]   = useState(false);
  const [dragOver,        setDragOver]        = useState(false);

  function handleFileSelect(file: File | undefined) {
    if (!file) return;
    setAvatarFile(file); setAvatarError(''); setAvatarSuccess(false);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAvatarUpload() {
    if (!avatarFile) return;
    setAvatarUploading(true); setAvatarError('');
    try {
      const profile = await authApi.uploadAvatar(avatarFile);
      if (user) setUser({ ...user, avatar_url: profile.avatar_url });
      setAvatarSuccess(true); setAvatarFile(null);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally { setAvatarUploading(false); }
  }

  // ── Profile form ───────────────────────────────────────────────────────────
  const [profileForm,    setProfileForm]    = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' });
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [profileError,   setProfileError]   = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault(); setProfileError(''); setProfileSuccess(false); setSavingProfile(true);
    try {
      const res = (await apiClient.patch('/auth/me', profileForm)) as { data?: { profile?: typeof user } };
      const profile = res?.data?.profile;
      if (user) setUser({ ...user, first_name: profileForm.first_name, last_name: profileForm.last_name, ...(profile ?? {}) });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally { setSavingProfile(false); }
  }

  // ── Password form ──────────────────────────────────────────────────────────
  const [pwForm,    setPwForm]    = useState({ new_password: '', confirm: '' });
  const [showPw,    setShowPw]    = useState(false);
  const [savingPw,  setSavingPw]  = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError,   setPwError]   = useState('');

  async function handlePwSave(e: React.FormEvent) {
    e.preventDefault(); setPwError(''); setPwSuccess(false);
    if (pwForm.new_password.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    setSavingPw(true);
    try {
      await apiClient.post('/auth/change-password', { new_password: pwForm.new_password });
      setPwSuccess(true); setPwForm({ new_password: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally { setSavingPw(false); }
  }

  // ── Academy ID copy ────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  function copyAcademyId() {
    navigator.clipboard.writeText(user?.academy_id ?? '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // ── Blocked users (Privacy tab) ────────────────────────────────────────────
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; first_name: string; last_name: string; role: string; blocked_at: string }[]>([]);
  const [blockLoading, setBlockLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'privacy') {
      setBlockLoading(true);
      chatApi.getBlockedUsers().then(setBlockedUsers).finally(() => setBlockLoading(false));
    }
  }, [activeTab]);

  async function handleUnblock(userId: string) {
    setUnblockingId(userId);
    try { await chatApi.unblockUser(userId); setBlockedUsers(prev => prev.filter(u => u.id !== userId)); }
    catch { /* ignore */ }
    finally { setUnblockingId(null); }
  }

  // ── Admin: Chat policy + Paystack + Academy profile ───────────────────────
  const [chatSettings,        setChatSettings]        = useState<{ chat_coach_player_dm?: boolean }>({});
  const [chatSettingsLoading, setChatSettingsLoading] = useState(false);
  const [togglingDmPolicy,    setTogglingDmPolicy]    = useState(false);
  const [academySettings,     setAcademySettings]     = useState<AcademyAdminSettings | null>(null);
  const [paystackKey,         setPaystackKey]         = useState('');
  const [showPaystackKey,     setShowPaystackKey]     = useState(false);
  const [savingPaystack,      setSavingPaystack]      = useState(false);
  const [paystackSaved,       setPaystackSaved]       = useState(false);
  const [paystackError,       setPaystackError]       = useState('');

  // Academy name + logo
  const [academyName,      setAcademyName]      = useState('');
  const [savingAcademy,    setSavingAcademy]    = useState(false);
  const [academySaved,     setAcademySaved]     = useState(false);
  const [academyError,     setAcademyError]     = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile,         setLogoFile]         = useState<File | null>(null);
  const [logoPreview,      setLogoPreview]      = useState<string | null>(null);
  const [uploadingLogo,    setUploadingLogo]    = useState(false);

  // Role permissions
  const [savingPerms, setSavingPerms] = useState(false);
  const [permsSaved,  setPermsSaved]  = useState(false);

  useEffect(() => {
    if (activeTab === 'academy' && role === 'Admin') {
      setChatSettingsLoading(true);
      chatApi.getChatSettings().then(setChatSettings).finally(() => setChatSettingsLoading(false));
      adminApi.getAcademySettings().then(s => {
        setAcademySettings(s);
        setAcademyName(s.academy_name);
      }).catch(() => {});
    }
  }, [activeTab, role]);

  async function handleSavePaystack() {
    const trimmed = paystackKey.trim();
    if (trimmed && !trimmed.startsWith('sk_')) { setPaystackError('Key must start with sk_live_ or sk_test_'); return; }
    setSavingPaystack(true); setPaystackError(''); setPaystackSaved(false);
    try {
      const updated = await adminApi.updateAcademySettings({ paystack_secret_key: trimmed });
      setAcademySettings(updated); setPaystackKey(''); setPaystackSaved(true);
      setTimeout(() => setPaystackSaved(false), 3000);
    } catch (e: unknown) {
      setPaystackError(e instanceof Error ? e.message : 'Failed to save Paystack key.');
    } finally { setSavingPaystack(false); }
  }

  async function handleSaveAcademyName() {
    if (!academyName.trim()) { setAcademyError('Academy name cannot be empty.'); return; }
    setSavingAcademy(true); setAcademyError(''); setAcademySaved(false);
    try {
      const updated = await adminApi.updateAcademySettings({ academy_name: academyName.trim() });
      setAcademySettings(updated); setAcademySaved(true);
      setTimeout(() => setAcademySaved(false), 3000);
    } catch (e: unknown) {
      setAcademyError(e instanceof Error ? e.message : 'Failed to save academy name.');
    } finally { setSavingAcademy(false); }
  }

  function handleLogoSelect(file: File | undefined) {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUploadLogo() {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const result = await adminApi.uploadAcademyLogo(logoFile);
      setAcademySettings(prev => prev ? { ...prev, logo_url: result.logo_url } : prev);
      setLogoFile(null); setLogoPreview(null);
    } catch { /* ignore */ }
    finally { setUploadingLogo(false); }
  }

  async function handleToggleDmPolicy() {
    setTogglingDmPolicy(true);
    try {
      const updated = await chatApi.updateChatSettings({ chat_coach_player_dm: !chatSettings.chat_coach_player_dm });
      setChatSettings(updated);
    } catch { /* ignore */ }
    finally { setTogglingDmPolicy(false); }
  }

  async function handleTogglePermission(key: string, val: boolean) {
    setSavingPerms(true);
    try {
      const updated = await adminApi.updateAcademySettings({ role_permissions: { [key]: val } });
      setAcademySettings(updated); setPermsSaved(true);
      setTimeout(() => setPermsSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSavingPerms(false); }
  }

  // ── Coach preferences ──────────────────────────────────────────────────────
  const [coachSessionForm,    setCoachSessionForm]    = useState({ duration_minutes: 90, location: '' });
  const [savingCoachSession,  setSavingCoachSession]  = useState(false);
  const [coachSessionSaved,   setCoachSessionSaved]   = useState(false);

  useEffect(() => {
    if (prefs.default_session) {
      setCoachSessionForm({
        duration_minutes: prefs.default_session.duration_minutes ?? 90,
        location:         prefs.default_session.location ?? '',
      });
    }
  }, [prefs.default_session]);

  async function handleSaveCoachSession(e: React.FormEvent) {
    e.preventDefault(); setSavingCoachSession(true);
    try {
      await savePrefs({ default_session: coachSessionForm });
      setCoachSessionSaved(true); setTimeout(() => setCoachSessionSaved(false), 3000);
    } finally { setSavingCoachSession(false); }
  }

  // ── Player preferences ─────────────────────────────────────────────────────
  const [emergencyForm,   setEmergencyForm]   = useState({ name: '', phone: '', relationship: '' });
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [emergencySaved,  setEmergencySaved]  = useState(false);

  useEffect(() => {
    if (prefs.emergency_contact) {
      setEmergencyForm({
        name:         prefs.emergency_contact.name ?? '',
        phone:        prefs.emergency_contact.phone ?? '',
        relationship: prefs.emergency_contact.relationship ?? '',
      });
    }
  }, [prefs.emergency_contact]);

  async function handleSaveEmergency(e: React.FormEvent) {
    e.preventDefault(); setSavingEmergency(true);
    try {
      await savePrefs({ emergency_contact: emergencyForm });
      setEmergencySaved(true); setTimeout(() => setEmergencySaved(false), 3000);
    } finally { setSavingEmergency(false); }
  }

  // ── Parent preferences ─────────────────────────────────────────────────────
  const [feeReminderDays,     setFeeReminderDays]     = useState(3);
  const [savingParentPrefs,   setSavingParentPrefs]   = useState(false);
  const [parentPrefsSaved,    setParentPrefsSaved]    = useState(false);

  useEffect(() => {
    if (prefs.fee_reminder_days !== undefined) setFeeReminderDays(prefs.fee_reminder_days);
  }, [prefs.fee_reminder_days]);

  async function handleSaveParentPrefs(e: React.FormEvent) {
    e.preventDefault(); setSavingParentPrefs(true);
    try {
      await savePrefs({ fee_reminder_days: feeReminderDays });
      setParentPrefsSaved(true); setTimeout(() => setParentPrefsSaved(false), 3000);
    } finally { setSavingParentPrefs(false); }
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  // ─── Notification sections by role ────────────────────────────────────────
  const notifSections: { title: string; items: { key: string; label: string; description: string }[] }[] = [
    {
      title: 'Messaging',
      items: [
        { key: 'new_messages', label: 'New messages', description: 'When someone sends you a direct message or mentions you in a group' },
      ],
    },
    {
      title: 'Schedule',
      items: [
        { key: 'schedule_changes', label: 'Schedule changes', description: 'When a session is moved, cancelled, or a new event is added' },
        { key: 'upcoming_sessions', label: 'Upcoming sessions', description: 'Reminder the day before a scheduled training or game' },
      ],
    },
  ];

  if (role === 'Admin') {
    notifSections.push({ title: 'Academy', items: [
      { key: 'new_member_joined', label: 'New member joined', description: 'When an invitation is accepted and a new user joins the academy' },
      { key: 'fee_payment_received', label: 'Payment received', description: 'When a player or parent completes an online fee payment' },
    ]});
  }
  if (role === 'Coach') {
    notifSections.push({ title: 'Coaching', items: [
      { key: 'attendance_due', label: 'Attendance sheet due', description: 'Reminder to submit attendance after a session' },
      { key: 'player_health_alerts', label: 'Player health alerts', description: 'When a player submits a concerning wellness score' },
    ]});
  }
  if (role === 'Player') {
    notifSections.push({ title: 'Fees & Announcements', items: [
      { key: 'fee_due_reminders', label: 'Fee due reminders', description: 'Alerts when a fee payment deadline is approaching' },
      { key: 'team_announcements', label: 'Team announcements', description: 'When a coach or admin posts an announcement to your team' },
    ]});
  }
  if (role === 'Parent') {
    notifSections.push({ title: 'My Child', items: [
      { key: 'child_fee_reminders', label: "Child's fee reminders", description: "Alerts when your child's fee payment is due soon" },
      { key: 'child_health_updates', label: 'Health & wellness updates', description: "When your child submits a new wellness check-in" },
    ]});
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 780 }}>

      {/* ── Profile hero header ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 22, padding: '24px 28px',
        background: `linear-gradient(135deg, ${meta.hex}08 0%, var(--bg-surface) 60%)`,
        border: `1.5px solid ${meta.hex}18`, borderRadius: 20, marginBottom: 28,
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
      }}>
        <div style={{ padding: 3, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${meta.hex}, ${meta.hex}60)`, boxShadow: `0 0 0 5px ${meta.hex}14, 0 4px 16px ${meta.hex}22` }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: `${meta.hex}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontWeight: 900, fontSize: '1.55rem', color: meta.hex, letterSpacing: '-0.03em' }}>{initials}</span>}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.45rem', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>{user?.email}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '4px 12px', borderRadius: 99, background: `${meta.hex}12`, border: `1px solid ${meta.hex}28` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.hex, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.hex }}>{meta.label}</span>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border-subtle)', marginBottom: 26, gap: 0, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '11px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: active ? 700 : 500,
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: `2.5px solid ${active ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-1.5px', letterSpacing: active ? '-0.01em' : 'normal',
              transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              <span style={{ display: 'flex', color: active ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.15s' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PROFILE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Photo upload */}
          <SettingsCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>} title="Profile Photo" subtitle="Shown across the platform">
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0])} />
            <div
              onClick={() => avatarInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files?.[0]); }}
              style={{ border: `1.5px dashed ${dragOver ? '#6366F1' : (avatarPreview ? '#A5B4FC' : '#CBD5E1')}`, borderRadius: 16, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'center', background: dragOver ? '#EEF2FF' : (avatarPreview ? '#F5F3FF' : '#FAFBFC'), transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)' }}
            >
              {avatarPreview ? (
                <><div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid #C7D2FE', boxShadow: '0 4px 14px rgba(99,102,241,0.2)' }}><img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div><div><div style={{ fontWeight: 700, color: '#4338CA', fontSize: '0.9rem' }}>Photo ready to upload</div><div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 3 }}>Click to change selection</div></div></>
              ) : user?.avatar_url ? (
                <><div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid #E2E8F0' }}><img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div><div><div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Photo set</div><div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 3 }}>Drop a new photo or <span style={{ color: '#6366F1', fontWeight: 600 }}>click to change</span></div></div></>
              ) : (
                <><div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EEF2FF', border: '1.5px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}><UploadCloud size={24} /></div><div><div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Drop a photo here, or <span style={{ color: '#6366F1', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}>browse</span></div><div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 5 }}>JPG, PNG or WebP · Max 5 MB</div></div></>
              )}
            </div>
            {(avatarFile || user?.avatar_url) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="btn btn-secondary" style={{ fontSize: '0.82rem', borderRadius: 10 }}>{user?.avatar_url ? 'Change Photo' : 'Choose Photo'}</button>
                {avatarFile && <SaveButton loading={avatarUploading} type="button" onClick={handleAvatarUpload}>Upload Photo</SaveButton>}
              </div>
            )}
            {avatarError   && <div className="alert alert-error"   style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}>{avatarError}</div>}
            {avatarSuccess && <div className="alert alert-success" style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Profile photo updated!</div>}
          </SettingsCard>

          {/* Personal info */}
          <SettingsCard icon={<IcoUser />} title="Personal Information" subtitle="Update your display name">
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-grid-2">
                <FormField label="First Name" description="Your given name shown to teammates">
                  <StyledInput value={profileForm.first_name} onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                </FormField>
                <FormField label="Last Name" description="Your family name shown to teammates">
                  <StyledInput value={profileForm.last_name} onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                </FormField>
              </div>
              <FormField label="Email Address" description="Email cannot be changed after account creation.">
                <StyledInput value={user?.email ?? ''} disabled />
              </FormField>
              {profileError   && <div className="alert alert-error"   style={{ padding: '10px 14px' }}><span style={{ fontSize: '0.85rem' }}>{profileError}</span></div>}
              {profileSuccess && <div className="alert alert-success" style={{ padding: '10px 14px' }}><IcoCheck /><span style={{ fontSize: '0.85rem' }}>Profile updated successfully.</span></div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <SaveButton loading={savingProfile}>Save Changes</SaveButton>
              </div>
            </form>
          </SettingsCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECURITY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SettingsCard icon={<IcoLock />} title="Change Password" subtitle="Choose a strong, unique password">
            <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <FormField label="New Password" description="Must be at least 8 characters long">
                <StyledInput type={showPw ? 'text' : 'password'} value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Minimum 8 characters"
                  rightSlot={<button type="button" onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}><IcoEye off={showPw} /></button>} />
              </FormField>
              <FormField label="Confirm New Password" description="Repeat the password to confirm">
                <StyledInput type={showPw ? 'text' : 'password'} value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
              </FormField>
              {pwForm.new_password && (
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1.5px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { ok: pwForm.new_password.length >= 8, label: 'At least 8 characters' },
                    { ok: /[A-Z]/.test(pwForm.new_password), label: 'One uppercase letter' },
                    { ok: /[0-9]/.test(pwForm.new_password), label: 'One number' },
                  ].map(({ ok, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: ok ? 'var(--success)' : 'var(--border-strong)', display: 'flex' }}>
                        {ok ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: ok ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
              {pwError   && <div className="alert alert-error"   style={{ padding: '10px 14px' }}><span style={{ fontSize: '0.85rem' }}>{pwError}</span></div>}
              {pwSuccess && <div className="alert alert-success" style={{ padding: '10px 14px' }}><IcoCheck /><span style={{ fontSize: '0.85rem' }}>Password changed successfully.</span></div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <SaveButton loading={savingPw} disabled={!pwForm.new_password}>Update Password</SaveButton>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard icon={<IcoShield />} title="Active Session" subtitle="Your current login session">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1.5px solid var(--border-subtle)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'var(--success-subtle)', border: '1.5px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}><IcoMonitor /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Current Browser Session</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Logged in as {user?.role} · {user?.email}</div>
              </div>
              <span style={{ padding: '3px 11px', borderRadius: 99, background: 'var(--success-subtle)', border: '1px solid var(--success-border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active</span>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          APPEARANCE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'appearance' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SettingsCard icon={<IcoPalette />} title="Theme" subtitle="Choose your preferred colour scheme">
            <div style={{ display: 'flex', gap: 16 }}>
              <ThemeCard value="light" label="Light Mode" description="Clean and bright" current={theme} onClick={() => theme === 'dark' && toggleTheme()} preview={{ bg: '#F4F6FA', border: '#E2E8F0', bar: '#0F172A', line: '#94A3B8', card: '#FFFFFF' }} />
              <ThemeCard value="dark"  label="Dark Mode"  description="Easy on the eyes"  current={theme} onClick={() => theme === 'light' && toggleTheme()} preview={{ bg: '#0D1117', border: '#2D3748', bar: '#F1F5F9', line: '#64748B', card: '#161B27' }} />
            </div>
          </SettingsCard>

          <SettingsCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>} title="Interface Density" subtitle="Adjust content spacing">
            {([
              { id: 'comfortable', label: 'Comfortable', desc: 'Default spacing, great for all screen sizes' },
              { id: 'compact',     label: 'Compact',     desc: 'Tighter layout, more content visible'       },
              { id: 'spacious',    label: 'Spacious',    desc: 'Maximum breathing room for large screens'   },
            ] as { id: Density; label: string; desc: string }[]).map((opt, i) => {
              const isActive = density === opt.id;
              return (
                <label key={opt.id} onClick={() => setDensity(opt.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: isActive ? 'var(--accent-subtle)' : 'var(--bg-elevated)', border: `1.5px solid ${isActive ? 'var(--accent-light)' : 'var(--border-subtle)'}`, borderRadius: 12, cursor: 'pointer', marginBottom: i < 2 ? 10 : 0, transition: 'all 0.15s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border-default)'}`, background: isActive ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isActive ? 'var(--accent-dim)' : 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {isActive && <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-dim)', padding: '3px 9px', borderRadius: 99, background: 'var(--accent-subtle)', border: '1px solid var(--accent-light)' }}>Active</span>}
                </label>
              );
            })}
          </SettingsCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NOTIFICATIONS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'notifications' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {prefsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
            </div>
          ) : (
            <>
              {notifSections.map(section => (
                <SettingsCard key={section.title} icon={<IcoBell />} title={`${section.title} Alerts`} subtitle="Choose which events send you a notification">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {section.items.map(item => (
                      <ToggleRow
                        key={item.key}
                        label={item.label}
                        description={item.description}
                        checked={(prefs.notifications as Record<string,boolean>)?.[item.key] ?? true}
                        onChange={() => toggleNotif(item.key)}
                        disabled={prefsSaving}
                      />
                    ))}
                  </div>
                  {prefsSuccess && <div className="alert alert-success" style={{ padding: '8px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Preferences saved.</div>}
                </SettingsCard>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PREFERENCES TAB  (Coach / Player / Parent only)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'preferences' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── COACH ── */}
          {role === 'Coach' && (
            <>
              <SettingsCard icon={<IcoSliders />} title="Default Session Settings" subtitle="Pre-fill these when creating a new training session">
                <form onSubmit={handleSaveCoachSession} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <FormField label="Default Duration" description="Duration in minutes shown when creating a session">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {[60, 75, 90, 105, 120].map(min => {
                        const active = coachSessionForm.duration_minutes === min;
                        return (
                          <button key={min} type="button" onClick={() => setCoachSessionForm(p => ({ ...p, duration_minutes: min }))} style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`, background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)', color: active ? 'var(--accent-dim)' : 'var(--text-secondary)', fontWeight: active ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                            {min}m
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                  <FormField label="Default Location" description="Venue or pitch name shown when scheduling">
                    <StyledInput value={coachSessionForm.location} onChange={e => setCoachSessionForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Main Pitch, Training Ground A" />
                  </FormField>
                  {coachSessionSaved && <div className="alert alert-success" style={{ padding: '9px 14px' }}><IcoCheck /> Session defaults saved.</div>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <SaveButton loading={savingCoachSession}>Save Defaults</SaveButton>
                  </div>
                </form>
              </SettingsCard>

              <SettingsCard icon={<IcoShield />} title="Player Data Visibility" subtitle="Control which player information you receive">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleRow
                    label="Receive player health alerts"
                    description="Get notified when a player in your squad submits a low wellness score"
                    checked={prefs.receive_player_health_alerts ?? true}
                    onChange={() => savePrefs({ receive_player_health_alerts: !(prefs.receive_player_health_alerts ?? true) })}
                    disabled={prefsSaving}
                  />
                </div>
                {prefsSuccess && <div className="alert alert-success" style={{ padding: '8px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Saved.</div>}
              </SettingsCard>
            </>
          )}

          {/* ── PLAYER ── */}
          {role === 'Player' && (
            <>
              <SettingsCard icon={<IcoShield />} title="Health Data Sharing" subtitle="Control who can see your wellness check-ins">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleRow
                    label="Share wellness data with my coaches"
                    description="Coaches can see your daily wellness scores and flag low-risk sessions"
                    checked={prefs.health_sharing?.share_with_coaches ?? true}
                    onChange={() => savePrefs({ health_sharing: { ...(prefs.health_sharing ?? {}), share_with_coaches: !(prefs.health_sharing?.share_with_coaches ?? true) } })}
                    disabled={prefsSaving}
                  />
                  <ToggleRow
                    label="Share wellness data with academy admin"
                    description="Admins can access your health logs for injury management purposes"
                    checked={prefs.health_sharing?.share_with_admin ?? true}
                    onChange={() => savePrefs({ health_sharing: { ...(prefs.health_sharing ?? {}), share_with_admin: !(prefs.health_sharing?.share_with_admin ?? true) } })}
                    disabled={prefsSaving}
                  />
                </div>
                {prefsSuccess && <div className="alert alert-success" style={{ padding: '8px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Saved.</div>}
              </SettingsCard>

              <SettingsCard icon={<IcoUser />} title="Emergency Contact" subtitle="Person to contact in case of injury or emergency during training">
                <form onSubmit={handleSaveEmergency} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div className="form-grid-2">
                    <FormField label="Full Name">
                      <StyledInput value={emergencyForm.name} onChange={e => setEmergencyForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jane Doe" />
                    </FormField>
                    <FormField label="Relationship">
                      <StyledInput value={emergencyForm.relationship} onChange={e => setEmergencyForm(p => ({ ...p, relationship: e.target.value }))} placeholder="e.g. Mother, Guardian" />
                    </FormField>
                  </div>
                  <FormField label="Phone Number" description="Include country code for international numbers">
                    <StyledInput value={emergencyForm.phone} onChange={e => setEmergencyForm(p => ({ ...p, phone: e.target.value }))} placeholder="+233 20 000 0000" type="tel" />
                  </FormField>
                  {emergencySaved && <div className="alert alert-success" style={{ padding: '9px 14px' }}><IcoCheck /> Emergency contact saved.</div>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <SaveButton loading={savingEmergency}>Save Contact</SaveButton>
                  </div>
                </form>
              </SettingsCard>
            </>
          )}

          {/* ── PARENT ── */}
          {role === 'Parent' && (
            <SettingsCard icon={<IcoSliders />} title="Fee Reminder Timing" subtitle="How many days before a fee deadline you want to be reminded">
              <form onSubmit={handleSaveParentPrefs} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <FormField label="Remind me this many days before a fee is due">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {[1, 2, 3, 5, 7].map(days => {
                      const active = feeReminderDays === days;
                      return (
                        <button key={days} type="button" onClick={() => setFeeReminderDays(days)} style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`, background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)', color: active ? 'var(--accent-dim)' : 'var(--text-secondary)', fontWeight: active ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {days}d
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    You will receive a reminder <strong>{feeReminderDays} day{feeReminderDays !== 1 ? 's' : ''}</strong> before each fee payment deadline.
                  </div>
                </FormField>
                {parentPrefsSaved && <div className="alert alert-success" style={{ padding: '9px 14px' }}><IcoCheck /> Reminder preference saved.</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <SaveButton loading={savingParentPrefs}>Save Preference</SaveButton>
                </div>
              </form>
            </SettingsCard>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ACADEMY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'academy' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Academy info — visible to all roles */}
          <SettingsCard icon={<IcoBldg />} title="Academy Information" subtitle="Your academy connection details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Academy ID"     value={user?.academy_id}  mono copyable onCopy={copyAcademyId} copied={copied} />
              <InfoRow label="Your Role"      value={meta.label} />
              <InfoRow label="Account Status" value="Active" />
              <InfoRow label="Member Since"   value={(user as typeof user & { created_at?: string })?.created_at ? new Date((user as typeof user & { created_at?: string }).created_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
            </div>
          </SettingsCard>

          <SettingsCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} title="Platform Version" subtitle="SAMS build info">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Version"     value="SAMS v1.0" />
              <InfoRow label="Environment" value={process.env.NODE_ENV ?? 'development'} mono />
            </div>
          </SettingsCard>

          {/* ── ADMIN-ONLY: Academy Profile ───────────────────────────────── */}
          {role === 'Admin' && (
            <>
              <SettingsCard icon={<IcoBldg />} title="Academy Profile" subtitle="Update your academy name and logo">
                {/* Logo upload */}
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={e => handleLogoSelect(e.target.files?.[0])} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, padding: '18px', background: 'var(--bg-elevated)', borderRadius: 14, border: '1.5px solid var(--border-subtle)' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', background: 'var(--accent-subtle)', border: '2px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#6366F1', fontSize: '1.4rem', fontWeight: 800 }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : academySettings?.logo_url
                        ? <img src={academySettings.logo_url} alt="Academy logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (academySettings?.academy_name?.[0] ?? 'A')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Academy Logo</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>Shown on the platform header · JPEG, PNG or WebP · Max 2 MB</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="btn btn-secondary" style={{ fontSize: '0.78rem', borderRadius: 8, padding: '6px 14px' }}>
                        {academySettings?.logo_url ? 'Change Logo' : 'Upload Logo'}
                      </button>
                      {logoFile && <SaveButton loading={uploadingLogo} type="button" onClick={handleUploadLogo}>Save Logo</SaveButton>}
                    </div>
                  </div>
                </div>

                {/* Academy name */}
                <FormField label="Academy Name" description="This name appears throughout the platform">
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <StyledInput value={academyName} onChange={e => setAcademyName(e.target.value)} placeholder="Your academy name" />
                    </div>
                    <SaveButton type="button" loading={savingAcademy} disabled={!academyName.trim() || academyName.trim() === academySettings?.academy_name} onClick={handleSaveAcademyName}>Save</SaveButton>
                  </div>
                </FormField>
                {academyError  && <div className="alert alert-error"   style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}>{academyError}</div>}
                {academySaved  && <div className="alert alert-success" style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Academy name saved.</div>}
              </SettingsCard>

              {/* Paystack */}
              <SettingsCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>} title="Paystack Payments" subtitle="Enable online fee payments via card and Mobile Money">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: academySettings?.paystack_configured ? '#F0FDF4' : '#FFFBEB', border: `1.5px solid ${academySettings?.paystack_configured ? '#BBF7D0' : '#FDE68A'}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: academySettings?.paystack_configured ? '#16A34A' : '#D97706' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: academySettings?.paystack_configured ? '#15803D' : '#92400E' }}>{academySettings?.paystack_configured ? 'Paystack connected' : 'Not connected'}</div>
                    {academySettings?.paystack_key_preview && <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 1, fontFamily: 'var(--font-mono)' }}>{academySettings.paystack_key_preview}</div>}
                  </div>
                  {academySettings?.paystack_configured && <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#15803D', padding: '2px 8px', borderRadius: 99, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>Active</span>}
                </div>
                <FormField label={academySettings?.paystack_configured ? 'Replace Paystack Secret Key' : 'Paystack Secret Key'} description="Found in your Paystack dashboard → Settings → API Keys.">
                  <StyledInput type={showPaystackKey ? 'text' : 'password'} value={paystackKey} onChange={e => setPaystackKey(e.target.value)} placeholder="Paste your Paystack secret key here"
                    rightSlot={<button type="button" onClick={() => setShowPaystackKey(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}><IcoEye off={showPaystackKey} /></button>} />
                </FormField>
                {paystackError && <div className="alert alert-error"   style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}>{paystackError}</div>}
                {paystackSaved && <div className="alert alert-success" style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Paystack key saved successfully.</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <SaveButton loading={savingPaystack} disabled={!paystackKey.trim()} type="button" onClick={handleSavePaystack}>
                    {academySettings?.paystack_configured ? 'Update Key' : 'Connect Paystack'}
                  </SaveButton>
                  {academySettings?.paystack_configured && (
                    <button type="button" onClick={async () => {
                      if (!confirm('Remove the Paystack key? Online payment links will stop working.')) return;
                      setSavingPaystack(true); setPaystackError('');
                      try {
                        const updated = await adminApi.updateAcademySettings({ paystack_secret_key: '' });
                        setAcademySettings(updated); setPaystackKey(''); setPaystackSaved(true);
                        setTimeout(() => setPaystackSaved(false), 3000);
                      } catch (e: unknown) { setPaystackError(e instanceof Error ? e.message : 'Failed to remove key.'); }
                      finally { setSavingPaystack(false); }
                    }} style={{ padding: '0 20px', height: 42, border: '1.5px solid #FECACA', borderRadius: 12, background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                      Remove Key
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Webhook URL:</strong>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>https://api.playsams.com/api/fees/webhook/paystack</span>
                </div>
              </SettingsCard>

              {/* Chat Policy */}
              <SettingsCard icon={<IcoShield />} title="Chat Policy" subtitle="Control messaging between roles in your academy">
                {chatSettingsLoading ? <div className="skeleton" style={{ height: 72, borderRadius: 12 }} /> : (
                  <div>
                    <ToggleRow
                      label="Allow Coach ↔ Player direct messages"
                      description="When off, coaches and players cannot open 1-on-1 chats. They must communicate through team groups or via the player's parent."
                      checked={chatSettings.chat_coach_player_dm ?? false}
                      onChange={handleToggleDmPolicy}
                      disabled={togglingDmPolicy}
                    />
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: chatSettings.chat_coach_player_dm ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${chatSettings.chat_coach_player_dm ? '#BBF7D0' : '#FDE68A'}`, fontSize: '0.76rem', fontWeight: 600, color: chatSettings.chat_coach_player_dm ? '#15803D' : '#D97706' }}>
                      {chatSettings.chat_coach_player_dm ? '✓ Coach ↔ Player DMs are currently enabled' : '⚠ Coach ↔ Player DMs are currently blocked (recommended for safeguarding)'}
                    </div>
                  </div>
                )}
              </SettingsCard>

              {/* Role Permissions */}
              <SettingsCard icon={<IcoShield />} title="Role Permissions" subtitle="Control what each role can access across your academy">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleRow
                    label="Parents can view attendance records"
                    description="Allow parents to see their child's attendance history across all sessions"
                    checked={academySettings?.role_permissions?.parents_can_view_attendance ?? false}
                    onChange={() => handleTogglePermission('parents_can_view_attendance', !(academySettings?.role_permissions?.parents_can_view_attendance ?? false))}
                    disabled={savingPerms}
                  />
                  <ToggleRow
                    label="Players can see teammate contact info"
                    description="Allow players to view the names and email addresses of other team members"
                    checked={academySettings?.role_permissions?.players_can_see_teammate_contacts ?? true}
                    onChange={() => handleTogglePermission('players_can_see_teammate_contacts', !(academySettings?.role_permissions?.players_can_see_teammate_contacts ?? true))}
                    disabled={savingPerms}
                  />
                  <ToggleRow
                    label="Coaches can post announcements"
                    description="Allow coaches to publish announcements (not just Admins)"
                    checked={academySettings?.role_permissions?.coaches_can_post_announcements ?? false}
                    onChange={() => handleTogglePermission('coaches_can_post_announcements', !(academySettings?.role_permissions?.coaches_can_post_announcements ?? false))}
                    disabled={savingPerms}
                  />
                </div>
                {permsSaved && <div className="alert alert-success" style={{ padding: '8px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Permission saved.</div>}
              </SettingsCard>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRIVACY & SAFETY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'privacy' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SettingsCard icon={<IcoShield />} title="Blocked Users" subtitle="People you have blocked cannot send you direct messages">
            {blockLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 62, borderRadius: 12 }} />)}
              </div>
            ) : blockedUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🛡️</div>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No blocked users</div>
                <div>You haven&apos;t blocked anyone</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blockedUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 14, border: '1.5px solid var(--border-subtle)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-subtle)', border: '1.5px solid var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '0.85rem', color: '#6366F1' }}>
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{u.first_name} {u.last_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{u.role} · Blocked {new Date(u.blocked_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => handleUnblock(u.id)} disabled={unblockingId === u.id}
                      style={{ padding: '7px 16px', borderRadius: 10, border: '1.5px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', opacity: unblockingId === u.id ? 0.6 : 1, transition: 'all 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => { if (unblockingId !== u.id) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      {unblockingId === u.id ? 'Unblocking…' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>

          <SettingsCard icon={<IcoLock />} title="Who Can Message You" subtitle="Based on your role and academy policy">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(role === 'Coach'
                ? [{ label: 'Admins', allowed: true }, { label: 'Other Coaches', allowed: true }, { label: 'Parents', allowed: true }, { label: 'Players', allowed: false, note: 'Controlled by academy chat policy' }]
                : role === 'Player'
                ? [{ label: 'Admins', allowed: true }, { label: 'Other Players', allowed: true }, { label: 'Parents (your own)', allowed: true }, { label: 'Coaches', allowed: false, note: 'Controlled by academy chat policy' }]
                : [{ label: 'All academy members', allowed: true }]
              ).map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1.5px solid var(--border-subtle)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.allowed ? '#F0FDF4' : '#FFF7ED', border: `1px solid ${item.allowed ? '#BBF7D0' : '#FED7AA'}` }}>
                    {item.allowed
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                    {('note' in item) && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>{item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>
        </div>
      )}
    </div>
  );
}
