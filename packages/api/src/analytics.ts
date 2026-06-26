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
  topOutstanding:  { name: string; balance: number }[];
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
  monthlyTrend:      { month: string; present: number; absent: number; late: number; rate: number }[];
  playerRates:       { name: string; present: number; absent: number; late: number; total: number; rate: number; gfaEligible: boolean | null }[];
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
  playerRanking:     { name: string; value: number; color: string; alerts: number }[];
}

export interface MyWellnessAnalytics {
  kpis: {
    latestScore: number;
    avgScore:    number;
    totalLogs:   number;
    sparkline:   { v: number }[];
  };
  trend:      { date: string; score: number }[];
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

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getFeeAnalytics(): Promise<FeeAnalytics> {
  const res = (await apiClient.get('/analytics/fees')) as { success: boolean; data: FeeAnalytics };
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
