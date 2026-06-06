import { apiClient } from './client';

export interface AttendanceSession {
  id: string;
  title: string;
  date: string;
  team_id: string;
}

export interface AttendanceRecord {
  player_id: string;
  player: { first_name: string; last_name: string };
  status: 'present' | 'absent' | 'late';
}

export async function getSessions(): Promise<AttendanceSession[]> {
  const res = (await apiClient.get('/attendance/sessions')) as {
    success: boolean;
    data: AttendanceSession[];
  };
  return res.data;
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
  const res = (await apiClient.get(`/attendance/sessions/${sessionId}`)) as {
    success: boolean;
    data: AttendanceRecord[];
  };
  return res.data;
}

export async function markAttendance(
  sessionId: string,
  playerId: string,
  status: 'present' | 'absent' | 'late'
): Promise<void> {
  await apiClient.post(`/attendance/sessions/${sessionId}`, { player_id: playerId, status });
}
