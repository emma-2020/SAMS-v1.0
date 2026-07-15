'use client';

import { useState, useEffect } from 'react';
import { announcementsApi } from '@sams/api';
import type { Announcement } from '@sams/api';

type Audience = 'everyone' | 'players' | 'coaches' | 'parents';

const AUDIENCE_ICON: Record<Audience, string> = {
  everyone: '📢',
  players:  '⚽',
  coaches:  '🎽',
  parents:  '👨‍👩‍👧',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function AnnouncementsBanner({ role }: { role?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    announcementsApi.getAnnouncements()
      .then(all => {
        // Admin's GET returns all — apply 24h filter here for the banner.
        // Non-admin: server already filtered to 24h, this is a no-op.
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        setAnnouncements(all.filter(a => new Date(a.created_at).getTime() >= cutoff));
      })
      .catch(() => {});
  }, []);

  if (!announcements.length) return null;

  const isAdmin = role === 'Admin';

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>📢</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Announcements</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-light)' }}>
            {announcements.length}
          </span>
        </div>
        {isAdmin && (
          <a href="/dashboard/admin/announcements" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
            Manage →
          </a>
        )}
      </div>

      {/* Scrollable cards */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {announcements.map(ann => {
          const audience = (ann.audience || 'everyone') as Audience;
          return (
            <div key={ann.id}
              style={{ flexShrink: 0, width: 280, background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)', borderRadius: 14, padding: '14px 16px', borderLeft: '4px solid var(--accent)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem' }}>{AUDIENCE_ICON[audience]}</span>
                <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ann.title}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {ann.body}
              </p>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {ann.author && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--role-admin)', fontWeight: 600 }}>
                    {ann.author.first_name} {ann.author.last_name}
                  </span>
                )}
                <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmtDate(ann.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
