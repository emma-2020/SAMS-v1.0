// src/services/workout.api.js
import api from './api';

export const workoutApi = {
  getAssignments: () =>
    api.get('/workouts').then((r) => r.data.data.assignments),

  createAssignment: (payload) =>
    api.post('/workouts', payload).then((r) => r.data.data.assignment),

  toggleCompletion: (exerciseId, isCompleted) =>
    api.post('/workouts/complete', { exercise_id: exerciseId, is_completed: isCompleted })
      .then((r) => r.data.data.completion),
};
