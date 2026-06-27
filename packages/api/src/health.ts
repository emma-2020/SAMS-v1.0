import { apiClient } from './client';
import type { HealthEntry } from './types';

interface HealthSubmission {
  energy: number;           // 1 = Exhausted → 5 = Energised
  sleep: number;            // 1 = Terrible  → 5 = Excellent
  muscle_soreness: number;  // 1 = None      → 5 = Very Sore
  stress: number;           // 1 = Calm      → 5 = Stressed
  notes?: string;
}

// Convert a raw DB row (backend field names / scales) → HealthEntry (frontend field names / scales)
function mapRow(d: Record<string, any>): HealthEntry {
  const energy   = 6 - Number(d.fatigue);        // fatigue 1=Energised → energy 5
  const sleep    = 6 - Number(d.sleep_quality);  // sleep_quality 1=Excellent → sleep 5
  const soreness = Number(d.soreness);
  const stress   = d.stress != null ? Number(d.stress) : 3;
  const ePct = Math.round(((energy - 1) / 4) * 100);
  const sPct = Math.round(((sleep - 1) / 4) * 100);
  const rPct = Math.round(((5 - soreness) / 4) * 100);
  return {
    id:              d.id,
    player_id:       d.player_id,
    energy,
    sleep,
    muscle_soreness: soreness,
    stress,
    overall_score:   d.overall_score ?? Math.round((ePct + sPct + rPct) / 3),
    notes:           d.notes ?? null,
    submitted_at:    d.logged_at ?? d.submitted_at,
    is_flagged:      d.is_flagged ?? false,
    users:           d.users ?? null,
  };
}

export async function submitHealth(payload: HealthSubmission): Promise<HealthEntry> {
  // Map Next.js field names/scales → backend field names
  // Backend: fatigue (1=Energised, 5=Exhausted), soreness (1=None, 5=Sore), sleep_quality (1=Excellent, 5=Terrible)
  const backendPayload = {
    fatigue:       6 - payload.energy,
    soreness:      payload.muscle_soreness,
    sleep_quality: 6 - payload.sleep,
    stress:        payload.stress,
    notes:         payload.notes,
  };
  const res = (await apiClient.post('/health', backendPayload)) as {
    success: boolean;
    data: { log: Record<string, any> };
  };
  return mapRow(res.data.log);
}

export async function getMyHealth(): Promise<HealthEntry[]> {
  // GET /health is role-scoped: Player role automatically returns own logs only
  const res = (await apiClient.get('/health')) as {
    success: boolean;
    data: { logs: Record<string, any>[] };
  };
  return (res.data.logs ?? []).map(mapRow);
}

export async function getHealthAlerts(): Promise<HealthEntry[]> {
  const res = (await apiClient.get('/health/alerts')) as {
    success: boolean;
    data: { alerts: Record<string, any>[] };
  };
  return (res.data.alerts ?? []).map(mapRow);
}

export async function getHealthLogs(): Promise<HealthEntry[]> {
  const res = (await apiClient.get('/health')) as {
    success: boolean;
    data: { logs: Record<string, any>[] };
  };
  return (res.data.logs ?? []).map(mapRow);
}
