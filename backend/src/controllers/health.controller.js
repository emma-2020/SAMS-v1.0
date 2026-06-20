// src/controllers/health.controller.js
'use strict';

const healthService = require('../services/health.service');

async function submitHealthLog(req, res, next) {
  try {
    const { fatigue, soreness, sleep_quality, notes, stress } = req.body;

    const log = await healthService.submitHealthLog({
      playerId:     req.user.id,
      academyId:    req.academyId,
      fatigue,
      soreness,
      sleep_quality,
      stress,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Health log submitted.',
      data:    { log },
    });
  } catch (err) { next(err); }
}

async function getHealthLogs(req, res, next) {
  try {
    const { player_id, days } = req.query;

    const logs = await healthService.getHealthLogs({
      userId:          req.user.id,
      academyId:       req.academyId,
      role:            req.user.role,
      targetPlayerId:  player_id,
      days:            days ? Number(days) : 30,
    });

    return res.status(200).json({ success: true, count: logs.length, data: { logs } });
  } catch (err) { next(err); }
}

async function getActiveAlerts(req, res, next) {
  try {
    const alerts = await healthService.getActiveAlerts({
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
    });

    return res.status(200).json({ success: true, count: alerts.length, data: { alerts } });
  } catch (err) { next(err); }
}

module.exports = { submitHealthLog, getHealthLogs, getActiveAlerts };
