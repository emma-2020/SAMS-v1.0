// src/controllers/schedule.controller.js
'use strict';

const scheduleService = require('../services/schedule.service');

async function getEvents(req, res, next) {
  try {
    const { start, end, type, team_id } = req.query;
    const events = await scheduleService.getEvents({
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
      start, end, type,
      teamId: team_id,
    });
    return res.status(200).json({ success: true, count: events.length, data: { events } });
  } catch (err) { next(err); }
}

async function getEventById(req, res, next) {
  try {
    const event = await scheduleService.getEventById({
      eventId:   req.params.id,
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
    });
    return res.status(200).json({ success: true, data: { event } });
  } catch (err) { next(err); }
}

// F-03: New — create a scheduled event
async function createEvent(req, res, next) {
  try {
    const event = await scheduleService.createEvent({
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
      payload:   req.body,
    });
    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data:    { event },
    });
  } catch (err) { next(err); }
}

module.exports = { getEvents, getEventById, createEvent };
