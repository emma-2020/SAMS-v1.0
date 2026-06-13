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

## Monorepo Architecture (added Jun 2026)

### Directory layout
```
SAMS-v1.0/
├── apps/
│   ├── next/          # Next.js 14 App Router — web replacement for CRA frontend
│   └── expo/          # Expo SDK 51 — iOS/Android mobile app
├── packages/
│   ├── api/           # @sams/api  — cross-platform Axios client (all API calls)
│   ├── store/         # @sams/store — cross-platform Zustand auth store
│   ├── ui/            # @sams/ui   — React Native + NativeWind shared components
│   └── app/           # @sams/app  — shared screen components + nav config
├── backend/           # Express API server (UNTOUCHED)
├── database/          # Supabase migrations (UNTOUCHED)
└── frontend/          # Legacy CRA app (kept as reference, not deleted)
```

### Cross-platform primitives
- All shared components in `packages/ui/` and `packages/app/` use `<View>`, `<Text>`, `<ScrollView>`, `<Pressable>` from `react-native` — compiled to HTML on web via `react-native-web`, native UIView/UILabel on iOS/Android.
- Styling uses NativeWind v4 `className` props (Tailwind CSS at build time).
- Platform-split files: `.web.tsx` is resolved first on Next.js; `.native.tsx` first on Expo. Used for charts (recharts on web, native fallbacks on mobile).

### Next.js web app (`apps/next/`)
- Uses App Router with route groups: `(auth)` for public routes, `dashboard/[role]/...` for protected routes.
- `lib/auth/provider.tsx` — client-side auth guard + API client wiring.
- `lib/theme/provider.tsx` — dark mode + density system (mirrors existing CSS variable approach).
- `components/shell/AppShell.tsx` — sidebar layout, notification panel, role switcher.
- Next.js config aliases `react-native` → `react-native-web` via webpack; TypeScript types come from actual `react-native` package (do NOT add `react-native` to TS `paths` — breaks type resolution).
- All shared screens imported from `@sams/app` must have `'use client'` at the top.

### Expo mobile app (`apps/expo/`)
- Uses Expo Router v3 (file-based, like Next.js App Router).
- `(auth)/login.tsx` → login screen; `(tabs)/` → bottom tab navigation.
- Auth storage: `@react-native-async-storage/async-storage` (resolved automatically by `@sams/store`).
- Metro config: `withNativeWind` wrapper + `watchFolders` pointing to workspace root for monorepo resolution.

### Zustand auth store (`packages/store/`)
- **Critical**: No property getters. Read `session.access_token` directly from `getState().session`.
- Storage auto-selects: `localStorage` on web, `AsyncStorage` on native.
- API client configured via `configureApiClient()` — must be called once on app mount (done in `AuthProvider` and Expo `_layout.tsx`).

## V1.0 Scope Constraint
Stripe, PDF generation, video tools, Apple Health sync, and AI scheduling are explicitly out of scope. Do not introduce these.
Chat file attachments (images and PDF, max 10 MB) are in scope — see `POST /api/chat/upload` and `database/migrations/004_chat_attachments.sql`.
