interface QueueableRule {
  method: 'post' | 'put' | 'patch' | 'delete';
  test: (url: string) => boolean;
}

// Deliberately small allowlist. Only actions with safe, well-understood
// replay semantics get queued when offline:
//  - chat sends are append-only (no conflicts) and de-duplicated server-side
//    via client_message_id (see database/migrations/022_...).
//  - attendance logging is a full-roster upsert keyed on (event_id,
//    player_id) — already idempotent, safe to resend unchanged.
// Everything else (fees/payments, admin actions, deletes, invitations, ...)
// intentionally fails immediately when offline, same as before this feature.
const QUEUEABLE_MUTATIONS: QueueableRule[] = [
  { method: 'post', test: (url) => url === '/chat' },
  { method: 'post', test: (url) => url === '/attendance' },
];

export function isQueueableMutation(method: string | undefined, url: string | undefined): boolean {
  if (!method || !url) return false;
  const m = method.toLowerCase();
  return QUEUEABLE_MUTATIONS.some((r) => r.method === m && r.test(url));
}

// Explicit allowlist for the read-side cache too, matching the write side's
// discipline — caching every GET in the app (platform-admin stats, the live
// fee ledger, ...) and silently serving it back as if fresh would go well
// beyond what this feature is meant to cover. The live fee/payment ledger
// (fees.ts / feesApi) is deliberately NEVER added here — a stale balance
// displayed as current is a real-money risk, unlike the domains below which
// are read-heavy reference/reporting data.
const CACHEABLE_GETS: Array<(url: string) => boolean> = [
  (url) => url.startsWith('/chat?'),
  (url) => url.startsWith('/attendance?'),
  (url) => url.startsWith('/schedule'),
  (url) => url.startsWith('/announcements'),
  (url) => url === '/teams' || url.startsWith('/teams?') || url.startsWith('/teams/'),
  (url) => url.startsWith('/documents'),
  (url) => url.startsWith('/health'),
  (url) => url.startsWith('/workouts'),
  (url) => url.startsWith('/notifications'),
  (url) => url.startsWith('/analytics'),
  // Chat *messages* were already cached, but the channel LIST wasn't — that
  // meant offline users couldn't even reach a conversation to see its
  // already-cached messages, since the screen that lists channels failed
  // first. Roster/meetings follow the same read-only reference-data logic
  // as schedule/teams above.
  (url) => url.startsWith('/chat/channels'),
  (url) => url.startsWith('/coach/players'),
  (url) => url.startsWith('/admin/roster'),
  (url) => url.startsWith('/meetings'),
];

export function isCacheableGet(url: string | undefined): boolean {
  if (!url) return false;
  return CACHEABLE_GETS.some((test) => test(url));
}
