// src/services/workout.service.js
'use strict';

/**
 * WorkoutService
 * ──────────────
 * Manages workout assignment creation and player checkbox completions.
 *
 * All queries carry academy_id for tenant isolation.
 * RLS policies on workout_assignments, workout_exercises, and
 * workout_completions provide a second enforcement layer.
 */

const { supabaseAdmin } = require('../config/supabase');
const {
  AppError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  InternalError,
} = require('../utils/errors');
const notif = require('./notifications.service');

// ─────────────────────────────────────────────────────────────────
// GET ASSIGNMENTS (role-scoped)
// ─────────────────────────────────────────────────────────────────

/**
 * getAssignments
 * Returns workout assignments with their exercises and player
 * completion states, scoped by the caller's role.
 *
 *   Player → their own assignments (by team or direct)
 *   Coach  → all assignments they created
 *   Admin  → all assignments in the academy
 */
async function getAssignments({ userId, academyId, role }) {
  let query = supabaseAdmin
    .from('workout_assignments')
    .select(`
      id, academy_id, team_id, player_id, title, due_date, created_at, assigned_by,
      workout_exercises (
        id, sort_order, description, sets_reps_notes
      )
    `)
    .eq('academy_id', academyId)              // tenant isolation
    .order('created_at', { ascending: false });

  if (role === 'Coach') {
    query = query.eq('assigned_by', userId);
  } else if (role === 'Player') {
    // Players see assignments targeting their team OR themselves directly
    const { data: rosters } = await supabaseAdmin
      .from('rosters')
      .select('team_id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('player_id', userId);

    const teamIds = (rosters || []).map((r) => r.team_id);

    if (teamIds.length > 0) {
      query = query.or(
        `team_id.in.(${teamIds.join(',')}),player_id.eq.${userId}`
      );
    } else {
      query = query.eq('player_id', userId);
    }
  } else if (role === 'Parent') {
    // Parents see workouts assigned to their linked children
    const { data: links } = await supabaseAdmin
      .from('rosters')
      .select('player_id, team_id')
      .eq('academy_id', academyId)            // tenant isolation
      .eq('parent_id', userId);

    const childIds = [...new Set((links || []).map(l => l.player_id).filter(Boolean))];
    const teamIds  = [...new Set((links || []).map(l => l.team_id).filter(Boolean))];

    if (childIds.length === 0) {
      return []; // No linked children → no workouts to show
    }

    // Match workouts assigned directly to a child OR to any team a child is on
    const orParts = [
      ...childIds.map(id => `player_id.eq.${id}`),
      ...(teamIds.length > 0 ? [`team_id.in.(${teamIds.join(',')})`] : []),
    ];
    query = query.or(orParts.join(','));
  }
  // Admin: no additional filter — sees all in academy

  const { data: assignments, error } = await query;
  if (error) {
    console.error('[WorkoutService.getAssignments]', error.message);
    throw new InternalError('Failed to fetch workout assignments. Please try again.');
  }

  if (!assignments || assignments.length === 0) return [];

  // For players: attach their own completion state per exercise
  if (role === 'Player') {
    const exerciseIds = assignments.flatMap(
      (a) => (a.workout_exercises || []).map((e) => e.id)
    );

    let completions = [];
    if (exerciseIds.length > 0) {
      const { data: compData } = await supabaseAdmin
        .from('workout_completions')
        .select('exercise_id, is_completed, completed_at')
        .eq('academy_id', academyId)          // tenant isolation
        .eq('player_id', userId)
        .in('exercise_id', exerciseIds);
      completions = compData || [];
    }

    const completionMap = Object.fromEntries(
      completions.map((c) => [c.exercise_id, c])
    );

    return assignments.map((a) => ({
      ...a,
      workout_exercises: (a.workout_exercises || []).map((ex) => ({
        ...ex,
        is_completed:  completionMap[ex.id]?.is_completed  ?? false,
        completed_at:  completionMap[ex.id]?.completed_at  ?? null,
      })),
    }));
  }

  return assignments;
}

// ─────────────────────────────────────────────────────────────────
// CREATE ASSIGNMENT (Coach / Admin only)
// ─────────────────────────────────────────────────────────────────

async function createAssignment({ userId, academyId, role, payload }) {
  const { title, team_id, player_id, due_date, exercises } = payload;

  if (!exercises || exercises.length === 0) {
    throw new BadRequestError('At least one exercise is required.');
  }

  // Normalize exercise field names before touching the DB.
  // The DB schema (workout_exercises) uses `description` / `sets_reps_notes`,
  // but the shared cross-platform API contract (packages/api `Exercise` type,
  // used by the web/mobile "Create Training Plan" forms) sends `name` / `notes`.
  // Accepting only the DB column names here caused `ex.description.trim()` to
  // throw a TypeError on the client's actual payload shape (description was
  // always undefined) — an unhandled exception thrown *after* the assignment
  // row was already inserted below, which is why plans were being created
  // with 0 exercises before a generic 500 was returned.
  const normalizedExercises = exercises.map((ex) => ({
    description:     String(ex.description ?? ex.name ?? '').trim(),
    sets_reps_notes: String(ex.sets_reps_notes ?? ex.notes ?? '').trim() || null,
  }));

  if (normalizedExercises.some((ex) => !ex.description)) {
    throw new BadRequestError('Each exercise requires a non-empty name/description.');
  }

  // Verify team_id belongs to this academy (if provided)
  if (team_id) {
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('id', team_id)
      .eq('academy_id', academyId)            // tenant isolation
      .single();
    if (!team) throw new BadRequestError('Team not found in this academy.');
  }

  // Verify player_id belongs to this academy (if provided)
  if (player_id) {
    const { data: player } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', player_id)
      .eq('academy_id', academyId)            // tenant isolation
      .single();
    if (!player) throw new BadRequestError('Player not found in this academy.');
  }

  // Insert assignment
  const { data: assignment, error: aError } = await supabaseAdmin
    .from('workout_assignments')
    .insert({
      academy_id:   academyId,                // tenant isolation
      team_id:      team_id   || null,
      player_id:    player_id || null,
      assigned_by:  userId,
      title:        title.trim(),
      due_date:     due_date  || null,
    })
    .select('id, academy_id, team_id, player_id, title, due_date, created_at, assigned_by')
    .single();

  if (aError) {
    console.error('[WorkoutService.createAssignment] insert:', aError.message);
    throw new InternalError('Failed to create workout assignment. Please try again.');
  }

  // Insert exercises.
  // Everything in this block runs after the plan row above already exists,
  // so on ANY failure here (Supabase error or unexpected exception) we roll
  // back the plan row rather than leaving an orphaned "0 exercises" record —
  // Supabase gives us no multi-table transaction here, so this is a
  // best-effort compensating delete, matching the pattern used in
  // platform.service.js's academy-provisioning flow.
  let savedExercises;
  try {
    const exerciseRows = normalizedExercises.map((ex, i) => ({
      academy_id:      academyId,               // tenant isolation
      assignment_id:   assignment.id,
      sort_order:      i,
      description:     ex.description,
      sets_reps_notes: ex.sets_reps_notes,
    }));

    const { data, error: eError } = await supabaseAdmin
      .from('workout_exercises')
      .insert(exerciseRows)
      .select('id, sort_order, description, sets_reps_notes');

    if (eError) {
      console.error('[WorkoutService.createAssignment] exercises insert:', eError.message);
      throw new InternalError('Failed to save workout exercises. Please try again.');
    }
    savedExercises = data;
  } catch (err) {
    console.error(
      '[WorkoutService.createAssignment] exercises insert failed, rolling back plan',
      assignment.id, '-', err.message
    );
    const { error: rbError } = await supabaseAdmin
      .from('workout_assignments')
      .delete()
      .eq('id', assignment.id)
      .eq('academy_id', academyId);
    if (rbError) {
      console.error('[WorkoutService.createAssignment] rollback failed:', rbError.message);
    }
    throw err instanceof AppError ? err : new InternalError('Failed to save workout exercises. Please try again.');
  }

  // Fire-and-forget: notify assigned player(s) about new workout
  (async () => {
    try {
      const due = assignment.due_date
        ? ` (due ${new Date(assignment.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`
        : '';
      if (assignment.player_id) {
        await notif.create({
          academyId,
          recipientId: assignment.player_id,
          type:  'workout',
          title: `New workout: ${assignment.title}`,
          body:  `You have been assigned a new workout${due}.`,
          link:  '/dashboard/player/workouts',
        });
      } else if (assignment.team_id) {
        const { data: rosters } = await supabaseAdmin
          .from('rosters')
          .select('player_id')
          .eq('academy_id', academyId)
          .eq('team_id', assignment.team_id);
        const playerIds = (rosters || []).map(r => r.player_id);
        if (playerIds.length > 0) {
          await notif.createForMany({
            academyId,
            recipientIds: playerIds,
            type:  'workout',
            title: `New workout: ${assignment.title}`,
            body:  `Your team has a new workout assigned${due}.`,
            link:  '/dashboard/player/workouts',
          });
        }
      }
    } catch (e) { console.error('[WorkoutService] notify error:', e.message); }
  })();

  return { ...assignment, workout_exercises: savedExercises };
}

// ─────────────────────────────────────────────────────────────────
// TOGGLE COMPLETION (Player only)
// ─────────────────────────────────────────────────────────────────

async function toggleCompletion({ playerId, academyId, exerciseId, isCompleted }) {
  // Verify the exercise belongs to this academy
  const { data: exercise } = await supabaseAdmin
    .from('workout_exercises')
    .select('id, assignment_id')
    .eq('id', exerciseId)
    .eq('academy_id', academyId)              // tenant isolation
    .single();

  if (!exercise) throw new NotFoundError('Exercise not found in this academy.');

  const now = isCompleted ? new Date().toISOString() : null;

  const { data, error } = await supabaseAdmin
    .from('workout_completions')
    .upsert(
      {
        academy_id:   academyId,              // tenant isolation
        exercise_id:  exerciseId,
        player_id:    playerId,
        is_completed: isCompleted,
        completed_at: now,
      },
      { onConflict: 'academy_id,exercise_id,player_id' }
    )
    .select('id, exercise_id, is_completed, completed_at')
    .single();

  if (error) {
    console.error('[WorkoutService.toggleCompletion] upsert:', error.message);
    throw new InternalError('Failed to save completion. Please try again.');
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// DELETE ASSIGNMENT (Coach / Admin only)
// ─────────────────────────────────────────────────────────────────

async function deleteAssignment({ userId, academyId, role, assignmentId }) {
  // Coaches may only delete their own assignments
  const query = supabaseAdmin
    .from('workout_assignments')
    .select('id, assigned_by')
    .eq('id', assignmentId)
    .eq('academy_id', academyId)
    .single();

  const { data: assignment, error } = await query;
  if (error || !assignment) throw new NotFoundError('Workout assignment not found.');

  if (role === 'Coach' && assignment.assigned_by !== userId) {
    throw new ForbiddenError('You can only delete your own workout assignments.');
  }

  const { error: delError } = await supabaseAdmin
    .from('workout_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('academy_id', academyId);

  if (delError) {
    console.error('[WorkoutService.deleteAssignment]', delError.message);
    throw new InternalError('Failed to delete assignment. Please try again.');
  }

  return { deleted: true };
}

module.exports = { getAssignments, createAssignment, toggleCompletion, deleteAssignment };
