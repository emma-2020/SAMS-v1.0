'use client';

import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { useAuthStore } from '@sams/store';
import { apiClient } from '@sams/api';
import { useTheme } from '@/lib/theme/provider';

type Density = 'comfortable' | 'compact' | 'spacious';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IcoUser    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoLock    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoPalette = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
const IcoBldg    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoImg     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcoShield  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
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

const TABS = [
  { id: 'profile',    label: 'Profile',    icon: <IcoUser />    },
  { id: 'security',   label: 'Security',   icon: <IcoLock />    },
  { id: 'appearance', label: 'Appearance', icon: <IcoPalette /> },
  { id: 'academy',    label: 'Academy',    icon: <IcoBldg />    },
];

// ─── StyledInput ──────────────────────────────────────────────────────────────
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

// ─── FormField ────────────────────────────────────────────────────────────────
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

// ─── SaveButton ───────────────────────────────────────────────────────────────
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
      {loading
        ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Saving…</>
        : children}
    </button>
  );
}

// ─── SettingsCard ─────────────────────────────────────────────────────────────
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

// ─── InfoRow (Academy tab) ────────────────────────────────────────────────────
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

// ─── ThemeCard ────────────────────────────────────────────────────────────────
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

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme, density, setDensity } = useTheme();
  const meta = ROLE_META[user?.role ?? ''] ?? { color: 'var(--accent)', hex: '#6366F1', label: user?.role ?? '' };

  const [activeTab, setActiveTab] = useState('profile');

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
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      const res = (await apiClient.post('/auth/avatar', fd)) as { data?: { profile?: { avatar_url?: string } } };
      const newUrl = (res as any)?.data?.profile?.avatar_url ?? (res as any)?.avatar_url;
      if (user) setUser({ ...user, avatar_url: newUrl });
      setAvatarSuccess(true); setAvatarFile(null);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally { setAvatarUploading(false); }
  }

  // ── Profile form ───────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError,  setProfileError]  = useState('');
  const [profileSuccess,setProfileSuccess]= useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault(); setProfileError(''); setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const res = (await apiClient.patch('/auth/me', profileForm)) as any;
      const profile = res?.data?.profile ?? res?.profile;
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

  // ── Copy academy ID ────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  function copyAcademyId() {
    navigator.clipboard.writeText(user?.academy_id ?? '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 780 }}>

      {/* ── Profile hero header ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 22, padding: '24px 28px',
        background: `linear-gradient(135deg, ${meta.hex}08 0%, var(--bg-surface) 60%)`,
        border: `1.5px solid ${meta.hex}18`, borderRadius: 20, marginBottom: 28,
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
      }}>
        {/* Gradient-ring avatar */}
        <div style={{ padding: 3, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${meta.hex}, ${meta.hex}60)`, boxShadow: `0 0 0 5px ${meta.hex}14, 0 4px 16px ${meta.hex}22` }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: `${meta.hex}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontWeight: 900, fontSize: '1.55rem', color: meta.hex, letterSpacing: '-0.03em' }}>{initials}</span>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.45rem', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4, fontWeight: 400 }}>
            {user?.email}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '4px 12px', borderRadius: 99, background: `${meta.hex}12`, border: `1px solid ${meta.hex}28` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.hex, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.hex }}>
              {meta.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border-subtle)', marginBottom: 26, gap: 0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '11px 20px',
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
              <span style={{ display: 'flex', color: active ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.15s' }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Profile Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Photo upload */}
          <SettingsCard icon={<IcoImg />} title="Profile Photo" subtitle="Shown across the platform">
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0])} />

            <div
              onClick={() => avatarInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files?.[0]); }}
              style={{
                border: `1.5px dashed ${dragOver ? '#6366F1' : (avatarPreview ? '#A5B4FC' : '#CBD5E1')}`,
                borderRadius: 16, padding: '32px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 14, cursor: 'pointer', textAlign: 'center',
                background: dragOver ? '#EEF2FF' : (avatarPreview ? '#F5F3FF' : '#FAFBFC'),
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {avatarPreview ? (
                <>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid #C7D2FE', boxShadow: '0 4px 14px rgba(99,102,241,0.2)' }}>
                    <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#4338CA', fontSize: '0.9rem' }}>Photo ready to upload</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 3 }}>Click to change selection</div>
                  </div>
                </>
              ) : user?.avatar_url ? (
                <>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid #E2E8F0' }}>
                    <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Photo set</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 3 }}>
                      Drop a new photo or <span style={{ color: '#6366F1', fontWeight: 600 }}>click to change</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EEF2FF', border: '1.5px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                      Drop a photo here, or <span style={{ color: '#6366F1', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}>browse</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 5 }}>JPG, PNG or WebP · Max 5 MB</div>
                  </div>
                </>
              )}
            </div>

            {(avatarFile || user?.avatar_url) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="btn btn-secondary" style={{ fontSize: '0.82rem', borderRadius: 10 }}>
                  {user?.avatar_url ? 'Change Photo' : 'Choose Photo'}
                </button>
                {avatarFile && (
                  <SaveButton loading={avatarUploading} type="button" onClick={handleAvatarUpload}>Upload Photo</SaveButton>
                )}
              </div>
            )}
            {avatarError   && <div className="alert alert-error"   style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}>{avatarError}</div>}
            {avatarSuccess && <div className="alert alert-success" style={{ padding: '9px 14px', marginTop: 12, fontSize: '0.82rem' }}><IcoCheck /> Profile photo updated!</div>}
          </SettingsCard>

          {/* Personal info */}
          <SettingsCard icon={<IcoUser />} title="Personal Information" subtitle="Update your display name">
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <FormField label="First Name" description="Your given name shown to teammates">
                  <StyledInput value={profileForm.first_name} onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                </FormField>
                <FormField label="Last Name" description="Your family name shown to teammates">
                  <StyledInput value={profileForm.last_name} onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                </FormField>
              </div>
              <FormField label="Email Address" description="Email cannot be changed after account creation.">
                <StyledInput value={user?.email ?? ''} disabled placeholder="Email address" />
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

      {/* ── Security Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SettingsCard icon={<IcoLock />} title="Change Password" subtitle="Choose a strong, unique password">
            <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <FormField label="New Password" description="Must be at least 8 characters long">
                <StyledInput type={showPw ? 'text' : 'password'} value={pwForm.new_password}
                  onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Minimum 8 characters"
                  rightSlot={
                    <button type="button" onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}>
                      <IcoEye off={showPw} />
                    </button>
                  }
                />
              </FormField>
              <FormField label="Confirm New Password" description="Repeat the password to confirm">
                <StyledInput type={showPw ? 'text' : 'password'} value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
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
                        {ok
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
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
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'var(--success-subtle)', border: '1.5px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <IcoMonitor />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Current Browser Session</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Logged in as {user?.role} · {user?.email}</div>
              </div>
              <span style={{ padding: '3px 11px', borderRadius: 99, background: 'var(--success-subtle)', border: '1px solid var(--success-border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Active
              </span>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* ── Appearance Tab ───────────────────────────────────────────────── */}
      {activeTab === 'appearance' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SettingsCard icon={<IcoPalette />} title="Theme" subtitle="Choose your preferred colour scheme">
            <div style={{ display: 'flex', gap: 16 }}>
              <ThemeCard value="light" label="Light Mode" description="Clean and bright" current={theme}
                onClick={() => theme === 'dark' && toggleTheme()}
                preview={{ bg: '#F4F6FA', border: '#E2E8F0', bar: '#0F172A', line: '#94A3B8', card: '#FFFFFF' }} />
              <ThemeCard value="dark" label="Dark Mode" description="Easy on the eyes" current={theme}
                onClick={() => theme === 'light' && toggleTheme()}
                preview={{ bg: '#0D1117', border: '#2D3748', bar: '#F1F5F9', line: '#64748B', card: '#161B27' }} />
            </div>
          </SettingsCard>

          <SettingsCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
            title="Interface Density" subtitle="Adjust content spacing"
          >
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

      {/* ── Academy Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'academy' && (
        <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SettingsCard icon={<IcoBldg />} title="Academy Information" subtitle="Your academy connection details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Academy ID"     value={user?.academy_id}  mono copyable onCopy={copyAcademyId} copied={copied} />
              <InfoRow label="Your Role"      value={meta.label} />
              <InfoRow label="Account Status" value="Active" />
              <InfoRow label="Member Since"   value={
                (user as typeof user & { created_at?: string })?.created_at
                  ? new Date((user as typeof user & { created_at?: string }).created_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'
              } />
            </div>
          </SettingsCard>

          <SettingsCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            title="Platform Version" subtitle="SAMS build info"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Version"     value="SAMS v1.0" />
              <InfoRow label="Environment" value={process.env.NODE_ENV ?? 'development'} mono />
            </div>
          </SettingsCard>
        </div>
      )}
    </div>
  );
}
