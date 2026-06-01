// src/controllers/attendance.controller.js
'use strict';

const attendanceService = require('../services/attendance.service');

async function getRosterWithAttendance(req, res, next) {
  try {
    const result = await attendanceService.getRosterWithAttendance({
      eventId:   req.query.event_id,
      academyId: req.academyId,
      userId:    req.user.id,
      role:      req.user.role,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function logAttendance(req, res, next) {
  try {
    const { event_id, records } = req.body;

    const result = await attendanceService.logAttendance({
      eventId:   event_id,
      academyId: req.academyId,
      loggedBy:  req.user.id,
      role:      req.user.role,
      records,
    });

    return res.status(200).json({
      success: true,
      message: `${result.saved} attendance record(s) saved.`,
      data:    result,
    });
  } catch (err) { next(err); }
}

module.exports = { getRosterWithAttendance, logAttendance };
