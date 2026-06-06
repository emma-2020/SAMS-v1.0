import api from './api';

export const notificationsApi = {
  getAll:      ()   => api.get('/notifications').then(r => r.data.data),
  getUnread:   ()   => api.get('/notifications/unread-count').then(r => r.data.data.count),
  markRead:    (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: ()   => api.patch('/notifications/read-all'),
  remove:      (id) => api.delete(`/notifications/${id}`),
};
