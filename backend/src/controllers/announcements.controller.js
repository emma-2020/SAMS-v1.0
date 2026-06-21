'use strict';

const announcementsService = require('../services/announcements.service');

async function listAnnouncements(req, res, next) {
  try {
    const announcements = await announcementsService.listAnnouncements({ academyId: req.academyId });
    return res.status(200).json({ success: true, count: announcements.length, data: { announcements } });
  } catch (err) { next(err); }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, body } = req.body;
    const announcement = await announcementsService.createAnnouncement({
      academyId: req.academyId,
      adminId:   req.user.id,
      title,
      body,
    });
    return res.status(201).json({ success: true, data: { announcement } });
  } catch (err) { next(err); }
}

async function deleteAnnouncement(req, res, next) {
  try {
    await announcementsService.deleteAnnouncement({ academyId: req.academyId, announcementId: req.params.id });
    return res.status(200).json({ success: true, message: 'Announcement deleted.' });
  } catch (err) { next(err); }
}

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
