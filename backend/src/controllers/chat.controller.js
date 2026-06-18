// src/controllers/chat.controller.js
'use strict';

const chatService = require('../services/chat.service');

async function getMessages(req, res, next) {
  try {
    const { channel_id, team_id, limit, before } = req.query;

    const result = await chatService.getMessages({
      channelId: channel_id,
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
    const { channel_id, team_id, message_text, attachment_url, file_name, mime_type, file_size } = req.body;

    const message = await chatService.sendMessage({
      channelId:     channel_id,
      teamId:        team_id,
      senderId:      req.user.id,
      academyId:     req.academyId,
      role:          req.user.role,
      messageText:   message_text,
      attachmentUrl: attachment_url,
      fileName:      file_name,
      mimeType:      mime_type,
      fileSize:      file_size,
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data:    { message },
    });
  } catch (err) { next(err); }
}

async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided.' });
    }
    const { channel_id, team_id } = req.body;
    if (!channel_id && !team_id) {
      return res.status(400).json({ success: false, error: '"channel_id" is required.' });
    }

    const result = await chatService.uploadAttachment({
      channelId:    channel_id,
      teamId:       team_id,
      userId:       req.user.id,
      academyId:    req.academyId,
      role:         req.user.role,
      fileBuffer:   req.file.buffer,
      mimetype:     req.file.mimetype,
      originalname: req.file.originalname,
      fileSize:     req.file.size,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function deleteMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    await chatService.deleteMessage({
      messageId,
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
    });
    return res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
}

module.exports = { getMessages, sendMessage, uploadAttachment, deleteMessage };
