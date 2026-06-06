# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Monorepo root (requires pnpm ≥9)
```bash
pnpm install                # install all workspace packages
pnpm dev:next               # Next.js web app on port 3001
pnpm dev:backend            # Express API on port 4000
pnpm dev:all                # Next.js + backend concurrently
pnpm build:next             # production Next.js build (validated ✓)
pnpm dev:expo               # Expo mobile app (requires Expo Go or emulator)
```

### Backend (run from `backend/`)
```bash
npm run dev          # start with nodemon on port 4000
npm start            # production start
npm test             # jest --runInBand (all tests)
npx jest tests/unit/auth.service.test.js   # single test file
```

### Legacy Frontend / CRA (run from `frontend/` — kept as reference)
```bash
npm start            # CRA dev server on port 3000
npm run build        # production build
npm test             # react-scripts test --watchAll=false
```

### New Next.js app (run from `apps/next/`)
```bash
pnpm dev             # Next.js dev server on port 3001
pnpm build           # production build
pnpm typecheck       # TypeScript check only
```

### Expo mobile app (run from `apps/expo/`)
```bash
pnpm dev             # Expo development server
```

### Database
Migrations are run manually in the Supabase SQL Editor, in order:
1. `database/migrations/002_v1_schema.sql`
2. `database/migrations/003_security_fixes_and_workouts.sql`
3. `database/seeds/001_dev_seed.sql` (optional dev seed)

`001_ARCHIVED_superseded_by_002.sql` is obsolete — do not run it.

## Architecture

### Multi-tenancy
Every operational table carries an `academy_id` FK. The backend enforces tenant isolation at two levels:
- **`authenticate` middleware** — verifies the Supabase JWT and attaches `req.user` (including `academy_id`) to every request.
- **`extractTenant` middleware** — resolves and attaches `req.academyId` / `req.academyName` from `academies` table.
- **Supabase RLS policies** — row-level security as a second enforcement layer.

All service-layer queries must scope to `req.academyId`. Cross-tenant queries are a bug.

### Auth flow
- Login/signup hits `POST /api/auth/login` or `/signup`. The backend creates/validates a Supabase auth user and returns a `{ session, profile }` object.
- The frontend persists `session` and `user` in Zustand's `sams_auth` localStorage key (via `persist` middleware).
- **Critical**: Zustand property getters are not used in `authStore`. Always read `session.access_token` directly from `useAuthStore.getState().session` — the getter pattern was explicitly removed because Zustand's `set()` spread freezes getter values.
- The Axios client in `frontend/src/services/api.js` auto-attaches the Bearer token and implements a single-attempt refresh queue on 401.
- `AuthProvider` on mount calls `GET /api/auth/me` to revalidate the persisted session. It only calls `logout()` on a confirmed 401 — network errors and 500s are intentionally ignored to prevent spurious logouts.

### Role system
Four roles: `Admin`, `Coach`, `Player`, `Parent`. Each user maps to exactly one role.
- Backend: `requireRole(...allowedRoles)` middleware from `auth.middleware.js` — call after `authenticate`.
- Frontend: `RoleRoute` in `router/guards.jsx` wraps role-specific route groups; `SmartRoleRedirect` routes `/` and `/dashboard` to the correct role dashboard.

### Backend layer pattern
```
routes/*.routes.js  →  controllers/*.controller.js  →  services/*.service.js
```
- Routes declare middleware chains and delegate to controllers.
- Controllers only handle HTTP: parse request, call service, send response.
- Services hold all business logic and Supabase queries.
- Two Supabase clients in `config/supabase.js`: `supabaseAdmin` (service-role, bypasses RLS, server-only) and `supabaseAnon` (respects RLS).

### Frontend data pattern
- `frontend/src/services/*.api.js` — thin Axios wrappers, one file per domain.
- `useApi(fetchFn, deps)` — generic fetch hook returning `{ data, loading, error, refetch, setData }`.
- `useSubmit(submitFn)` — mutation hook returning `{ submit, loading, error, success, reset }`.
- State is component-local via these hooks; only auth state lives in Zustand.

### API shape
All backend responses follow:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```
All thrown errors must extend `AppError` from `utils/errors.js` (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalError`). The global `errorHandler` middleware reads `err.statusCode`.

## V1.0 Scope Constraint
Stripe, file uploads, PDF generation, video tools, Apple Health sync, and AI scheduling are explicitly out of scope. Do not introduce these.
