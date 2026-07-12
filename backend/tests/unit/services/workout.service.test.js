// tests/unit/services/workout.service.test.js
'use strict';

jest.mock('../../../src/config/supabase');
const { supabaseAdmin }  = require('../../../src/config/supabase');
const workoutService     = require('../../../src/services/workout.service');
const { BadRequestError, InternalError } = require('../../../src/utils/errors');

// ─── Mock builder ─────────────────────────────────────────────────
// Chainable AND awaitable at any point in the chain (`.eq().eq()` alone,
// or `.select().single()`) — resolves to whatever `result` was configured
// for that call.
function makeBuilder(result) {
  const builder = {
    select: jest.fn(() => builder),
    eq:     jest.fn(() => builder),
    insert: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
    then:   (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

// Queue up per-table responses; each call to `.from(table)` pops the next
// configured response for that table (or repeats the last one).
function mockSupabaseFrom(responses) {
  const callCounts = {};
  const builders    = {};
  supabaseAdmin.from = jest.fn((table) => {
    const list = responses[table] || [{ data: null, error: null }];
    const n    = callCounts[table] || 0;
    const idx  = Math.min(n, list.length - 1);
    callCounts[table] = n + 1;
    const b = makeBuilder(list[idx]);
    builders[table] = builders[table] || [];
    builders[table].push(b);
    return b;
  });
  return { callCounts, builders };
}

const BASE = { userId: 'coach1', academyId: 'acad1', role: 'Coach' };

describe('workoutService.createAssignment', () => {

  test('accepts the { name, notes } exercise shape sent by the web/mobile client and maps it to description/sets_reps_notes', async () => {
    const assignmentRow = {
      id: 'A1', academy_id: 'acad1', team_id: null, player_id: null,
      title: 'Plan A', due_date: null, created_at: '2026-01-01', assigned_by: 'coach1',
    };
    const { builders } = mockSupabaseFrom({
      workout_assignments: [{ data: assignmentRow, error: null }],
      workout_exercises:   [{ data: [{ id: 'E1', sort_order: 0, description: 'Push ups', sets_reps_notes: '3x10' }], error: null }],
    });

    const payload = { title: 'Plan A', exercises: [{ name: 'Push ups', notes: '3x10' }] };
    const result = await workoutService.createAssignment({ ...BASE, payload });

    expect(result.workout_exercises).toEqual([
      { id: 'E1', sort_order: 0, description: 'Push ups', sets_reps_notes: '3x10' },
    ]);

    // Confirm the row actually sent to workout_exercises used `description`,
    // not the undefined `ex.description` that used to crash the request.
    const exercisesInsertArg = builders.workout_exercises[0].insert.mock.calls[0][0];
    expect(exercisesInsertArg).toEqual([
      { academy_id: 'acad1', assignment_id: 'A1', sort_order: 0, description: 'Push ups', sets_reps_notes: '3x10' },
    ]);
  });

  test('rolls back the newly-created plan row if the exercise insert fails, instead of leaving an orphaned 0-exercise plan', async () => {
    const assignmentRow = {
      id: 'A1', academy_id: 'acad1', team_id: null, player_id: null,
      title: 'Plan A', due_date: null, created_at: '2026-01-01', assigned_by: 'coach1',
    };
    const { callCounts, builders } = mockSupabaseFrom({
      workout_assignments: [
        { data: assignmentRow, error: null },  // 1st call: the plan insert
        { error: null },                       // 2nd call: the rollback delete
      ],
      workout_exercises: [{ data: null, error: { message: 'simulated db failure' } }],
    });

    const payload = { title: 'Plan A', exercises: [{ name: 'Push ups' }] };

    await expect(workoutService.createAssignment({ ...BASE, payload }))
      .rejects.toBeInstanceOf(InternalError);

    // workout_assignments must have been hit twice: insert, then rollback delete.
    expect(callCounts.workout_assignments).toBe(2);
    const rollbackBuilder = builders.workout_assignments[1];
    expect(rollbackBuilder.delete).toHaveBeenCalled();
    expect(rollbackBuilder.eq).toHaveBeenCalledWith('id', 'A1');
  });

  test('rejects with BadRequestError before creating any plan row when every exercise is missing a name/description', async () => {
    const { callCounts } = mockSupabaseFrom({});
    const payload = { title: 'Plan A', exercises: [{ notes: 'no name here' }] };

    await expect(workoutService.createAssignment({ ...BASE, payload }))
      .rejects.toBeInstanceOf(BadRequestError);

    // Must fail before ever touching workout_assignments — no orphaned row.
    expect(callCounts.workout_assignments).toBeUndefined();
  });
});
