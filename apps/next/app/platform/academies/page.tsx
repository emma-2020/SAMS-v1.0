'use client';

import { useEffect, useState } from 'react';
import { platformApi } from '@sams/api';
import type { PlatformAcademy } from '@sams/api';

const DARK_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7C3AED, #EC4899)',
  'linear-gradient(135deg, #2563EB, #7C3AED)',
  'linear-gradient(135deg, #059669, #2563EB)',
  'linear-gradient(135deg, #D97706, #EF4444)',
  'linear-gradient(135deg, #7C3AED, #2563EB)',
];

function avatarGradient(name: string): string {
  const i = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[i];
}

interface DeleteModal {
  academy: PlatformAcademy;
  input: string;
}

export default function AcademiesPage() {
  const [academies,    setAcademies]    = useState<PlatformAcademy[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null); // academyId being acted on
  const [deleteModal,  setDeleteModal]  = useState<DeleteModal | null>(null);
  const [toast,        setToast]        = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    platformApi.getPlatformAcademies()
      .then(setAcademies)
      .catch(() => setAcademies([]))
      .finally(() => setLoading(false));
  }, []);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleToggleStatus(academy: PlatformAcademy) {
    const next = !academy.is_active;
    const verb = next ? 'activate' : 'deactivate';
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} "${academy.name}"?`)) return;

    setActionLoading(academy.id);
    try {
      const updated = await platformApi.setAcademyStatus(academy.id, next);
      setAcademies(prev => prev.map(a => a.id === academy.id ? { ...a, is_active: updated.is_active } : a));
      showToast('success', `"${academy.name}" ${next ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      showToast('error', err?.message || `Failed to ${verb} academy.`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteModal) return;
    const { academy } = deleteModal;

    setActionLoading(academy.id);
    try {
      await platformApi.deleteAcademy(academy.id);
      setAcademies(prev => prev.filter(a => a.id !== academy.id));
      setDeleteModal(null);
      showToast('success', `"${academy.name}" and all its data have been permanently deleted.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete academy.');
      setDeleteModal(null);
    } finally {
      setActionLoading(null);
    }
  }

  const filtered      = academies.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount   = academies.filter(a => a.is_active).length;
  const inactiveCount = academies.length - activeCount;

  const COL = '2fr 0.8fr 0.9fr 1.1fr 0.9fr 1.3fr';

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 1000,
          padding: '14px 20px', borderRadius: 12,
          background: toast.type === 'success' ? '#052E16' : '#2D0A0A',
          border: `1px solid ${toast.type === 'success' ? '#166534' : '#7F1D1D'}`,
          color: toast.type === 'success' ? '#4ADE80' : '#FCA5A5',
          fontSize: '0.875rem', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxWidth: 440,
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#0F172A', borderRadius: 20,
            border: '1px solid rgba(239,68,68,0.25)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            padding: '32px 36px', maxWidth: 480, width: '100%',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', marginBottom: 18,
            }}>🗑️</div>

            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 10px' }}>
              Delete "{deleteModal.academy.name}"?
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: '0 0 20px' }}>
              This will <strong style={{ color: '#EF4444' }}>permanently delete</strong> the academy and all
              associated data — members, teams, schedules, health logs, and chat. This cannot be undone.
            </p>

            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Type the academy name to confirm
            </label>
            <input
              autoFocus
              value={deleteModal.input}
              onChange={e => setDeleteModal(m => m ? { ...m, input: e.target.value } : m)}
              placeholder={deleteModal.academy.name}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(239,68,68,0.3)',
                color: '#F1F5F9', fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box', marginBottom: 20,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteModal.input !== deleteModal.academy.name || actionLoading === deleteModal.academy.id}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                  background: deleteModal.input === deleteModal.academy.name ? '#EF4444' : 'rgba(239,68,68,0.2)',
                  color: deleteModal.input === deleteModal.academy.name ? '#fff' : 'rgba(239,68,68,0.4)',
                  fontSize: '0.9rem', fontWeight: 700,
                  cursor: deleteModal.input === deleteModal.academy.name ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                {actionLoading === deleteModal.academy.id ? 'Deleting…' : 'Delete Permanently'}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                disabled={!!actionLoading}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#F1F5F9', margin: 0, letterSpacing: -0.8 }}>
          Academies
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', marginTop: 5 }}>
          All provisioned tenant academies on the SAMS platform.
        </p>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div style={{ display: 'flex', gap: 9, marginBottom: 22 }}>
          {[
            {
              label: 'Total',    value: academies.length,
              bg: 'rgba(99,102,241,0.1)',    color: '#818CF8',
              border: 'rgba(99,102,241,0.2)',
            },
            {
              label: 'Active',   value: activeCount,
              bg: 'rgba(16,185,129,0.1)',   color: '#34D399',
              border: 'rgba(16,185,129,0.2)',
            },
            {
              label: 'Inactive', value: inactiveCount,
              bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)',
              border: 'rgba(255,255,255,0.1)',
            },
          ].map(pill => (
            <div key={pill.label} style={{
              padding: '6px 16px', borderRadius: 99,
              background: pill.bg, color: pill.color,
              border: `1px solid ${pill.border}`,
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              {pill.value} {pill.label}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 18 }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search academies…"
          style={{
            width: 300, padding: '10px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: '#F1F5F9', fontSize: '0.875rem',
            outline: 'none', boxSizing: 'border-box',
            transition: 'all 0.2s',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'rgba(124,58,237,0.6)';
            e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)';
          }}
          onBlur={e => {
            e.target.style.borderColor = 'rgba(255,255,255,0.09)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Table */}
      <div style={{ ...DARK_CARD, padding: 0, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: COL,
          padding: '11px 26px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {['ACADEMY NAME', 'MEMBERS', 'STATUS', 'PROVISIONED', 'ACADEMY ID', 'ACTIONS'].map(h => (
            <span key={h} style={{
              fontSize: '0.6rem', fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.28)',
              textTransform: 'uppercase',
            }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '28px 26px', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 26px', textAlign: 'center' }}>
            {search ? (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', margin: '0 auto 14px',
                }}>🔍</div>
                <p style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.9rem', margin: 0 }}>
                  No match for "{search}"
                </p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', marginTop: 6 }}>
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <div style={{
                  width: 60, height: 60, borderRadius: 18,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', margin: '0 auto 14px',
                  boxShadow: '0 0 24px rgba(124,58,237,0.12)',
                }}>🏫</div>
                <p style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.9rem', margin: 0 }}>
                  No academies yet
                </p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', marginTop: 6 }}>
                  Approve enrollment requests to provision the first academy.
                </p>
              </>
            )}
          </div>
        ) : (
          filtered.map(academy => {
            const busy = actionLoading === academy.id;
            return (
              <div
                key={academy.id}
                style={{
                  display: 'grid', gridTemplateColumns: COL,
                  padding: '15px 26px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  transition: 'background 0.12s',
                  opacity: busy ? 0.6 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                {/* Academy name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: avatarGradient(academy.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.8rem', fontWeight: 900,
                    flexShrink: 0, letterSpacing: -0.3,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    filter: academy.is_active ? 'none' : 'grayscale(1) opacity(0.5)',
                  }}>
                    {academy.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: academy.is_active ? '#F1F5F9' : 'rgba(255,255,255,0.35)', margin: 0 }}>
                    {academy.name}
                  </p>
                </div>

                {/* Members */}
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, margin: 0 }}>
                  {academy.member_count}
                </p>

                {/* Status pill */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 99,
                  fontSize: '0.72rem', fontWeight: 700,
                  background: academy.is_active ? 'rgba(16,185,129,0.12)'  : 'rgba(255,255,255,0.05)',
                  color:      academy.is_active ? '#34D399'                 : 'rgba(255,255,255,0.4)',
                  border:     academy.is_active ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow:  academy.is_active ? '0 0 10px rgba(16,185,129,0.2)'   : 'none',
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: academy.is_active ? '#34D399' : 'rgba(255,255,255,0.3)',
                    display: 'inline-block',
                    boxShadow: academy.is_active ? '0 0 5px #34D399' : 'none',
                  }} />
                  {academy.is_active ? 'Active' : 'Inactive'}
                </span>

                {/* Date */}
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', margin: 0 }}>
                  {new Date(academy.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>

                {/* ID */}
                <p style={{
                  fontSize: '0.68rem', color: 'rgba(255,255,255,0.22)', margin: 0,
                  fontFamily: 'monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {academy.id.slice(0, 8)}…
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {/* Deactivate / Activate toggle */}
                  <button
                    onClick={() => handleToggleStatus(academy)}
                    disabled={busy}
                    title={academy.is_active ? 'Deactivate academy' : 'Activate academy'}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      border: academy.is_active
                        ? '1px solid rgba(251,191,36,0.3)'
                        : '1px solid rgba(52,211,153,0.3)',
                      background: academy.is_active
                        ? 'rgba(251,191,36,0.08)'
                        : 'rgba(52,211,153,0.08)',
                      color: academy.is_active ? '#FCD34D' : '#34D399',
                      fontSize: '0.72rem', fontWeight: 700,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {busy ? '…' : academy.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteModal({ academy, input: '' })}
                    disabled={busy}
                    title="Permanently delete academy"
                    style={{
                      padding: '5px 10px', borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.07)',
                      color: '#EF4444',
                      fontSize: '0.72rem', fontWeight: 700,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
