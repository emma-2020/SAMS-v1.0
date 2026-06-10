import { apiClient } from './client';
import type { WorkoutPlan } from './types';

export async function getWorkouts(): Promise<WorkoutPlan[]> {
  const res = (await apiClient.get('/workouts')) as { success: boolean; data: { assignments: WorkoutPlan[] } };
  return res.data.assignments ?? [];
}

export async function createWorkout(payload: Omit<WorkoutPlan, 'id' | 'created_at'>): Promise<WorkoutPlan> {
  const res = (await apiClient.post('/workouts', payload)) as { success: boolean; data: { assignment: WorkoutPlan } };
  return res.data.assignment;
}

export async function deleteWorkout(id: string): Promise<void> {
  await apiClient.delete(`/workouts/${id}`);
}
