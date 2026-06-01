// src/services/health.api.js
import api from './api';

export const healthApi = {
  submitLog: (payload) =>
    api.post('/health', payload).then((r) => r.data.data.log),

  getLogs: (params = {}) =>
    api.get('/health', { params }).then((r) => r.data.data.logs),

  getAlerts: () =>
    api.get('/health/alerts').then((r) => r.data.data.alerts),
};
