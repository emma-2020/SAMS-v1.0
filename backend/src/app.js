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
const workoutRoutes    = require('./routes/workout.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

app.use(cors({
  origin:         env.FRONTEND_URL,
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
app.use('/api/workouts',   apiLimiter,  workoutRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
