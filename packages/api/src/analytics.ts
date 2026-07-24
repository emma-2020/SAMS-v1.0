import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeeKpis {
  totalCollected: number;
  totalOwed:      number;
  outstanding:    number;
  collectionRate: number;
  overdueCount:   number;
  sparkline:      { v: number }[];
}

export interface FeeAnalytics {
  kpis:            FeeKpis;
  monthlyTrend:    { month: string; collected: number; owed: number; outstanding: number }[];
  methodBreakdown: { name: string; value: number }[];
  topOutstanding:  { id: string; name: string; balance: number }[];
  recentPayments:  { player: string; amount: number; method: string; date: string; status: string }[];
}

export interface AttendanceKpis {
  totalSessions:  number;
  avgRate:        number;
  perfectCount:   number;
  belowThreshold: number;
  gfaEligible:    number;
  gfaAtRisk:      number;
}

export interface AttendanceAnalytics {
  kpis:              AttendanceKpis;
  monthlyTrend:      { month: string; present: number; absent: number; injured: number; rate: number }[];
  playerRates:       { id: string; name: string; present: number; absent: number; injured: number; total: number; rate: number; gfaEligible: boolean | null }[];
  squadAvailability: { name: string; value: number; color: string }[];
}

export interface WellnessKpis {
  squadAvg:    number;
  fullyFit:    number;
  moderate:    number;
  highRisk:    number;
  totalAlerts: number;
}

export interface WellnessAnalytics {
  kpis:              WellnessKpis;
  wellnessTrend:     { date: string; avg: number }[];
  squadAvailability: { name: string; value: number; color: string }[];
  playerRanking:     { id: string; name: string; value: number; color: string; alerts: number }[];
}

export interface MyWellnessAnalytics {
  kpis: {
    latestScore: number;
    avgScore:    number;
    totalLogs:   number;
    sparkline:   { v: number }[];
  };
  trend:      { date: string; score: number; energy: number; sleep: number; recovery: number }[];
  recentLogs: {
    date:     string;
    score:    number;
    fatigue:  number;
    soreness: number;
    sleep:    number;
    notes:    string | null;
  }[];
  heatmap: Record<string, number>;
}

export interface MyAttendanceAnalytics {
  kpis: {
    rate:         number;
    present:      number;
    absent:       number;
    injured:      number;
    total:        number;
    gfaEligible: boolean | null;
  };
  monthlyTrend: { month: string; present: number; absent: number; injured: number; rate: number }[];
  breakdown:    { name: string; value: number; color: string }[];
}

export interface ParentAnalytics {
  linked: boolean;
  child:  { id: string; name: string; team: string } | null;
  attendance: { rate: number; present: number; total: number; gfaEligible: boolean | null } | null;
  wellness: {
    latestScore: number; avgScore: number; totalLogs: number; flagCount: number;
    trend: { date: string; score: number }[];
  } | null;
  fees: {
    totalOwed: number; totalPaid: number; outstanding: number; collectionRate: number;
    recentPayments: { description: string; amount: number; paid: number; method: string | null; date: string; status: string }[];
  } | null;
}

export interface WorkoutAnalytics {
  kpis: { totalAssigned: number; totalExercises: number; totalDone: number; overallRate: number; activeThisMonth: number };
  volumeTrend:        { month: string; assigned: number; exerciseCount: number }[];
  playerRanking:      { id: string; name: string; total: number; done: number; rate: number }[];
  recentAssignments:  { title: string; team: string; dueDate: string | null; exercises: number; rate: number }[];
}

export interface TeamComparison {
  teams: { id: string; name: string; division: string; sport: string; squad: number; attRate: number; wellness: number; feeRate: number }[];
}

export interface PlayerDetail {
  id:         string;
  name:       string;
  avatar_url: string | null;
  attendance: { rate: number; present: number; total: number; gfaEligible: boolean | null } | null;
  wellness:   { latestScore: number; avgScore: number; totalLogs: number; flagCount: number; trend: { date: string; score: number }[] } | null;
  workouts:   { total: number; done: number; rate: number };
}

export interface AnalyticsSummary {
  outstandingFees:  number;
  collectionRate:   number;
  wellnessFlags:    number;
  flaggedPlayers:   number;
  totalPlayers:     number;
  recentEvents:     number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export interface FeeAnalyticsParams {
  startDate?: string;
  endDate?:   string;
}

export async function getFeeAnalytics(params?: FeeAnalyticsParams): Promise<FeeAnalytics> {
  const qs = params
    ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null) as [string,string][]))}`
    : '';
  const res = (await apiClient.get(`/analytics/fees${qs}`)) as { success: boolean; data: FeeAnalytics };
  return res.data;
}

export async function getAttendanceAnalytics(): Promise<AttendanceAnalytics> {
  const res = (await apiClient.get('/analytics/attendance')) as { success: boolean; data: AttendanceAnalytics };
  return res.data;
}

export async function getWellnessAnalytics(days = 30): Promise<WellnessAnalytics> {
  const res = (await apiClient.get(`/analytics/wellness?days=${days}`)) as { success: boolean; data: WellnessAnalytics };
  return res.data;
}

export async function getMyWellnessAnalytics(days = 60): Promise<MyWellnessAnalytics> {
  const res = (await apiClient.get(`/analytics/wellness/me?days=${days}`)) as { success: boolean; data: MyWellnessAnalytics };
  return res.data;
}

export async function getMyAttendanceAnalytics(): Promise<MyAttendanceAnalytics> {
  const res = (await apiClient.get('/analytics/attendance/me')) as { success: boolean; data: MyAttendanceAnalytics };
  return res.data;
}

export async function getParentAnalytics(): Promise<ParentAnalytics> {
  const res = (await apiClient.get('/analytics/parent')) as { success: boolean; data: ParentAnalytics };
  return res.data;
}

export async function getWorkoutAnalytics(): Promise<WorkoutAnalytics> {
  const res = (await apiClient.get('/analytics/workouts')) as { success: boolean; data: WorkoutAnalytics };
  return res.data;
}

export async function getTeamComparison(): Promise<TeamComparison> {
  const res = (await apiClient.get('/analytics/teams')) as { success: boolean; data: TeamComparison };
  return res.data;
}

export async function getPlayerDetail(playerId: string): Promise<PlayerDetail> {
  const res = (await apiClient.get(`/analytics/player/${playerId}`)) as { success: boolean; data: PlayerDetail };
  return res.data;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = (await apiClient.get('/analytics/summary')) as { success: boolean; data: AnalyticsSummary };
  return res.data;
}
