// src/utils/wellness.js
'use strict';

/**
 * computeWellnessScore
 * ─────────────────────
 * Single source of truth for deriving a 0–100 wellness score from a
 * health_logs row.
 *
 * IMPORTANT: health_logs has no `overall_score` column — only
 * `fatigue`, `soreness`, and `sleep_quality` are real, persisted
 * columns. Every call site that needs a "score" MUST derive it here
 * rather than selecting a nonexistent `overall_score` column (doing so
 * throws a Postgrest "column does not exist" error, which — if the
 * query's `error` isn't checked — silently resolves to `data: null`
 * and makes a player look like they have zero health data).
 *
 * fatigue/soreness: 1 = good, 5 = bad → invert.
 * sleep_quality:    1 = bad, 5 = good → direct.
 */
function computeWellnessScore(row) {
  const fat = (5 - row.fatigue)       / 4;  // 1→1.0, 5→0.0
  const sor = (5 - row.soreness)      / 4;
  const slp = (row.sleep_quality - 1) / 4;  // 1→0.0, 5→1.0
  return Math.round(((fat + sor + slp) / 3) * 100);
}

module.exports = { computeWellnessScore };
