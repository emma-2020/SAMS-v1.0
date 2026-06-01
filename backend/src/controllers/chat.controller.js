// src/controllers/chat.controller.js
'use strict';

const chatService = require('../services/chat.service');

async function getMessages(req, res, next) {
  try {
    const { team_id, limit, before } = req.query;

    const result = await chatService.getMessages({
      teamId:    team_id,
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
      limit,
      before,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function sendMessage(req, res, next) {
  try {
    const { team_id, message_text } = req.body;

    const message = await chatService.sendMessage({
      teamId:      team_id,
      senderId:    req.user.id,
      academyId:   req.academyId,
      role:        req.user.role,
      messageText: message_text,
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data:    { message },
    });
  } catch (err) { next(err); }
}

module.exports = { getMessages, sendMessage };
