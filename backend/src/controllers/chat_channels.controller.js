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
      userRole:     req.user.role,
      targetUserId: req.body.target_user_id,
      academyId:    req.academyId,
    });
    return res.status(200).json({ success: true, data: { channel } });
  } catch (err) { next(err); }
}

async function searchUsers(req, res, next) {
  try {
    const result = await svc.searchUsers({
      query:         req.query.q || '',
      academyId:     req.academyId,
      currentUserId: req.user.id,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function leaveChannel(req, res, next) {
  try {
    await svc.leaveChannel({ channelId: req.params.id, userId: req.user.id, academyId: req.academyId });
    return res.status(200).json({ success: true, data: { left: true } });
  } catch (err) { next(err); }
}

async function muteChannel(req, res, next) {
  try {
    await svc.muteChannel({ channelId: req.params.id, userId: req.user.id, mutedUntil: req.body.muted_until || null });
    return res.status(200).json({ success: true, data: { muted: true } });
  } catch (err) { next(err); }
}

async function unmuteChannel(req, res, next) {
  try {
    await svc.unmuteChannel({ channelId: req.params.id, userId: req.user.id });
    return res.status(200).json({ success: true, data: { muted: false } });
  } catch (err) { next(err); }
}

async function blockUser(req, res, next) {
  try {
    await svc.blockUser({ blockerId: req.user.id, blockedId: req.params.userId, academyId: req.academyId });
    return res.status(200).json({ success: true, data: { blocked: true } });
  } catch (err) { next(err); }
}

async function unblockUser(req, res, next) {
  try {
    await svc.unblockUser({ blockerId: req.user.id, blockedId: req.params.userId });
    return res.status(200).json({ success: true, data: { blocked: false } });
  } catch (err) { next(err); }
}

async function getBlockedUsers(req, res, next) {
  try {
    const users = await svc.getBlockedUsers({ userId: req.user.id, academyId: req.academyId });
    return res.status(200).json({ success: true, data: { users } });
  } catch (err) { next(err); }
}

async function reportMessage(req, res, next) {
  try {
    const { reason, notes } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required.' });
    const report = await svc.reportMessage({
      messageId:  req.params.messageId,
      reportedBy: req.user.id,
      reason,
      notes,
      academyId:  req.academyId,
    });
    return res.status(201).json({ success: true, data: { report } });
  } catch (err) { next(err); }
}

async function getReports(req, res, next) {
  try {
    const reports = await svc.getReports({ academyId: req.academyId });
    return res.status(200).json({ success: true, data: { reports } });
  } catch (err) { next(err); }
}

async function reviewReport(req, res, next) {
  try {
    const { status } = req.body;
    const report = await svc.reviewReport({
      reportId:   req.params.reportId,
      reviewedBy: req.user.id,
      status,
      academyId:  req.academyId,
    });
    return res.status(200).json({ success: true, data: { report } });
  } catch (err) { next(err); }
}

async function getAcademySettings(req, res, next) {
  try {
    const settings = await svc.getAcademySettings({ academyId: req.academyId });
    return res.status(200).json({ success: true, data: { settings } });
  } catch (err) { next(err); }
}

async function updateAcademySettings(req, res, next) {
  try {
    const settings = await svc.updateAcademySettings({ academyId: req.academyId, settings: req.body });
    return res.status(200).json({ success: true, data: { settings } });
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
  leaveChannel,
  muteChannel,
  unmuteChannel,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportMessage,
  getReports,
  reviewReport,
  getAcademySettings,
  updateAcademySettings,
};
