// src/app.js
'use strict';

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const env              = require('./config/env');
const authRoutes       = require('./routes/auth.routes');
const scheduleRoutes   = require('./routes/schedule.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const healthRoutes     = require('./routes/health.routes');
const chatRoutes       = require('./routes/chat.routes');
const adminRoutes      = require('./routes/admin.routes');
const teamsRoutes             = require('./routes/teams.routes');
const workoutRoutes           = require('./routes/workout.routes');
const coachRoutes             = require('./routes/coach.routes');
const notificationsRoutes     = require('./routes/notifications.routes');
const platformRoutes          = require('./routes/platform.routes');
const publicRoutes            = require('./routes/public.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

// Production: whitelist both the web app subdomain and the marketing root.
// Development: allow all local dev ports in addition to the configured URLs.
const allowedOrigins = env.NODE_ENV === 'production'
  ? [env.FRONTEND_URL, env.MARKETING_URL].filter(Boolean)
  : [...new Set([env.FRONTEND_URL, env.MARKETING_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8081'])];

app.use(cors({
  origin:         allowedOrigins,
  methods:        ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, error: 'Too many requests. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 120,
  message: { success: false, error: 'Rate limit exceeded.' },
  standardHeaders: true, legacyHeaders: false,
});

app.get('/healthz', (req, res) =>
  res.status(200).json({ status: 'ok', version: '1.0.0' })
);

app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/schedule',   apiLimiter,  scheduleRoutes);
app.use('/api/attendance', apiLimiter,  attendanceRoutes);
app.use('/api/health',     apiLimiter,  healthRoutes);
app.use('/api/chat',       apiLimiter,  chatRoutes);
app.use('/api/admin',      apiLimiter,  adminRoutes);
app.use('/api/teams',         apiLimiter,  teamsRoutes);
app.use('/api/workouts',      apiLimiter,  workoutRoutes);
app.use('/api/coach',         apiLimiter,  coachRoutes);
app.use('/api/notifications', apiLimiter,  notificationsRoutes);
app.use('/api/platform',     apiLimiter,  platformRoutes);
app.use('/api/public',                    publicRoutes);   // has its own per-route limiter

app.use(notFound);
app.use(errorHandler);

module.exports = app;
