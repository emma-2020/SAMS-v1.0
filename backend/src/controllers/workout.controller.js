// src/controllers/workout.controller.js
'use strict';

const workoutService = require('../services/workout.service');

async function getAssignments(req, res, next) {
  try {
    const assignments = await workoutService.getAssignments({
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
    });
    return res.status(200).json({
      success: true,
      count:   assignments.length,
      data:    { assignments },
    });
  } catch (err) { next(err); }
}

async function createAssignment(req, res, next) {
  try {
    const assignment = await workoutService.createAssignment({
      userId:    req.user.id,
      academyId: req.academyId,
      role:      req.user.role,
      payload:   req.body,
    });
    return res.status(201).json({
      success: true,
      message: 'Workout assignment created.',
      data:    { assignment },
    });
  } catch (err) { next(err); }
}

async function toggleCompletion(req, res, next) {
  try {
    const { exercise_id, is_completed } = req.body;
    if (!exercise_id) {
      return res.status(400).json({ success: false, error: '"exercise_id" is required.' });
    }
    const result = await workoutService.toggleCompletion({
      playerId:    req.user.id,
      academyId:   req.academyId,
      exerciseId:  exercise_id,
      isCompleted: Boolean(is_completed),
    });
    return res.status(200).json({ success: true, data: { completion: result } });
  } catch (err) { next(err); }
}

module.exports = { getAssignments, createAssignment, toggleCompletion };
