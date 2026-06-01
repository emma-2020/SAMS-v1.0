// src/index.js
'use strict';

const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`[SAMS] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SAMS] SIGTERM received — shutting down gracefully.');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[SAMS] SIGINT received — shutting down gracefully.');
  server.close(() => process.exit(0));
});

module.exports = server;
