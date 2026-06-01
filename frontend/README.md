# Frontend — SAMS v1.0 (React.js)

## Stack
- Framework: React 18 (Create React App)
- State: Zustand (auth store)
- Routing: React Router v6
- HTTP: Axios
- Styling: Pure CSS with CSS custom properties

## Quick start
```bash
npm install
cp .env.example .env    # set REACT_APP_API_BASE_URL
npm start               # opens http://localhost:3000
npm test                # run tests
npm run build           # production build → build/ folder
```

## Role-based routing

| Role | Default path | Access |
|------|-------------|--------|
| Admin | `/dashboard/admin` | Invitations, resource calendar |
| Coach | `/dashboard/coach` | Roster, attendance, event creation |
| Player | `/dashboard/player` | Schedule, workouts, health check-in |
| Parent | `/dashboard/parent` | Child schedule, health alerts |
| Any | `/dashboard/*/chat` | Team chat |

## Auth flow
1. User hits any protected route → `ProtectedRoute` checks `isAuthenticated`
2. Not authenticated → redirected to `/login` with `from` state preserved
3. Login succeeds → Zustand store saves session + profile to localStorage
4. Page reload → `AuthProvider` validates token via `GET /api/auth/me`
5. Token expired → auto-refresh attempted → if fails, logout
