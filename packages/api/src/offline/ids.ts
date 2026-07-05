// Generates a client-side correlation id for a queueable mutation (e.g. a
// chat message's client_message_id) — must be a valid UUID since it's stored
// in a Postgres UUID column. `crypto.randomUUID` needs a secure context and
// isn't present on every runtime this app targets (older WebViews), so this
// falls back to a format-compatible (not cryptographically strong) UUIDv4;
// a collision only risks a harmless dedup false-positive, not a security
// boundary, so the fallback's weaker randomness is an acceptable trade-off.
export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
