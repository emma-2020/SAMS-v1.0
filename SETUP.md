# SAMS v1.0 — Setup Guide

## Prerequisites
- Node.js 18 or higher → https://nodejs.org
- A free Supabase account → https://supabase.com
- A terminal (Command Prompt / PowerShell on Windows, Terminal on Mac)

---

## Step 1 — Create Supabase Project
1. Go to https://supabase.com and sign up free
2. Click **New project**, give it a name, set a database password
3. Wait ~1 minute for it to provision

## Step 2 — Run Database Migrations
1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **+ New query**
3. Open `database/migrations/002_v1_schema.sql` in a text editor on your computer
4. Select all (Ctrl+A), copy, paste into Supabase SQL Editor, click **Run**
5. You should see: `Success. No rows returned.`
6. Click **+ New query** again for a fresh editor
7. Open `database/migrations/003_security_fixes_and_workouts.sql`, copy all, paste, Run
8. Optional: repeat with `database/seeds/001_dev_seed.sql` for sample data

## Step 3 — Get Your Supabase Keys
In Supabase → Settings → API, copy these four values:
- Project URL: `https://your-project-ref.supabase.co`

- anon public key: `<your-anon-public-key>`

- service_role key: `<your-service-role-key>`

- JWT Secret: `<your-jwt-secret>`

## Step 4 — Configure Backend
```bash
cd backend
cp .env.example .env
```
Open `backend/.env` in a text editor and fill in:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Step 5 — Configure Frontend
```bash
cd frontend
cp .env.example .env
```
Open `frontend/.env` in a text editor and set:
```
REACT_APP_API_BASE_URL=http://localhost:4000/api
```

## Step 6 — Install & Run
Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
# Should print: [SAMS] Server running on port 4000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm start
# Browser opens to http://localhost:3000
```

## Step 7 — Create First Academy & Admin User
First, insert an academy row in Supabase SQL Editor:
```sql
INSERT INTO academies (name) VALUES ('My Academy');
SELECT id FROM academies LIMIT 1;
```
Copy the UUID. Then send a POST request to create an admin user:
```
POST http://localhost:4000/api/auth/signup
Content-Type: application/json

{
  "email": "admin@myacademy.com",
  "password": "SecurePassword123!",
  "role": "Admin",
  "first_name": "Your",
  "last_name": "Name",
  "academy_id": "paste-uuid-here"
}
```
Use a tool like Postman or https://hoppscotch.io

## Step 8 — Log In
Open http://localhost:3000, enter your email, password, and academy UUID.

---

## Project Structure
```
SAMS-v1.0/
├── README.md               ← Project overview
├── SETUP.md                ← This file
├── .gitignore
├── database/
│   ├── migrations/         ← Run these in Supabase SQL Editor
│   │   ├── 002_v1_schema.sql            (run first)
│   │   └── 003_security_fixes_and_workouts.sql (run second)
│   └── seeds/
│       └── 001_dev_seed.sql             (optional sample data)
├── backend/                ← Node.js / Express API
│   ├── .env.example        ← Copy to .env and fill in keys
│   ├── package.json
│   └── src/
│       ├── app.js          ← Express app entry point
│       ├── index.js        ← Server start
│       ├── config/         ← Supabase client, env loader
│       ├── middleware/     ← Auth, RBAC, validation, errors
│       ├── routes/         ← API route definitions
│       ├── controllers/    ← Request handlers
│       ├── services/       ← Business logic
│       └── utils/          ← Error classes, validators
└── frontend/               ← React.js SPA
    ├── .env.example        ← Copy to .env and fill in API URL
    ├── package.json
    └── src/
        ├── App.jsx         ← Root component
        ├── store/          ← Zustand auth state
        ├── router/         ← Routes + guards
        ├── services/       ← API call wrappers
        ├── hooks/          ← useApi, useSubmit
        ├── components/     ← Shared UI + layout shell
        ├── pages/          ← Dashboard pages per role
        └── styles/         ← Global CSS design system
```

## Common Errors
| Error | Fix |
|-------|-----|
| `Cannot find module 'express'` | Run `npm install` inside the `backend/` folder |
| `Missing required environment variables` | Check `backend/.env` exists and has all 4 Supabase keys |
| `relation "users" does not exist` | Re-run migration 002 in Supabase SQL Editor |
| `CORS error` in browser | Set `FRONTEND_URL=http://localhost:3000` in `backend/.env` |
| `Network Error` in browser | Make sure backend Terminal 1 is still running |
| `port 4000 already in use` | Change `PORT=4001` in `backend/.env` and `REACT_APP_API_BASE_URL=http://localhost:4001/api` in `frontend/.env` |
