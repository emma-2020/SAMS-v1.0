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

export default function AcademiesPage() {
  const [academies, setAcademies] = useState<PlatformAcademy[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    platformApi.getPlatformAcademies()
      .then(setAcademies)
      .catch(() => setAcademies([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered      = academies.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount   = academies.filter(a => a.is_active).length;
  const inactiveCount = academies.length - activeCount;

  return (
    <div>
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
          display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 1fr',
          padding: '11px 26px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {['ACADEMY NAME', 'MEMBERS', 'STATUS', 'PROVISIONED', 'ACADEMY ID'].map(h => (
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
          filtered.map(academy => (
            <div
              key={academy.id}
              style={{
                display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 1fr',
                padding: '15px 26px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'center',
                transition: 'background 0.12s',
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
                }}>
                  {academy.name.slice(0, 2).toUpperCase()}
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
