'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { isOffline, onNetworkChange, subscribeOfflineQueue, listQueuedMutations } from '@sams/api';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(() => isOffline());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refreshPendingCount = () => {
      listQueuedMutations().then(items => {
        if (!cancelled) setPendingCount(items.length);
      }).catch(() => {});
    };

    // Initial pending count.
    refreshPendingCount();

    // Keep `offline` in sync with connectivity transitions.
    const unsubNetwork = onNetworkChange(online => setOffline(!online));

    // Re-derive the true pending count from the queue on every lifecycle
    // event, rather than hand-maintaining a +1/-1 counter — the counter
    // would drift across browser tabs since each tab has its own
    // in-memory listener set.
    const unsubQueue = subscribeOfflineQueue(() => refreshPendingCount());

    return () => {
      cancelled = true;
      unsubNetwork();
      unsubQueue();
    };
  }, []);

  if (!offline && pendingCount === 0) return null;

  const label = offline
    ? pendingCount > 0 ? `Offline · ${pendingCount} syncing` : 'Offline'
    : `Syncing ${pendingCount}…`;

  const title = offline
    ? "You're offline — chat and attendance changes will send automatically when you're back online"
    : `Finishing sending ${pendingCount} offline change(s)`;

  return (
    <span
      className="badge badge-warning"
      title={title}
      style={{ height: 38, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center' }}
    >
      <WifiOff size={13} />
      {label}
    </span>
  );
}
