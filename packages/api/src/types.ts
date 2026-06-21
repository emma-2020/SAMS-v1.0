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
  availability_status?: 'Available' | 'Injured' | 'Suspended' | 'Resting';
}

export interface FeeLedgerEntry {
  id: string;
  description: string;
  amount_owed: number;
  amount_paid: number;
  payment_method?: 'Cash' | 'MoMo' | 'Bank' | 'Other' | null;
  payment_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  player?: { id: string; first_name: string; last_name: string; email: string } | null;
}

export interface PlayerDocument {
  id: string;
  doc_type: 'Birth Certificate' | 'Medical Clearance' | 'GFA Registration' | 'Parent Consent' | 'Other';
  file_name: string;
  file_url: string;
  file_size?: number | null;
  created_at: string;
  player?: { id: string; first_name: string; last_name: string } | null;
  uploader?: { id: string; first_name: string; last_name: string } | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author?: { id: string; first_name: string; last_name: string } | null;
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
  last_seen_at?: string | null;
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
  team_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type: 'Practice' | 'Game';
  location?: string;
}

export interface ChatAttachment {
  url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  team_id?: string | null;
  sender_id: string;
  sender?: TeamMember;
  body: string | null;
  created_at: string;
  attachment_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
}

export type ChatChannelType = 'team' | 'role_group' | 'custom_group' | 'direct';

export interface LastMessagePreview {
  id: string;
  body: string | null;
  sender_name: string;
  created_at: string;
}

export interface ChatChannel {
  id: string;
  academy_id: string;
  name: string;
  description?: string | null;
  type: ChatChannelType;
  team_id?: string | null;
  icon_color?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  last_message?: LastMessagePreview | null;
  other_user?: TeamMember | null;
  is_muted?: boolean;
  muted_until?: string | null;
}

export interface BlockedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  blocked_at: string;
}

export interface ReportedMessage {
  id: string;
  reason: string;
  notes?: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  reviewed_at?: string | null;
  messages: {
    id: string;
    message_text?: string | null;
    attachment_url?: string | null;
    created_at: string;
    users?: { id: string; first_name: string; last_name: string; role: string } | null;
  } | null;
  reporter?: { id: string; first_name: string; last_name: string; role: string } | null;
  reviewer?: { id: string; first_name: string; last_name: string } | null;
}

export interface AcademySettings {
  chat_coach_player_dm?: boolean;
  [key: string]: unknown;
}

export interface UserSearchResult {
  users: TeamMember[];
  academy_allows_coach_player_dm: boolean;
}

export interface ChatChannelMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_admin: boolean;
  joined_at: string;
}

export interface HealthLogEntry {
  id: string;
  fatigue: number;
  soreness: number;
  sleep_quality: number;
  notes?: string | null;
  log_date: string;
  logged_at: string;
  is_flagged: boolean;
}

export interface TeamSummary {
  id: string;
  name: string;
  sport?: string | null;
  division?: string | null;
  is_active: boolean;
  player_count?: number;
}

export interface MemberDetail extends UserProfile {
  teams?: TeamSummary[];
  parent?: { id: string; first_name: string; last_name: string; email: string; is_active: boolean } | null;
  health_logs?: HealthLogEntry[];
  children?: Array<{
    player: { id: string; first_name: string; last_name: string; email: string; is_active: boolean; avatar_url?: string | null };
    teams: Array<{ id: string; name: string; sport?: string | null; division?: string | null }>;
  }>;
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
