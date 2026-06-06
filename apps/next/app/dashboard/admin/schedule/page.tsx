'use client';

import { useEffect, useState } from 'react';
import { scheduleApi } from '@sams/api';
import type { ScheduleEvent } from '@sams/api';

export default function AdminSchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => { scheduleApi.getEvents().then(setEvents).catch(() => {}); }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>
        Resource Calendar
      </h1>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {events.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No events scheduled yet.</p>
            : events.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 4, height: 44, borderRadius: 2, background: '#6366F1', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{e.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(e.start_time).toLocaleString()} — {new Date(e.end_time).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#6366F110', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.5 }}>{e.type}</div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
