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

// Trust Railway's reverse proxy so req.ip returns the real client IP
app.set('trust proxy', 1);

// Redirect HTTP → HTTPS in production (Railway terminates TLS, so X-Forwarded-Proto is reliable)
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https://*.supabase.co', 'https://*.supabase.in'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Production: whitelist both the web app subdomain and the marketing root.
// Development: allow all local dev ports in addition to the configured URLs.
const allowedOrigins = env.NODE_ENV === 'production'
  ? [env.FRONTEND_URL, env.MARKETING_URL].filter(Boolean)
  : [...new Set([env.FRONTEND_URL, env.MARKETING_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8081', 'http://localhost:19006'])];

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

// Login: 5 attempts per 15 min per IP (per-account lockout is in auth.service.js)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { success: false, error: 'Too many login attempts from this IP. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// Platform admin login: 5 attempts per 15 min per IP — controls all academies so stricter than user login
const platformLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { success: false, error: 'Too many platform login attempts from this IP. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// Other auth endpoints (signup, refresh, invite): 15 per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 15,
  message: { success: false, error: 'Too many requests. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// General API: 120 per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 120,
  message: { success: false, error: 'Rate limit exceeded.' },
  standardHeaders: true, legacyHeaders: false,
});

app.get('/healthz', (req, res) =>
  res.status(200).json({ status: 'ok', version: '1.0.0' })
);

// Apply stricter loginLimiter to /api/auth/login before the general authLimiter
app.post('/api/auth/login',     loginLimiter);
// Platform admin login gets its own strict limiter — must be registered before apiLimiter
app.post('/api/platform/login', platformLoginLimiter);
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/schedule',   apiLimiter,  scheduleRoutes);
app.use('/api/attendance', apiLimiter,  attendanceRoutes);
app.use('/api/health',     apiLimiter,  healthRoutes);
app.use('/api/chat',       apiLimiter,  chatRoutes);
app.use('/api/admin',      apiLimiter,  adminRoutes);
app.use('/api/teams',         apiLimiter,  teamsRoutes);
app.use('/api/workouts',      apiLimiter,  workoutRoutes);
app.use('/api/coach',         apiLimiter,  coachRoutes);
app.use('/api/notifications', apiLimiter,  notificationsRoutes);
app.use('/api/platform',      apiLimiter,  platformRoutes);
app.use('/api/public',                     publicRoutes);  // has its own per-route limiter

app.use(notFound);
app.use(errorHandler);

module.exports = app;
