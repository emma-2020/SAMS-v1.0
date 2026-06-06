// src/services/admin.api.js
import api from './api';

export const adminApi = {
  createInvitation: (payload) =>
    api.post('/admin/invite', payload).then((r) => r.data.data.invitation),

  listInvitations: (status) =>
    api.get('/admin/invite', { params: status ? { status } : {} }).then((r) => r.data.data.invitations),

  revokeInvitation: (id) =>
    api.delete(`/admin/invite/${id}`).then((r) => r.data.data.invitation),

  getRoster: () =>
    api.get('/admin/roster').then((r) => r.data.data.members || r.data.data.roster || []),

  // Venue blocks — uses schedule events for V1.0 resource view
  getAllEvents: (params = {}) =>
    api.get('/schedule', { params }).then((r) => r.data.data.events),

  createVenueBlock: (payload) =>
    api.post('/schedule', payload).then((r) => r.data.data.event),
};
