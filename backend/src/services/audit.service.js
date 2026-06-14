'use strict';

/**
 * AuditService
 * ------------
 * Fire-and-forget audit log writer. Never throws — a logging failure
 * must never break the request that triggered it.
 *
 * Events are INSERT-only into audit_logs. The table has no UPDATE/DELETE
 * RLS policies so rows are effectively immutable after creation.
 */

const { supabaseAdmin } = require('../config/supabase');

/**
 * @param {object} entry
 * @param {string}  entry.event        - dot-namespaced event name e.g. 'auth.login'
 * @param {string}  [entry.academy_id]
 * @param {string}  [entry.actor_id]
 * @param {string}  [entry.actor_email]
 * @param {string}  [entry.actor_role]
 * @param {string}  [entry.resource]   - table / resource name
 * @param {string}  [entry.resource_id]
 * @param {object}  [entry.meta]       - arbitrary extra context
 * @param {string}  [entry.ip_address]
 */
function sanitizeIp(ip) {
  if (!ip) return null;
  // Strip IPv4-mapped IPv6 prefix (::ffff:x.x.x.x) — PostgreSQL inet accepts both
  // but Railway proxies sometimes emit formats that fail validation
  const stripped = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  // Basic sanity check — must look like an IP
  return /^[\d.:a-fA-F]+$/.test(stripped) ? stripped : null;
}

async function log(entry) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      event:       entry.event,
      academy_id:  entry.academy_id  ?? null,
      actor_id:    entry.actor_id    ?? null,
      actor_email: entry.actor_email ?? null,
      actor_role:  entry.actor_role  ?? null,
      resource:    entry.resource    ?? null,
      resource_id: entry.resource_id ?? null,
      meta:        entry.meta        ?? {},
      ip_address:  sanitizeIp(entry.ip_address),
    });
    if (error) console.error('[AuditService] write failed:', error.message);
  } catch (err) {
    console.error('[AuditService] write failed:', err?.message);
  }
}

// ── Convenience wrappers ────────────────────────────────────────

function authLogin({ academy_id, actor_id, actor_email, actor_role, ip }) {
  return log({ event: 'auth.login', academy_id, actor_id, actor_email, actor_role, resource: 'users', resource_id: actor_id, ip_address: ip });
}

function authLoginFailed({ email, academy_id, ip, reason }) {
  return log({ event: 'auth.login_failed', academy_id, actor_email: email, meta: { reason }, ip_address: ip });
}

function authLogout({ academy_id, actor_id, actor_email, ip }) {
  return log({ event: 'auth.logout', academy_id, actor_id, actor_email, resource: 'users', resource_id: actor_id, ip_address: ip });
}

function authPasswordChanged({ academy_id, actor_id, actor_email, ip }) {
  return log({ event: 'auth.password_changed', academy_id, actor_id, actor_email, ip_address: ip });
}

function adminAction({ event, academy_id, actor_id, actor_email, actor_role, resource, resource_id, meta, ip }) {
  return log({ event, academy_id, actor_id, actor_email, actor_role, resource, resource_id, meta, ip_address: ip });
}

module.exports = { log, authLogin, authLoginFailed, authLogout, authPasswordChanged, adminAction };
