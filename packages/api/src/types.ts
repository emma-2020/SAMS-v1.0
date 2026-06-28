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
  academy_name?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  availability_status?: 'Available' | 'Injured' | 'Suspended' | 'Resting';
}

export interface FeeLedgerEntry {
  id: string;
  description: string;
  amount_owed: number;
  amount_paid: number;
  payment_method?: 'Cash' | 'MoMo' | 'Bank' | 'Online' | 'Other' | null;
  payment_date?: string | null;
  notes?: string | null;
  paystack_reference?: string | null;
  payment_url?: string | null;
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
  audience: 'everyone' | 'players' | 'coaches' | 'parents';
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
  notes?: string | null;
  submitted_at: string;
  is_flagged?: boolean;
  users?: { id?: string; first_name: string; last_name: string } | null;
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
  type: 'Practice' | 'Game' | 'Training' | 'Match' | 'Friendly' | 'Recovery' | 'Meeting';
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

export interface NotificationPreferences {
  new_messages?: boolean;
  schedule_changes?: boolean;
  upcoming_sessions?: boolean;
  // Admin
  new_member_joined?: boolean;
  fee_payment_received?: boolean;
  // Coach
  attendance_due?: boolean;
  player_health_alerts?: boolean;
  // Player
  fee_due_reminders?: boolean;
  team_announcements?: boolean;
  // Parent
  child_fee_reminders?: boolean;
  child_health_updates?: boolean;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface UserPreferences {
  notifications?: NotificationPreferences;
  // Coach-specific
  default_session?: {
    duration_minutes?: number;
    location?: string;
  };
  receive_player_health_alerts?: boolean;
  // Player-specific
  health_sharing?: {
    share_with_coaches?: boolean;
    share_with_admin?: boolean;
  };
  emergency_contact?: EmergencyContact;
  // Parent-specific
  fee_reminder_days?: number;
  default_child_id?: string | null;
}

export interface AcademyAdminSettings {
  academy_name: string;
  logo_url: string | null;
  role_permissions: {
    parents_can_view_attendance?: boolean;
    players_can_see_teammate_contacts?: boolean;
    coaches_can_post_announcements?: boolean;
  };
  paystack_configured: boolean;
  paystack_key_preview: string | null;
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

export interface PlayerRegistration {
  id: string;
  academy_id: string;
  player_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';

  // Section 1 — Personal
  date_of_birth: string;
  phone: string;
  address: string;
  nationality?: string | null;

  // Section 2 — Sport
  position: string;
  preferred_foot?: 'Left' | 'Right' | 'Both' | null;
  previous_club?: string | null;
  years_of_experience?: number | null;

  // Section 3 — Emergency contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;

  // Section 4 — Parent/guardian (optional)
  parent_guardian_name?: string | null;
  parent_guardian_phone?: string | null;
  parent_guardian_relationship?: string | null;

  // Section 5 — Medical (optional)
  medical_conditions?: string | null;
  allergies?: string | null;
  blood_group?: string | null;

  // Section 6 — Document paths (storage paths, not URLs)
  birth_certificate_path?: string | null;
  passport_photo_path?: string | null;
  national_id_path?: string | null;
  parent_consent_path?: string | null;

  // Resolved signed URLs (populated by backend on detail view)
  birth_certificate_url?: string | null;
  passport_photo_url?: string | null;
  national_id_url?: string | null;
  parent_consent_url?: string | null;

  // Review
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  reviewer?: { first_name: string; last_name: string } | null;

  // Player info (joined)
  users?: { first_name: string; last_name: string; email: string; avatar_url?: string | null } | null;

  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type RegistrationFormFields = Omit<
  PlayerRegistration,
  | 'id' | 'academy_id' | 'player_id' | 'status'
  | 'reviewed_by' | 'reviewed_at' | 'rejection_reason' | 'reviewer' | 'users'
  | 'submitted_at' | 'created_at' | 'updated_at'
  | 'birth_certificate_url' | 'passport_photo_url' | 'national_id_url' | 'parent_consent_url'
>;
