// src/services/schedule.api.js
import api from './api';

export const scheduleApi = {
  getEvents: (params = {}) =>
    api.get('/schedule', { params }).then((r) => r.data.data.events),

  getEventById: (id) =>
    api.get(`/schedule/${id}`).then((r) => r.data.data.event),

  createEvent: (payload) =>
    api.post('/schedule', payload).then((r) => r.data.data.event),
};
