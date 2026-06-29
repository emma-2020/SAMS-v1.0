'use strict';

const router = require('express').Router();
const { authenticate }   = require('../middleware/auth.middleware');
const { requireRole }    = require('../middleware/auth.middleware');
const ctrl               = require('../controllers/meetings.controller');

router.use(authenticate);

// Members list (for the attendee picker)
router.get('/members', ctrl.listMembers);

// Scheduled meetings
router.get('/',         ctrl.listMeetings);
router.post('/',        requireRole('Admin', 'Coach'), ctrl.createMeeting);
router.get('/:id',      ctrl.getMeeting);
router.delete('/:id',   requireRole('Admin'), ctrl.cancelMeeting);

// Instant calls
router.post('/calls/start',              ctrl.startCall);
router.get('/calls/pending',             ctrl.getPendingCalls);
router.get('/calls/team/:teamId/active', ctrl.getActiveTeamCall);
router.patch('/calls/:id/status',        ctrl.updateCallStatus);

module.exports = router;
