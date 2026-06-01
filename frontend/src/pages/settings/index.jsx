// src/pages/settings/index.jsx
import { useState } from 'react';
import { useSubmit }    from '../../hooks/useApi';
import useAuthStore     from '../../store/authStore';
import { PageHeader }   from '../../components/shared/ui';
import api              from '../../services/api';

// ─── Icons ───────────────────────────────────────────────────────
const IcoUser  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoLock  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoBldg  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoEye   = ({ off }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">{off ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>;
const IcoCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoCopy  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

const ROLE_META = {
  Admin:  { color: 'var(--role-admin)',  label: 'Administrator' },
  Coach:  { color: 'var(--role-coach)',  label: 'Head Coach'    },
  Player: { color: 'var(--role-player)', label: 'Player'        },
  Parent: { color: 'var(--role-parent)', label: 'Parent'        },
};

// ─── Section wrapper ─────────────────────────────────────────────

function SettingsSection({ icon, title, subtitle, children }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      marginBottom: 20,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 24px',
        background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
          background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          {icon}
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--text-primary)',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: '24px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Profile Card ────────────────────────────────────────────────

function ProfileCard({ user, meta }) {
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '20px 24px',
      background: `linear-gradient(135deg, ${meta.color}10 0%, var(--bg-surface) 100%)`,
      border: `1px solid ${meta.color}25`,
      borderRadius: 'var(--radius-lg)',
      marginBottom: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
        background: `${meta.color}20`,
        border: `2.5px solid ${meta.color}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 20px ${meta.color}20`,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.3rem', color: meta.color, letterSpacing: '0.04em',
        }}>
          {initials}
        </span>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.4rem', color: 'var(--text-primary)',
          lineHeight: 1.1,
        }}>
          {user?.first_name} {user?.last_name}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {user?.email}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 8, padding: '3px 10px', borderRadius: 99,
          background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: meta.color, boxShadow: `0 0 5px ${meta.color}`,
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.7rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: meta.color,
          }}>
            {meta.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const meta = ROLE_META[user?.role] || { color: 'var(--accent)', label: user?.role };

  // ── Profile form ──────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
  });
  const [profileSuccess, setProfileSuccess] = useState(false);
  const { submit: submitProfile, loading: savingProfile, error: profileError } = useSubmit(
    () => api.patch('/auth/me', profileForm).then(r => r.data.data.profile)
  );

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileSuccess(false);
    const res = await submitProfile();
    if (res.ok) {
      setUser({ ...user, first_name: profileForm.first_name, last_name: profileForm.last_name });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  }

  // ── Password form ─────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');
  const { submit: submitPw, loading: savingPw } = useSubmit(
    () => api.post('/auth/change-password', { new_password: pwForm.new_password }).then(r => r.data)
  );

  async function handlePwSave(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (pwForm.new_password.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('Passwords do not match.');
      return;
    }
    const res = await submitPw();
    if (res.ok) {
      setPwSuccess(true);
      setPwForm({ new_password: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 4000);
    }
  }

  // ── Copy academy ID ───────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  function copyAcademyId() {
    navigator.clipboard.writeText(user?.academy_id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 680 }}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your profile and account preferences"
        roleColor={meta.color}
      />

      {/* Profile card */}
      <ProfileCard user={user} meta={meta} />

      {/* Personal Information */}
      <SettingsSection icon={<IcoUser />} title="Personal Information" subtitle="Update your display name">
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label className="field-label">First Name</label>
              <input
                className="field-input"
                value={profileForm.first_name}
                onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div className="field">
              <label className="field-label">Last Name</label>
              <input
                className="field-input"
                value={profileForm.last_name}
                onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Email Address</label>
            <input
              className="field-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <span className="field-hint">Email cannot be changed after account creation.</span>
          </div>

          {profileError && (
            <div className="alert alert-error" style={{ padding: '10px 14px' }}>
              <span style={{ fontSize: '0.85rem' }}>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="alert alert-success" style={{ padding: '10px 14px' }}>
              <IcoCheck />
              <span style={{ fontSize: '0.85rem' }}>Profile updated successfully.</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className={`btn btn-primary${savingProfile ? ' btn-loading' : ''}`}
              disabled={savingProfile}
            >
              {!savingProfile && 'Save Changes'}
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* Change Password */}
      <SettingsSection icon={<IcoLock />} title="Change Password" subtitle="Choose a strong password">
        <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label className="field-label">New Password</label>
            <div className="input-wrapper">
              <input
                className="field-input"
                type={showPw ? 'text' : 'password'}
                value={pwForm.new_password}
                onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                placeholder="Minimum 8 characters"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPw(p => !p)}
              >
                <IcoEye off={showPw} />
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Confirm New Password</label>
            <input
              className="field-input"
              type={showPw ? 'text' : 'password'}
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password"
            />
          </div>

          {(pwError) && (
            <div className="alert alert-error" style={{ padding: '10px 14px' }}>
              <span style={{ fontSize: '0.85rem' }}>{pwError}</span>
            </div>
          )}
          {pwSuccess && (
            <div className="alert alert-success" style={{ padding: '10px 14px' }}>
              <IcoCheck />
              <span style={{ fontSize: '0.85rem' }}>Password changed successfully.</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className={`btn btn-primary${savingPw ? ' btn-loading' : ''}`}
              disabled={savingPw || !pwForm.new_password}
            >
              {!savingPw && 'Update Password'}
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* Academy Info */}
      <SettingsSection icon={<IcoBldg />} title="Academy Information" subtitle="Your academy connection details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Academy ID', value: user?.academy_id, mono: true, copyable: true },
            { label: 'Your Role',  value: meta.label },
            { label: 'Account Status', value: 'Active' },
          ].map(({ label, value, mono, copyable }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginBottom: 3,
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
                  fontSize: mono ? '0.82rem' : '0.9rem',
                  color: 'var(--text-primary)', fontWeight: 500,
                }}>
                  {value}
                </div>
              </div>
              {copyable && (
                <button
                  onClick={copyAcademyId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: copied ? 'var(--success-subtle)' : 'var(--bg-overlay)',
                    border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '5px 12px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    color: copied ? 'var(--success)' : 'var(--text-secondary)',
                    fontSize: '0.75rem', fontFamily: 'var(--font-display)',
                    fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}
                >
                  {copied ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}
                </button>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
