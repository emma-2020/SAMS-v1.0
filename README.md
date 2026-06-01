# Sports Academy Management System (SAMS)
## Version 1.0 — Base Model MVP

**Stack:** Supabase · Node.js (Express) · React.js  
**Document Version:** v1.0-MVP  
**Date:** May 2026

---

## Project Structure

```
sams/
├── docs/                        # Architecture diagrams, ADRs, API contracts
├── database/                    # Supabase migrations & seed data
│   ├── migrations/
│   └── seeds/
├── backend/                     # Node.js / Express API server
│   └── src/
│       ├── config/              # DB client, env, constants
│       ├── middleware/          # auth, tenancy guard, RBAC
│       ├── routes/              # Express routers by domain
│       ├── controllers/         # Request handlers
│       ├── services/            # Business logic layer
│       └── utils/               # Helpers, validators
└── frontend/                    # React.js SPA
    └── src/
        ├── components/          # Reusable UI — split by role
        │   ├── shared/
        │   ├── player/
        │   ├── coach/
        │   ├── parent/
        │   └── admin/
        ├── pages/               # Route-level pages per role
        ├── hooks/               # Custom React hooks
        ├── context/             # Auth + Tenant context providers
        ├── services/            # Axios API wrappers
        └── styles/              # Global CSS / Tailwind config
```

---

## Architectural Mandates (Non-Negotiable)

| # | Rule | Enforcement Point |
|---|------|-------------------|
| 1 | Every operational table carries `academy_id` FK | DB schema + `tenancyGuard` middleware |
| 2 | No query may cross tenant boundaries | RLS policies in Supabase + service layer checks |
| 3 | Users map to exactly one role | `user_roles` table + `requireRole()` middleware |
| 4 | V1.0 scope only — no Stripe, no video, no file uploads | `SCOPE_GATES.md` + PR checklist |

---

## Four User Roles

| Role | Primary Workspace |
|------|------------------|
| **Player** | Schedule view, workout checklists, health check-ins, team chat |
| **Coach** | Roster management, attendance logs, session blueprints, team chat |
| **Parent** | Mirrored child schedule, health flag alerts, coach direct chat |
| **Admin** | Invite provisioner, resource/field calendar allocator |

---

## Quick Start

### 1. Environment Setup
```bash
# Backend
cd backend && cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET

# Frontend
cd frontend && cp .env.example .env
# Fill in REACT_APP_SUPABASE_URL, REACT_APP_API_BASE_URL
```

### 2. Database
```bash
# Apply migrations against your Supabase project
cd database && supabase db push
```

### 3. Backend
```bash
cd backend && npm install && npm run dev
# Runs on http://localhost:4000
```

### 4. Frontend
```bash
cd frontend && npm install && npm start
# Runs on http://localhost:3000
```

---

## V1.0 Feature Scope

### ✅ In Scope
- Multi-tenant schema isolation (academy_id on every table)
- Email/password auth via Supabase Auth
- Static calendar/schedule views
- Manual workout checkbox completion logs
- Attendance tap-lists (Present / Absent / Injured)
- 3-metric health sliders (Fatigue 1-5, Soreness 1-5, Sleep 1-5)
- Text-only team group chat (per team division)
- Parent–coach direct text chat
- Basic roster & profile management
- Session blueprint (practice plan) creator
- Admin invite provisioner
- Resource/field conflict calendar

### ❌ Out of Scope (V2+ only)
- Stripe / payment gateway
- PDF report builders
- Electronic waiver / document uploads
- Video scrubbing tools
- Apple Health / wearable sync
- AI schedule optimization
