export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface UserProfile {
  id: string;
  academy_id: string;
  email: string;
  role: 'Admin' | 'Coach' | 'Player' | 'Parent';
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Notification {
  id: string;
  type: 'schedule' | 'health_flag' | 'workout' | 'chat' | 'invite' | 'system';
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

export interface Team {
  id: string;
  name: string;
  sport?: string;
  division?: string;
  is_active: boolean;
  coach_id?: string;
  coach?: TeamMember;
  users?: TeamMember;
  member_count?: number;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  latest_health?: HealthEntry | null;
}

export interface HealthEntry {
  id: string;
  player_id: string;
  energy: number;
  sleep: number;
  muscle_soreness: number;
  stress: number;
  overall_score: number;
  notes?: string;
  submitted_at: string;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  description?: string;
  sport?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  exercises: Exercise[];
  created_at: string;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  notes?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type: 'training' | 'match' | 'meeting' | 'other';
  location?: string;
}

export interface ChatMessage {
  id: string;
  team_id: string;
  sender_id: string;
  sender?: TeamMember;
  body: string;
  created_at: string;
}

export interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  accepted_at?: string | null;
}
