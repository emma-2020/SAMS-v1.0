// src/middleware/validate.js
'use strict';

/**
 * Request Validation Middleware
 * ─────────────────────────────
 * Lightweight schema-style validators for each domain.
 * Each exported function is an Express middleware that throws
 * BadRequestError with a structured error list on failure.
 *
 * No external validation library — keeps the dependency surface small
 * and keeps every rule explicit and auditable.
 */

const { BadRequestError } = require('../utils/errors');

// ─── Generic helper ───────────────────────────────────────────────

/**
 * Runs a list of field-check functions against req.body / req.params.
 * Collects ALL errors before throwing so the client sees everything at once.
 */
function runChecks(checks) {
  return (req, res, next) => {
    const errors = [];
    for (const check of checks) {
      const result = check(req);
      if (result) errors.push(result);
    }
    if (errors.length > 0) {
      return next(new BadRequestError(errors.join(' | ')));
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────
// SCHEDULE
// ─────────────────────────────────────────────────────────────────

const validateScheduleQuery = runChecks([
  ({ query }) => {
    if (query.start && isNaN(Date.parse(query.start))) {
      return 'Query param "start" must be a valid ISO 8601 date.';
    }
  },
  ({ query }) => {
    if (query.end && isNaN(Date.parse(query.end))) {
      return 'Query param "end" must be a valid ISO 8601 date.';
    }
  },
  ({ query }) => {
    if (query.type && !['Practice', 'Game'].includes(query.type)) {
      return 'Query param "type" must be "Practice" or "Game".';
    }
  },
]);

// ─────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['Present', 'Absent', 'Injured'];

const validateAttendanceBody = runChecks([
  ({ body }) => {
    if (!body.event_id || typeof body.event_id !== 'string') {
      return '"event_id" (UUID string) is required.';
    }
  },
  ({ body }) => {
    if (!Array.isArray(body.records) || body.records.length === 0) {
      return '"records" must be a non-empty array of { player_id, status } objects.';
    }
  },
  ({ body }) => {
    if (!Array.isArray(body.records)) return;
    for (const [i, rec] of body.records.entries()) {
      if (!rec.player_id || typeof rec.player_id !== 'string') {
        return `records[${i}].player_id is required.`;
      }
      if (!VALID_STATUSES.includes(rec.status)) {
        return `records[${i}].status must be one of: ${VALID_STATUSES.join(', ')}.`;
      }
    }
  },
]);

const validateAttendanceQuery = runChecks([
  ({ query }) => {
    if (!query.event_id || typeof query.event_id !== 'string') {
      return 'Query param "event_id" (UUID) is required.';
    }
  },
]);

// ─────────────────────────────────────────────────────────────────
// HEALTH LOG
// ─────────────────────────────────────────────────────────────────

const HEALTH_FIELDS = ['fatigue', 'soreness', 'sleep_quality'];

const validateHealthBody = runChecks([
  ({ body }) => {
    for (const field of HEALTH_FIELDS) {
      const val = body[field];
      if (val === undefined || val === null) {
        return `"${field}" is required.`;
      }
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 5) {
        return `"${field}" must be an integer between 1 and 5. Received: ${val}`;
      }
    }
  },
]);

// ─────────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 2000;

const validateChatQuery = runChecks([
  ({ query }) => {
    if (!query.team_id || typeof query.team_id !== 'string') {
      return 'Query param "team_id" (UUID) is required.';
    }
  },
  ({ query }) => {
    if (query.limit) {
      const n = Number(query.limit);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return 'Query param "limit" must be an integer between 1 and 100.';
      }
    }
  },
]);

const validateChatBody = runChecks([
  ({ body }) => {
    if (!body.team_id || typeof body.team_id !== 'string') {
      return '"team_id" (UUID string) is required.';
    }
  },
  ({ body }) => {
    const hasText       = body.message_text && typeof body.message_text === 'string' && body.message_text.trim().length > 0;
    const hasAttachment = body.attachment_url && typeof body.attachment_url === 'string';
    if (!hasText && !hasAttachment) {
      return 'Message must include "message_text", "attachment_url", or both.';
    }
    if (body.message_text && body.message_text.length > MAX_MESSAGE_LENGTH) {
      return `"message_text" cannot exceed ${MAX_MESSAGE_LENGTH} characters.`;
    }
  },
]);

// ─────────────────────────────────────────────────────────────────
// ADMIN INVITE
// ─────────────────────────────────────────────────────────────────

const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITABLE_ROLES = ['Coach', 'Player', 'Parent'];

const validateInviteBody = runChecks([
  ({ body }) => {
    if (!body.email || !EMAIL_RE.test(body.email.trim())) {
      return '"email" must be a valid email address.';
    }
  },
  ({ body }) => {
    if (!INVITABLE_ROLES.includes(body.role)) {
      return `"role" must be one of: ${INVITABLE_ROLES.join(', ')} (Admins cannot be invited).`;
    }
  },
  ({ body }) => {
    if (!body.first_name || body.first_name.trim().length < 1) {
      return '"first_name" is required.';
    }
  },
  ({ body }) => {
    if (!body.last_name || body.last_name.trim().length < 1) {
      return '"last_name" is required.';
    }
  },
]);



// ─────────────────────────────────────────────────────────────────
// CREATE EVENT (F-03 addition)
// ─────────────────────────────────────────────────────────────────

const validateCreateEventBody = runChecks([
  ({ body }) => {
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 1) {
      return '"title" is required.';
    }
  },
  ({ body }) => {
    if (!['Practice', 'Game'].includes(body.type)) {
      return '"type" must be "Practice" or "Game".';
    }
  },
  ({ body }) => {
    if (!body.team_id || typeof body.team_id !== 'string') {
      return '"team_id" (UUID) is required.';
    }
  },
  ({ body }) => {
    if (!body.start_time || isNaN(Date.parse(body.start_time))) {
      return '"start_time" must be a valid ISO 8601 datetime.';
    }
  },
  ({ body }) => {
    if (!body.end_time || isNaN(Date.parse(body.end_time))) {
      return '"end_time" must be a valid ISO 8601 datetime.';
    }
  },
  ({ body }) => {
    if (body.start_time && body.end_time &&
        new Date(body.end_time) <= new Date(body.start_time)) {
      return '"end_time" must be after "start_time".';
    }
  },
]);

const validateUpdateEventBody = runChecks([
  ({ body }) => {
    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length < 1)) {
      return '"title" must be a non-empty string.';
    }
  },
  ({ body }) => {
    if (body.type !== undefined && !['Practice', 'Game'].includes(body.type)) {
      return '"type" must be "Practice" or "Game".';
    }
  },
  ({ body }) => {
    if (body.start_time !== undefined && isNaN(Date.parse(body.start_time))) {
      return '"start_time" must be a valid ISO 8601 datetime.';
    }
  },
  ({ body }) => {
    if (body.end_time !== undefined && isNaN(Date.parse(body.end_time))) {
      return '"end_time" must be a valid ISO 8601 datetime.';
    }
  },
  ({ body }) => {
    if (body.start_time && body.end_time && new Date(body.end_time) <= new Date(body.start_time)) {
      return '"end_time" must be after "start_time".';
    }
  },
]);

const validateMemberStatusBody = runChecks([
  ({ body }) => {
    if (typeof body.is_active !== 'boolean') {
      return '"is_active" must be a boolean (true or false).';
    }
  },
]);

module.exports = {
  validateScheduleQuery,
  validateCreateEventBody,
  validateUpdateEventBody,
  validateAttendanceBody,
  validateAttendanceQuery,
  validateHealthBody,
  validateChatQuery,
  validateChatBody,
  validateInviteBody,
  validateMemberStatusBody,
};
