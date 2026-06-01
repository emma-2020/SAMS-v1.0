# Backend — SAMS v1.0 (Node.js / Express)

## Stack
- Runtime: Node.js 18+
- Framework: Express 4
- Database client: @supabase/supabase-js
- Auth: Supabase Auth (JWT)
- Testing: Jest + Supertest

## Quick start
```bash
npm install
cp .env.example .env    # fill in your Supabase keys
npm run dev             # starts on http://localhost:4000
npm test                # run unit tests
```

## API Endpoints

| Route | Method | Roles | Description |
|-------|--------|-------|-------------|
| `/api/auth/signup` | POST | Public | Create account |
| `/api/auth/login` | POST | Public | Login, returns JWT |
| `/api/auth/logout` | POST | Any | Revoke session |
| `/api/auth/me` | GET | Any | Get current profile |
| `/api/auth/refresh` | POST | Public | Refresh token |
| `/api/schedule` | GET | All 4 | Get events (role-scoped) |
| `/api/schedule` | POST | Admin, Coach | Create event |
| `/api/attendance` | GET | Admin, Coach | Get roster + status |
| `/api/attendance` | POST | Admin, Coach | Log attendance |
| `/api/health` | POST | Player | Submit daily log |
| `/api/health` | GET | All 4 | Get health logs |
| `/api/health/alerts` | GET | Admin, Coach, Parent | Get flagged logs |
| `/api/chat` | GET | All 4 | Get messages |
| `/api/chat` | POST | All 4 | Send message |
| `/api/workouts` | GET | All 4 | Get assignments |
| `/api/workouts` | POST | Admin, Coach | Create assignment |
| `/api/workouts/complete` | POST | Player | Toggle checkbox |
| `/api/admin/invite` | POST | Admin | Send invitation |
| `/api/admin/invite` | GET | Admin | List invitations |
| `/api/admin/invite/:id` | DELETE | Admin | Revoke invitation |

## Middleware chain
Every protected route runs: `authenticate → extractTenant → requireRole`
