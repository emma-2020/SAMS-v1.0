// src/services/chat.api.js
import api from './api';

export const chatApi = {
  getMessages: ({ teamId, limit = 50, before } = {}) =>
    api.get('/chat', {
      params: { team_id: teamId, limit, ...(before ? { before } : {}) },
    }).then((r) => r.data.data),

  sendMessage: ({ teamId, messageText }) =>
    api.post('/chat', { team_id: teamId, message_text: messageText })
      .then((r) => r.data.data.message),
};
