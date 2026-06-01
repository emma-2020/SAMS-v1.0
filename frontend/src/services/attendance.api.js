// src/services/attendance.api.js
import api from './api';

export const attendanceApi = {
  getRoster: (eventId) =>
    api.get('/attendance', { params: { event_id: eventId } }).then((r) => r.data.data),

  logAttendance: (eventId, records) =>
    api.post('/attendance', { event_id: eventId, records }).then((r) => r.data.data),
};
