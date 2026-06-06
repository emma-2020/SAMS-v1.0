// src/services/coach.api.js
import api from './api';

export const coachApi = {
  getPlayers: () =>
    api.get('/coach/players').then(r => r.data.data),

  getPlayerProfile: (playerId) =>
    api.get(`/coach/players/${playerId}/profile`).then(r => r.data.data),
};
