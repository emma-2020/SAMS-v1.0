import { apiClient } from './client';

export interface Meeting {
  id: string;
  title: string;
  agenda?: string;
  scheduled_at: string;
  duration_minutes: number;
  daily_room_url: string;
  daily_room_name: string;
  status: string;
  created_by: string;
  academy_id: string;
  users?: { first_name: string; last_name: string };
  meeting_attendees?: Array<{ user_id: string; status: string; users?: { first_name: string; last_name: string; role: string } }>;
}

export interface CallSession {
  id: string;
  status: 'ringing' | 'active' | 'ended' | 'missed';
  daily_room_url: string;
  caller_id: string;
  recipient_id?: string;
  team_id?: string;
  created_at: string;
  ended_at?: string;
  users?: { first_name: string; last_name: string; role: string };
}

export interface AcademyMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export async function getMeetings(): Promise<Meeting[]> {
  const res = (await apiClient.get('/meetings')) as { data: Meeting[] };
  return res.data ?? [];
}

export async function createMeeting(payload: {
  title: string;
  agenda?: string;
  scheduledAt: string;
  durationMinutes: number;
  attendeeIds: string[];
}): Promise<Meeting> {
  const res = (await apiClient.post('/meetings', payload)) as { data: Meeting };
  return res.data;
}

export async function cancelMeeting(meetingId: string): Promise<void> {
  await apiClient.delete(`/meetings/${meetingId}`);
}

export async function getMembers(): Promise<AcademyMember[]> {
  const res = (await apiClient.get('/meetings/members')) as { data: AcademyMember[] };
  return res.data ?? [];
}

export async function startCall(payload: { teamId?: string; recipientId?: string }): Promise<CallSession> {
  const res = (await apiClient.post('/meetings/calls/start', payload)) as { data: CallSession };
  return res.data;
}

export async function getPendingCalls(): Promise<CallSession[]> {
  const res = (await apiClient.get('/meetings/calls/pending')) as { data: CallSession[] };
  return res.data ?? [];
}

export async function updateCallStatus(sessionId: string, status: string): Promise<CallSession> {
  const res = (await apiClient.patch(`/meetings/calls/${sessionId}/status`, { status })) as { data: CallSession };
  return res.data;
}
