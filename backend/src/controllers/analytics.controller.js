'use strict';

const analytics = require('../services/analytics.service');

async function getFeeAnalytics(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await analytics.getFeesAnalytics({ academyId: req.academyId, startDate, endDate });
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

async function getParentAnalytics(req, res, next) {
  try {
    const data = await analytics.getParentAnalytics({ academyId: req.academyId, userId: req.user.id });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getWorkoutAnalytics(req, res, next) {
  try {
    const data = await analytics.getWorkoutAnalytics({ academyId: req.academyId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getTeamComparison(req, res, next) {
  try {
    const data = await analytics.getTeamComparison({ academyId: req.academyId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getPlayerDetail(req, res, next) {
  try {
    const data = await analytics.getPlayerDetail({ academyId: req.academyId, playerId: req.params.id });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getAnalyticsSummary(req, res, next) {
  try {
    const data = await analytics.getAnalyticsSummary({ academyId: req.academyId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = {
  getFeeAnalytics, getAttendanceAnalytics, getWellnessAnalytics, getMyWellnessAnalytics,
  getParentAnalytics, getWorkoutAnalytics, getTeamComparison, getPlayerDetail, getAnalyticsSummary,
};
