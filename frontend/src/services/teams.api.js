// src/services/teams.api.js
import api from './api';

export const teamsApi = {
  listTeams: () =>
    api.get('/teams').then(r => r.data.data.teams),

  createTeam: ({ name, sport, division, coach_id }) =>
    api.post('/teams', { name, sport, division, coach_id }).then(r => r.data.data.team),

  deleteTeam: (id) =>
    api.delete(`/teams/${id}`).then(r => r.data),

  getMembers: (teamId) =>
    api.get(`/teams/${teamId}/members`).then(r => r.data.data),

  addMember: (teamId, { player_id, parent_id }) =>
    api.post(`/teams/${teamId}/members`, { player_id, parent_id }).then(r => r.data.data.roster),
};
