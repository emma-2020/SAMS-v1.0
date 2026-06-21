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

async function exportAttendanceCsv(req, res, next) {
  try {
    const { event_id, team_id, from, to } = req.query;
    const rows = await attendanceService.exportAttendanceCsv({
      academyId: req.academyId,
      userId:    req.user.id,
      role:      req.user.role,
      eventId:   event_id || null,
      teamId:    team_id  || null,
      from:      from     || null,
      to:        to       || null,
    });

    const headers = ['Player Name', 'Email', 'Team', 'Event Title', 'Event Type', 'Event Date', 'Status', 'Notes'];
    const escape  = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines   = [
      headers.map(escape).join(','),
      ...rows.map(r =>
        [r.player_name, r.email, r.team, r.event_title, r.event_type, r.event_date, r.status, r.notes]
          .map(escape).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    return res.status(200).send(lines.join('\r\n'));
  } catch (err) { next(err); }
}

module.exports = { getRosterWithAttendance, logAttendance, exportAttendanceCsv };
