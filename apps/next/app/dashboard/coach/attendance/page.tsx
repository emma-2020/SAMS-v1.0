'use client';

import { useEffect, useState } from 'react';
import { attendanceApi } from '@sams/api';
import type { AttendanceSession } from '@sams/api';
import { SplitPaneAttendance } from '@sams/ui';

export default function AttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attendanceApi.getSessions().then(setSessions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading sessions…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: 'calc(100vh - 140px)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Attendance</h1>
      {sessions.length === 0
        ? <div style={{ color: 'var(--text-muted)' }}>No training sessions found.</div>
        : (
          <SplitPaneAttendance
            sessions={sessions}
            getAttendance={attendanceApi.getSessionAttendance}
            onMark={attendanceApi.markAttendance}
          />
        )
      }
    </div>
  );
}
