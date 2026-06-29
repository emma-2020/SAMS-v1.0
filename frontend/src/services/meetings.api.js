import api from './api';

export const meetingsApi = {
  // Scheduled meetings
  list:   ()                        => api.get('/meetings').then(r => r.data.data),
  create: (payload)                 => api.post('/meetings', payload).then(r => r.data.data),
  get:    (id)                      => api.get(`/meetings/${id}`).then(r => r.data.data),
  cancel: (id)                      => api.delete(`/meetings/${id}`).then(r => r.data),

  // Member picker
  members: ()                       => api.get('/meetings/members').then(r => r.data.data),

  // Instant calls
  startCall:       (body)           => api.post('/meetings/calls/start', body).then(r => r.data.data),
  getPendingCalls: ()               => api.get('/meetings/calls/pending').then(r => r.data.data),
  getActiveTeamCall: (teamId)       => api.get(`/meetings/calls/team/${teamId}/active`).then(r => r.data.data),
  updateCallStatus: (id, status)    => api.patch(`/meetings/calls/${id}/status`, { status }).then(r => r.data.data),
};
