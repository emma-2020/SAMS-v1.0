import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME    = 'sams-offline';
const DB_VERSION = 1;

export const CACHE_STORE = 'cache';
export const QUEUE_STORE = 'queue';

let dbPromise: Promise<IDBPDatabase> | null = null;

// Capacitor ships the web app inside a real WebView (see CLAUDE.md — "no
// native-only runtime"), so IndexedDB is available identically on web and
// on the mobile shell. No separate native storage backend is needed.
function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function getDb(): Promise<IDBPDatabase> | null {
  if (!hasIndexedDb()) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
    // If opening fails (e.g. blocked in private browsing, quota error), don't
    // keep serving the same rejected promise forever — let the next caller
    // try again.
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

// Called on logout so a different account signing in on the same device
// never sees the previous account's cached reads or queued-but-unsent
// mutations.
export async function clearAllOfflineStores(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await Promise.all([
    db.clear(CACHE_STORE),
    db.clear(QUEUE_STORE),
  ]);
}
