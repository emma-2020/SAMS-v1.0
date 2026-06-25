// src/index.js
'use strict';

const app = require('./app');
const env = require('./config/env');
const { supabaseAdmin } = require('./config/supabase');
const { sendFeeReminderEmails } = require('./services/fee.service');

const server = app.listen(env.PORT, () => {
  console.log(`[SAMS] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  _scheduleDailyFeeReminders();
});

// Runs once per day: sends fee reminder emails to all academies
function _scheduleDailyFeeReminders() {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  async function runReminders() {
    try {
      const { data: academies } = await supabaseAdmin.from('academies').select('id');
      for (const { id } of academies || []) {
        const result = await sendFeeReminderEmails({ academyId: id });
        if (result.sent > 0) {
          console.log(`[reminders] academy=${id} — ${result.sent} fee reminder(s) dispatched`);
        }
      }
    } catch (err) {
      console.error('[reminders] daily fee reminder run failed:', err.message);
    }
  }

  // Run at next 8:00 AM local time, then every 24 h
  const now        = new Date();
  const next8am    = new Date(now);
  next8am.setHours(8, 0, 0, 0);
  if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
  const msUntil8am = next8am - now;

  setTimeout(() => {
    runReminders();
    setInterval(runReminders, MS_PER_DAY);
  }, msUntil8am);

  console.log(`[reminders] daily fee reminders scheduled — first run at ${next8am.toISOString()}`);
}

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
