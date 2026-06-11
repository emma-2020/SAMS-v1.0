'use client';

import { useEffect, useState } from 'react';
import { platformApi } from '@sams/api';
import type { PlatformAcademy } from '@sams/api';

const NAVY = '#0D1B3E';

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

  const filtered = academies.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = academies.filter(a => a.is_active).length;
  const inactiveCount = academies.length - activeCount;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: NAVY, margin: 0, letterSpacing: -0.5 }}>
          Academies
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 4 }}>
          All provisioned tenant academies on the SAMS platform.
        </p>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total',    value: academies.length, bg: '#EFF6FF', color: '#2563EB' },
            { label: 'Active',   value: activeCount,      bg: '#ECFDF5', color: '#059669' },
            { label: 'Inactive', value: inactiveCount,    bg: '#F3F4F6', color: '#6B7280' },
          ].map(pill => (
            <div key={pill.label} style={{
              padding: '6px 16px', borderRadius: 99,
              background: pill.bg, color: pill.color,
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              {pill.value} {pill.label}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search academies…"
          style={{
            width: 280, padding: '9px 14px', borderRadius: 10,
            border: '1.5px solid #E5E7EB', fontSize: '0.875rem',
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e  => { e.target.style.borderColor = NAVY; }}
          onBlur={e   => { e.target.style.borderColor = '#E5E7EB'; }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #F1F5F9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 1fr',
          padding: '10px 24px', background: '#F8FAFC',
          borderBottom: '1px solid #F1F5F9',
        }}>
          {['ACADEMY NAME', 'MEMBERS', 'STATUS', 'PROVISIONED', 'ACADEMY ID'].map(h => (
            <span key={h} style={{
              fontSize: '0.62rem', fontWeight: 800,
              letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase',
            }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '28px 24px', color: '#94A3B8', fontSize: '0.875rem' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            {search ? (
              <>
                <p style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                  No academies match "{search}"
                </p>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 4 }}>
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🏫</div>
                <p style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                  No academies yet
                </p>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 4 }}>
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
                padding: '15px 24px', borderBottom: '1px solid #F1F5F9',
                alignItems: 'center', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Academy name + avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: NAVY, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 900, flexShrink: 0,
                  letterSpacing: -0.5,
                }}>
                  {academy.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, margin: 0 }}>
                    {academy.name}
                  </p>
                </div>
              </div>

              {/* Members */}
              <p style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600, margin: 0 }}>
                {academy.member_count}
              </p>

              {/* Status */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                fontSize: '0.72rem', fontWeight: 700,
                background: academy.is_active ? '#ECFDF5' : '#F3F4F6',
                color:      academy.is_active ? '#059669' : '#6B7280',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: academy.is_active ? '#059669' : '#9CA3AF',
                  display: 'inline-block',
                }} />
                {academy.is_active ? 'Active' : 'Inactive'}
              </span>

              {/* Date */}
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
                {new Date(academy.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>

              {/* ID */}
              <p style={{
                fontSize: '0.7rem', color: '#CBD5E1', margin: 0,
                fontFamily: 'monospace', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
