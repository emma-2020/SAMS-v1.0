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

### Capacitor mobile app (run from `apps/next/`)
```bash
npx cap sync         # sync web build to iOS/Android projects
npx cap open ios     # open Xcode
npx cap open android # open Android Studio
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
│   └── next/          # Next.js 14 App Router — web app + Capacitor iOS/Android shell
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
- All shared components in `packages/ui/` and `packages/app/` use `<View>`, `<Text>`, `<ScrollView>`, `<Pressable>` from `react-native` — compiled to HTML on web via `react-native-web`.
- Styling uses NativeWind v4 `className` props (Tailwind CSS at build time).
- Platform-split files: `.web.tsx` is resolved first on Next.js. Only `.web.tsx` files are active — there is no native-only runtime (Capacitor wraps the web app).

### Next.js web app (`apps/next/`)
- Uses App Router with route groups: `(auth)` for public routes, `dashboard/[role]/...` for protected routes.
- `lib/auth/provider.tsx` — client-side auth guard + API client wiring.
- `lib/theme/provider.tsx` — dark mode + density system (mirrors existing CSS variable approach).
- `components/shell/AppShell.tsx` — sidebar layout, notification panel, role switcher.
- Next.js config aliases `react-native` → `react-native-web` via webpack; TypeScript types come from actual `react-native` package (do NOT add `react-native` to TS `paths` — breaks type resolution).
- All shared screens imported from `@sams/app` must have `'use client'` at the top.

### Capacitor mobile app (`apps/next/`)
- Wraps the Next.js web app in a native iOS/Android shell via Capacitor.
- Config: `apps/next/capacitor.config.ts` — uses live-server mode pointing to `https://app.playsams.com`.
- iOS project: `apps/next/ios/` — open with Xcode (`npx cap open ios`).
- Android project: `apps/next/android/` — open with Android Studio (`npx cap open android`).
- To ship a new version: deploy to Vercel, no app store update needed (live-server mode). For a fully-bundled build, remove the `server` block from `capacitor.config.ts` and run `pnpm build` before `npx cap sync`.

### Zustand auth store (`packages/store/`)
- **Critical**: No property getters. Read `session.access_token` directly from `getState().session`.
- Storage uses `localStorage` (web). No AsyncStorage — Capacitor runs the web app, not a native React Native runtime.
- API client configured via `configureApiClient()` — must be called once on app mount (done in `AuthProvider`).

### Offline support (added Jul 2026)
- Core module: `packages/api/src/offline/` — IndexedDB-backed GET cache + mutation queue, wired into `apiClient`'s axios interceptors in `packages/api/src/client.ts`. Works identically on web and inside the Capacitor WebView (same IndexedDB API in both).
- **Full offline read + write** (queued while offline, auto-replayed on reconnect): chat sends (`POST /chat`) and attendance saves (`POST /attendance`) only. Allowlisted in `packages/api/src/offline/config.ts` (`isQueueableMutation`) — a route only belongs there if it's provably safe to replay blind (chat de-dupes via `client_message_id`, migration `022_chat_client_message_id.sql`; attendance is an idempotent upsert). Do not add a route here without an equivalent replay-safety story.
- **Read-only cache** (last-known-good served if a GET fails offline): schedule, chat, attendance, announcements, teams, documents, health, workouts, notifications, analytics — see `isCacheableGet` in the same file. The live fee/payment ledger (`fees.ts` / `feesApi`) is deliberately never cached or queued — a stale balance shown as current is a real-money risk, not just a UX one.
- **App shell precaching (supersedes the old "hard reload / unvisited route" limitation)**: the service worker (`apps/next/sw-src.js`, built via Workbox `injectManifest` in `apps/next/scripts/build-sw.js` to `apps/next/out/sw.js` at build time — gitignored, regenerated every `pnpm build`) precaches the shell for every route across every role at *install* time, not per-visit. Reloading the tab or navigating to a route you've never opened in the current session works offline, not just previously-visited ones.
- **Known limitation (narrower than it used to be)**: if the precache itself is unavailable — the SW never finished installing, or the browser evicted it (notably iOS Safari's storage eviction for origins with ~7 days of no user interaction) — a navigation can come up empty. On WebKit specifically this used to fail silently (URL and content frozen on the previous page, no visible error) instead of showing a network-error page the way Chromium does; the SW's navigate handler now guarantees a real fallback `Response` (a plain "you're offline" page) in that case, so the failure is at least visible on every engine. The read cache described above still only helps a fetch that fails *while a page is already mounted* — this bullet is specifically about the precached app shell, a separate mechanism. Closing the remaining edge case entirely would mean flipping Capacitor out of live-server mode (see below) — not done, and shouldn't be without a concrete need, since it costs back the app-store-free release flow.
- `packages/store/src/auth.ts`'s `logout()` calls `clearOfflineData()` — required so a different account signing in on the same device never sees the previous account's cached reads or queued-but-unsent mutations.
- Global status pill: `apps/next/components/shell/OfflineIndicator.tsx`, rendered in `AppShell`'s topbar — shows "Offline" / "Syncing N…" off of `isOffline()` / `subscribeOfflineQueue()`. Always re-derive queue counts via `listQueuedMutations()`; don't hand-maintain a counter (drifts across tabs).
- Capacitor is still in live-server mode (unaffected by any of the above) — see the Capacitor section above.

## V1.0 Scope Constraint
Stripe, PDF generation (beyond chat attachments), Apple Health sync, and AI scheduling are explicitly out of scope. Do not introduce these.
Chat file attachments (images and PDF, max 10 MB) are in scope — see `POST /api/chat/upload` and `database/migrations/004_chat_attachments.sql`.

**Video calling and payments are live, despite earlier plans to exclude them (corrected Aug 2026 — the constraint above was stale).** Video/audio calling (meetings and ad-hoc 1:1/team calls) is fully implemented via Daily.co — `backend/src/services/meetings.service.js`, DB tables `meetings`/`meeting_attendees`/`call_sessions`, routes in `backend/src/routes/meetings.routes.js`, client-side `DailyIframe` usage in both `apps/next` and `frontend`. Payments are live via **Paystack, not Stripe** — `backend/src/services/paystack.service.js` and `fee.service.js` handle fee invoicing, checkout redirect, and webhook-verified confirmation; the secret key is stored per-academy in `academies.paystack_secret_key` (migration `018_academy_paystack_key.sql`). Stripe remains genuinely unused — don't introduce it without discussion, since Paystack is the actual payment processor in production.
