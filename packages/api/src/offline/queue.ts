import { getDb, QUEUE_STORE } from './storage';
import { reportNetworkOutcome } from './network';

export interface QueuedMutation {
  id?: number;
  method: 'post' | 'put' | 'patch' | 'delete';
  url: string;
  data: Record<string, unknown>;
  createdAt: number;
}

export type QueueEvent =
  | { type: 'enqueued'; item: QueuedMutation }
  | { type: 'sent'; item: QueuedMutation; response: unknown }
  // `permanent: true` means the item was rejected for a real (non-network)
  // reason and has been dropped from the queue — the caller should show an
  // error. `permanent: false` means we're still offline; the item stays
  // queued and the rest of the queue is left untouched for the next attempt.
  | { type: 'flush-failed'; item: QueuedMutation; permanent: boolean };

// Thrown by the `sender` passed to flushOfflineQueue to mark a failure as a
// genuine (non-network) rejection, so the failing item can be dropped and
// the rest of the queue isn't blocked behind it.
export class PermanentQueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentQueueError';
  }
}

type Listener = (event: QueueEvent) => void;
const listeners = new Set<Listener>();

function emit(event: QueueEvent): void {
  listeners.forEach((l) => l(event));
}

export function subscribeOfflineQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function enqueueMutation(entry: Omit<QueuedMutation, 'id' | 'createdAt'>): Promise<number> {
  const db = await getDb();
  if (!db) {
    // No IndexedDB in this environment (very old browser) — nothing to
    // persist. Surface as a normal network failure rather than silently
    // dropping the user's action.
    throw new Error('Offline queue is unavailable in this browser.');
  }
  const item: QueuedMutation = { ...entry, createdAt: Date.now() };
  const id = await db.add(QUEUE_STORE, item as QueuedMutation);
  const stored: QueuedMutation = { ...item, id: id as number };
  emit({ type: 'enqueued', item: stored });
  return id as number;
}

export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAll(QUEUE_STORE);
}

async function removeQueuedMutation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(QUEUE_STORE, id);
}

let flushing = false;

// Replays queued mutations oldest-first. A network failure (still offline)
// stops this pass so order is preserved and everything retries together
// next time. A PermanentQueueError (a real, non-network rejection) drops
// just that one item and moves on — one bad item shouldn't block every
// other queued chat/attendance action behind it indefinitely.
export async function flushOfflineQueue(sender: (item: QueuedMutation) => Promise<unknown>): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const items = (await listQueuedMutations()).sort((a, b) => a.createdAt - b.createdAt);
    for (const item of items) {
      try {
        const response = await sender(item);
        reportNetworkOutcome(true);
        await removeQueuedMutation(item.id!);
        emit({ type: 'sent', item, response });
      } catch (err) {
        if (err instanceof PermanentQueueError) {
          await removeQueuedMutation(item.id!);
          emit({ type: 'flush-failed', item, permanent: true });
          continue;
        }
        emit({ type: 'flush-failed', item, permanent: false });
        break;
      }
    }
  } finally {
    flushing = false;
  }
}
