// src/controllers/chat_channels.controller.js
'use strict';

const svc = require('../services/chat_channels.service');

async function listChannels(req, res, next) {
  try {
    const channels = await svc.listChannels({
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
    });
    return res.status(200).json({ success: true, data: { channels } });
  } catch (err) { next(err); }
}

async function getChannelMembers(req, res, next) {
  try {
    const members = await svc.getChannelMembers({
      channelId: req.params.id,
      academyId: req.academyId,
    });
    return res.status(200).json({ success: true, data: { members } });
  } catch (err) { next(err); }
}

async function createGroup(req, res, next) {
  try {
    const { name, type, description, icon_color, member_ids, target_role } = req.body;
    const channel = await svc.createGroup({
      name,
      type,
      description,
      iconColor:   icon_color,
      memberIds:   member_ids || [],
      targetRole:  target_role,
      createdBy:   req.user.id,
      academyId:   req.academyId,
    });
    return res.status(201).json({ success: true, data: { channel } });
  } catch (err) { next(err); }
}

async function updateGroup(req, res, next) {
  try {
    const { name, description, icon_color } = req.body;
    const channel = await svc.updateGroup({
      channelId:  req.params.id,
      name,
      description,
      iconColor:  icon_color,
      academyId:  req.academyId,
    });
    return res.status(200).json({ success: true, data: { channel } });
  } catch (err) { next(err); }
}

async function deleteGroup(req, res, next) {
  try {
    await svc.deleteGroup({ channelId: req.params.id, academyId: req.academyId });
    return res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
}

async function addMember(req, res, next) {
  try {
    await svc.addMember({
      channelId: req.params.id,
      userId:    req.body.user_id,
      academyId: req.academyId,
    });
    return res.status(200).json({ success: true, data: { added: true } });
  } catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try {
    await svc.removeMember({
      channelId: req.params.id,
      userId:    req.params.userId,
      academyId: req.academyId,
    });
    return res.status(200).json({ success: true, data: { removed: true } });
  } catch (err) { next(err); }
}

async function getOrCreateDirect(req, res, next) {
  try {
    const channel = await svc.getOrCreateDirect({
      userId:       req.user.id,
      targetUserId: req.body.target_user_id,
      academyId:    req.academyId,
    });
    return res.status(200).json({ success: true, data: { channel } });
  } catch (err) { next(err); }
}

async function searchUsers(req, res, next) {
  try {
    const users = await svc.searchUsers({
      query:         req.query.q || '',
      academyId:     req.academyId,
      currentUserId: req.user.id,
    });
    return res.status(200).json({ success: true, data: { users } });
  } catch (err) { next(err); }
}

module.exports = {
  listChannels,
  getChannelMembers,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  getOrCreateDirect,
  searchUsers,
};
