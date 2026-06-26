'use strict';

const analytics = require('../services/analytics.service');

async function getFeeAnalytics(req, res, next) {
  try {
    const data = await analytics.getFeesAnalytics({ academyId: req.academyId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getAttendanceAnalytics(req, res, next) {
  try {
    const data = await analytics.getAttendanceAnalytics({ academyId: req.academyId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getWellnessAnalytics(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analytics.getWellnessAnalytics({ academyId: req.academyId, days });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getMyWellnessAnalytics(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 60;
    const data = await analytics.getMyWellnessAnalytics({
      academyId: req.academyId,
      userId:    req.user.id,
      days,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { getFeeAnalytics, getAttendanceAnalytics, getWellnessAnalytics, getMyWellnessAnalytics };
