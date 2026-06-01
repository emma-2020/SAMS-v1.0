-- ================================================================
-- SAMS v1.0  —  Migration 003: Security Fixes + Workout Tables
-- Run this   : SECOND, after 002_v1_schema.sql has succeeded
-- ================================================================
--
-- Fixes applied:
--   F-02  auth_academy_id() and auth_user_role() hardened with LIMIT 1
--   F-05  health_logs UNIQUE constraint upgraded to include academy_id
--         (uses plain log_date column — no expression index needed)
--   F-08  workout_assignments, workout_exercises, workout_completions
-- ================================================================


-- ================================================================
-- F-02 FIX: Harden RLS helper functions with LIMIT 1
-- ================================================================

CREATE OR REPLACE FUNCTION auth_academy_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT academy_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;


-- ================================================================
-- SHARED TRIGGER FUNCTION
-- Used by workout_assignments updated_at auto-stamp below.
-- ================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ================================================================
-- F-05 FIX: Upgrade health_logs unique constraint to include academy_id
--
-- Migration 002 creates: UNIQUE (player_id, log_date)
-- This migration upgrades it to: UNIQUE (academy_id, player_id, log_date)
--
-- Uses plain column constraint only — no expression indexes,
-- no function casts, no TIMESTAMPTZ::DATE expressions.
-- This avoids the 42P17 IMMUTABLE error entirely.
-- ================================================================

ALTER TABLE health_logs
  DROP CONSTRAINT IF EXISTS uq_health_log_player_day;

ALTER TABLE health_logs
  ADD CONSTRAINT uq_health_log_player_day
  UNIQUE (academy_id, player_id, log_date);


-- ================================================================
-- F-08: Workout Tables
-- ================================================================


-- ----------------------------------------------------------------
-- WORKOUT ASSIGNMENTS
-- ----------------------------------------------------------------
CREATE TABLE workout_assignments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id    UUID        NOT NULL REFERENCES academies(id)  ON DELETE CASCADE,
  team_id       UUID                 REFERENCES teams(id)      ON DELETE CASCADE,
  player_id     UUID                 REFERENCES users(id)      ON DELETE CASCADE,
  assigned_by   UUID        NOT NULL REFERENCES users(id),
  title         TEXT        NOT NULL,
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_assignment_scope CHECK (team_id IS NOT NULL OR player_id IS NOT NULL)
);

COMMENT ON TABLE  workout_assignments            IS 'Coach-assigned workout plans.';
COMMENT ON COLUMN workout_assignments.academy_id IS 'Tenant isolation key.';

CREATE INDEX idx_workout_assignments_academy  ON workout_assignments (academy_id);
CREATE INDEX idx_workout_assignments_team     ON workout_assignments (team_id);
CREATE INDEX idx_workout_assignments_player   ON workout_assignments (player_id);
CREATE INDEX idx_workout_assignments_assigned ON workout_assignments (assigned_by);

CREATE TRIGGER trg_workout_assignments_updated_at
BEFORE UPDATE ON workout_assignments
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ----------------------------------------------------------------
-- WORKOUT EXERCISES
-- ----------------------------------------------------------------
CREATE TABLE workout_exercises (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id      UUID        NOT NULL REFERENCES academies(id)           ON DELETE CASCADE,
  assignment_id   UUID        NOT NULL REFERENCES workout_assignments(id)  ON DELETE CASCADE,
  sort_order      INT         NOT NULL DEFAULT 0,
  description     TEXT        NOT NULL CHECK (length(trim(description)) > 0),
  sets_reps_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  workout_exercises            IS 'Individual exercises within a workout assignment.';
COMMENT ON COLUMN workout_exercises.academy_id IS 'Tenant isolation key.';

CREATE INDEX idx_workout_exercises_academy    ON workout_exercises (academy_id);
CREATE INDEX idx_workout_exercises_assignment ON workout_exercises (assignment_id, sort_order);


-- ----------------------------------------------------------------
-- WORKOUT COMPLETIONS
-- ----------------------------------------------------------------
CREATE TABLE workout_completions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id      UUID        NOT NULL REFERENCES academies(id)          ON DELETE CASCADE,
  exercise_id     UUID        NOT NULL REFERENCES workout_exercises(id)   ON DELETE CASCADE,
  player_id       UUID        NOT NULL REFERENCES users(id)               ON DELETE CASCADE,
  is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_completion_player_exercise UNIQUE (academy_id, exercise_id, player_id)
);

COMMENT ON TABLE  workout_completions            IS 'Player checkbox completion log per exercise.';
COMMENT ON COLUMN workout_completions.academy_id IS 'Tenant isolation key.';

CREATE INDEX idx_workout_completions_academy  ON workout_completions (academy_id);
CREATE INDEX idx_workout_completions_exercise ON workout_completions (exercise_id);
CREATE INDEX idx_workout_completions_player   ON workout_completions (player_id);


-- ----------------------------------------------------------------
-- RLS for workout tables
-- ----------------------------------------------------------------

ALTER TABLE workout_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_completions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON workout_assignments
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON workout_exercises
  FOR ALL USING (academy_id = auth_academy_id());

CREATE POLICY tenant_isolation ON workout_completions
  FOR ALL USING (academy_id = auth_academy_id());

-- Only Admin/Coach may create or update assignments
CREATE POLICY workout_assignment_write ON workout_assignments
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

CREATE POLICY workout_assignment_update ON workout_assignments
  FOR UPDATE USING (
    academy_id = auth_academy_id()
    AND auth_user_role() IN ('Admin', 'Coach')
  );

-- Players write only their own completion records
CREATE POLICY workout_completion_write ON workout_completions
  FOR INSERT WITH CHECK (
    academy_id = auth_academy_id()
    AND player_id = auth.uid()
    AND auth_user_role() = 'Player'
  );

CREATE POLICY workout_completion_update ON workout_completions
  FOR UPDATE USING (
    academy_id = auth_academy_id()
    AND player_id = auth.uid()
    AND auth_user_role() = 'Player'
  );


-- ================================================================
-- END OF MIGRATION 003
-- ================================================================
