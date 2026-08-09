// src/config/sentry.js
'use strict';

const env = require('./env');

let captureException = () => {};
let captureMessage    = () => {};

if (env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
  });
  captureException = (err, context) => Sentry.captureException(err, context && { extra: context });
  captureMessage    = (msg, context) => Sentry.captureMessage(msg, context && { extra: context });
  console.log('[Sentry] initialized');
}
// No SENTRY_DSN set (e.g. local dev, or not yet configured in this environment):
// captureException/captureMessage stay as no-ops so callers never need to branch on
// whether monitoring is active.

module.exports = { captureException, captureMessage };
