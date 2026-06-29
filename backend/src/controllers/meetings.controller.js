'use strict';

const svc = require('../services/meetings.service');

// ── Scheduled meetings ────────────────────────────────────────────────────────

async function createMeeting(req, res, next) {
  try {
    const { title, agenda, scheduledAt, durationMinutes, attendeeIds } = req.body;
    const meeting = await svc.createMeeting({
      title, agenda, scheduledAt, durationMinutes, attendeeIds,
      createdBy: req.user.id,
      academyId: req.user.academy_id,
    });
    res.status(201).json({ success: true, data: meeting });
  } catch (err) { next(err); }
}

async function listMeetings(req, res, next) {
  try {
    const meetings = await svc.getMeetings({
      academyId: req.user.academy_id,
      userId:    req.user.id,
    });
    res.json({ success: true, data: meetings });
  } catch (err) { next(err); }
}

async function getMeeting(req, res, next) {
  try {
    const meeting = await svc.getMeetingById({
      meetingId: req.params.id,
      academyId: req.user.academy_id,
    });
    res.json({ success: true, data: meeting });
  } catch (err) { next(err); }
}

async function cancelMeeting(req, res, next) {
  try {
    await svc.cancelMeeting({
      meetingId: req.params.id,
      academyId: req.user.academy_id,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function listMembers(req, res, next) {
  try {
    const members = await svc.getAcademyMembers(req.user.academy_id);
    res.json({ success: true, data: members });
  } catch (err) { next(err); }
}

// ── Instant calls ─────────────────────────────────────────────────────────────

async function startCall(req, res, next) {
  try {
    const { teamId, recipientId } = req.body;
    const session = await svc.startCall({
      callerId:    req.user.id,
      teamId:      teamId     || null,
      recipientId: recipientId || null,
      academyId:   req.user.academy_id,
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
}

async function getPendingCalls(req, res, next) {
  try {
    const calls = await svc.getPendingCalls({
      userId:    req.user.id,
      academyId: req.user.academy_id,
    });
    res.json({ success: true, data: calls });
  } catch (err) { next(err); }
}

async function getActiveTeamCall(req, res, next) {
  try {
    const call = await svc.getActiveTeamCall({
      teamId:    req.params.teamId,
      academyId: req.user.academy_id,
    });
    res.json({ success: true, data: call });
  } catch (err) { next(err); }
}

async function updateCallStatus(req, res, next) {
  try {
    const session = await svc.updateCallStatus({
      sessionId: req.params.id,
      status:    req.body.status,
    });
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
}

module.exports = {
  createMeeting,
  listMeetings,
  getMeeting,
  cancelMeeting,
  listMembers,
  startCall,
  getPendingCalls,
  getActiveTeamCall,
  updateCallStatus,
};
