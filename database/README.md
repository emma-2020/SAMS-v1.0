# Database — SAMS v1.0

## How to apply migrations

Run these files **in order** in the Supabase SQL Editor:

| # | File | What it does |
|---|------|-------------|
| 1 | `migrations/002_v1_schema.sql` | Creates all 8 core tables with RLS policies |
| 2 | `migrations/003_security_fixes_and_workouts.sql` | Security hardening + 3 workout tables |
| 3 | `seeds/001_dev_seed.sql` | Optional: sample academy, teams, users |

## Tables created

**Core:** `academies` · `users` · `teams` · `rosters` · `events`
**Operations:** `attendance` · `health_logs` · `messages`
**Workouts:** `workout_assignments` · `workout_exercises` · `workout_completions`

## Architecture rules

- Every table except `academies` has an `academy_id` foreign key
- Row Level Security (RLS) is enabled on all tables
- The `auth_academy_id()` function resolves the calling user's tenant
- No query may cross tenant boundaries
